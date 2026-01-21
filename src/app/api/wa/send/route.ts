// src/app/api/wa/send/route.ts
import { NextResponse } from 'next/server';
import { verifyAuthenticatedUser, AuthError } from '@/lib/server/auth-utils';
import { wahaFetch } from '@/lib/server/waha';
import { createAuditLog } from '@/lib/server/audit';
import { getAdminServices } from '@/lib/firebase/server-app';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Lead } from '@/lib/firestore/types';


export const runtime = 'nodejs';

/**
 * POST /api/wa/send
 * Proxies a request to send a text message via WAHA and records the message.
 */
export async function POST(request: Request) {
    let userUid: string | undefined;
    try {
        const user = await verifyAuthenticatedUser(request, ['SUPER_ADMIN', 'HEAD_SALES', 'SALES']);
        userUid = user.id;

        const body = await request.json();
        const { leadId, text } = body;

        if (!leadId || !text) {
            return NextResponse.json({ error: 'leadId and text are required.' }, { status: 400 });
        }

        const { firestore: db } = getAdminServices();
        const leadRef = db.collection('leads').doc(leadId);
        const leadDoc = await leadRef.get();

        if (!leadDoc.exists) {
            throw new Error('Lead not found.');
        }

        const leadData = leadDoc.data() as Lead;
        const { wahaSession, chatId, ownerUid, teamId } = leadData;
        
        // --- Permission Check ---
        if (user.role === 'SALES' && ownerUid !== user.id) {
             throw new AuthError(`Forbidden: Sales users can only send messages for their own leads.`, 403);
        }
        if (user.role === 'HEAD_SALES' && teamId !== user.teamId) {
             throw new AuthError(`Forbidden: Head Sales users can only send messages for leads within their team.`, 403);
        }
        // SUPER_ADMIN has implicit access

        await createAuditLog({
            action: 'SEND_WA_ATTEMPT',
            byUid: user.id,
            result: 'SUCCESS', // Log the attempt, not the final result from WAHA
            message: `Attempting to send message to ${chatId} via session ${wahaSession}.`
        });

        const wahaResponse = await wahaFetch('/api/sendText', {
            method: 'POST',
            body: JSON.stringify({
                session: wahaSession,
                chatId: chatId,
                text: text,
            }),
        });
        
        const responseData = await wahaResponse.json();

        if (!wahaResponse.ok) {
             await createAuditLog({
                action: 'SEND_WA_FAIL',
                byUid: user.id,
                result: 'FAILURE',
                message: `WAHA send failed for ${chatId}. Status: ${wahaResponse.status}. Response: ${JSON.stringify(responseData)}`
            });
            // Still save the failed message to Firestore for history
            const batch = db.batch();
            const messageRef = leadRef.collection('messages').doc();
            batch.set(messageRef, {
                direction: 'out',
                text: text,
                timestamp: Timestamp.now(),
                actorUid: user.id,
                session: wahaSession,
                status: 'failed',
                raw: responseData,
            });
            await batch.commit();
            return NextResponse.json({ ok: false, ...responseData }, { status: wahaResponse.status });
        }

        // --- Save to Firestore on Success ---
        const batch = db.batch();
        const messageRef = leadRef.collection('messages').doc(responseData.id); // Use WAHA message ID if available
        batch.set(messageRef, {
            direction: 'out',
            text: text,
            timestamp: Timestamp.now(),
            actorUid: user.id,
            session: wahaSession,
            status: 'sent', // WAHA confirms sending, subsequent webhooks will update to delivered/read
            raw: responseData,
        });

        // Update parent lead document
        batch.update(leadRef, {
            lastMessageAt: FieldValue.serverTimestamp(),
            lastMessagePreview: text.substring(0, 100),
            // Outbound messages shouldn't affect unreadCount
        });

        await batch.commit();

        await createAuditLog({
            action: 'SEND_WA_SUCCESS',
            byUid: user.id,
            result: 'SUCCESS',
            message: `WAHA message sent successfully to ${chatId}.`
        });
        
        return NextResponse.json({ ok: true, ...responseData });

    } catch (error: any) {
        const message = error.message || 'An unknown error occurred.';
         if (userUid) {
            await createAuditLog({
                action: 'SEND_WA_FAIL',
                byUid: userUid,
                result: 'FAILURE',
                message: message
            });
        }
        if (error instanceof AuthError) {
            return NextResponse.json({ error: message }, { status: error.status });
        }
        console.error('[API /wa/send] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
