// src/app/api/wa/send/route.ts
import { NextResponse } from 'next/server';
import { verifyAuthenticatedUser, AuthError } from '@/lib/server/auth-utils';
import { wahaFetch } from '@/lib/server/waha';
import { createAuditLog } from '@/lib/server/audit';

export const runtime = 'nodejs';

/**
 * POST /api/wa/send
 * Proxies a request to send a text message via WAHA.
 */
export async function POST(request: Request) {
    let userUid: string | undefined;
    try {
        // Authenticate user and ensure they have a valid role
        const user = await verifyAuthenticatedUser(request, ['SUPER_ADMIN', 'HEAD_SALES', 'SALES']);
        userUid = user.id;

        const body = await request.json();
        const { session, chatId, text } = body;

        if (!session || !chatId || !text) {
            return NextResponse.json({ error: 'session, chatId, and text are required.' }, { status: 400 });
        }

        // Sales can only send from their own session
        if (user.role === 'SALES' && user.wahaSession !== session) {
             throw new AuthError(`Forbidden: Sales users can only send from their assigned session.`, 403);
        }
        
        await createAuditLog({
            action: 'SEND_WA_ATTEMPT',
            byUid: user.id,
            result: 'SUCCESS', // Log the attempt, not the final result from WAHA
            message: `Attempting to send message to ${chatId} via session ${session}.`
        });

        // Use wahaFetch to call the WAHA sendText endpoint
        const wahaResponse = await wahaFetch('/api/sendText', {
            method: 'POST',
            body: JSON.stringify({
                session: session,
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
            return NextResponse.json(responseData, { status: wahaResponse.status });
        }

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
