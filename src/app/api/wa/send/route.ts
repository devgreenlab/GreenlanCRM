// src/app/api/wa/send/route.ts
'use server';

import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { verifyAuthenticatedUser } from '@/lib/server/auth-utils';
import { getAdminFirestore } from '@/lib/server/firebase-admin';
import { createAuditLog } from '@/lib/server/audit';
import type { IntegrationSettings, Lead, UserProfile, Message } from '@/lib/firestore/types';
import { decrypt } from '@/lib/server/crypto';


async function getWahaConfig() {
    const db = getAdminFirestore();
    const settingsDoc = await db.collection('integrations').doc('settings').get();
    const settings = settingsDoc.data() as IntegrationSettings;
    if (!settings?.waha?.baseUrl) {
        throw new Error('WAHA Base URL not configured.');
    }

    const secretDoc = await db.collection('integrations_secrets').doc('waha').get();
    const encryptedApiKey = secretDoc.exists ? secretDoc.data()?.apiKey : null;
    if (!encryptedApiKey) {
        throw new Error('WAHA API Key not set.');
    }
    const apiKey = decrypt(encryptedApiKey);

    return { baseUrl: settings.waha.baseUrl, apiKey };
}

async function callWahaSendText(
    baseUrl: string,
    apiKey: string,
    payload: { session: string, chatId: string, text: string }
) {
    const { session, chatId, text } = payload;
    const sendUrl = `${baseUrl}/api/sessions/${session}/send-text`;

    const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
        },
        body: JSON.stringify({ chatId, text }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`WAHA API failed with status ${response.status}: ${errorBody}`);
    }

    return response.json();
}

export async function POST(request: Request) {
    let userProfile: UserProfile | null = null;
    let leadId: string | null = null;

    try {
        // 1. Verify user authentication and role
        userProfile = await verifyAuthenticatedUser(request, ['SUPER_ADMIN', 'HEAD_SALES', 'SALES']);
        const body = await request.json();
        const { message, leadId: reqLeadId } = body;
        leadId = reqLeadId;

        if (!message || !leadId) {
            return NextResponse.json({ error: 'Message and leadId are required.' }, { status: 400 });
        }

        // 2. Fetch Lead to get session and chatId
        const db = getAdminFirestore();
        const leadRef = db.collection('leads').doc(leadId);
        const leadDoc = await leadRef.get();
        if (!leadDoc.exists) {
            throw new Error('Lead not found.');
        }
        const lead = leadDoc.data() as Lead;
        
        // 3. Security check: ensure user is allowed to message this lead
        if (userProfile.role === 'SALES' && lead.ownerUid !== userProfile.id) {
            throw new Error('You do not have permission to message this lead.');
        }
        if (userProfile.role === 'HEAD_SALES' && lead.teamId !== userProfile.teamId) {
            throw new Error('This lead is not in your team.');
        }

        const session = lead.wahaSession;
        const chatId = lead.chatId;

        if (!session || !chatId) {
            throw new Error('Lead is missing required WhatsApp information (session or chatId).');
        }

        await createAuditLog({
            action: 'SEND_WA_ATTEMPT',
            byUid: userProfile.id,
            result: 'SUCCESS',
            message: `Attempting to send message to lead ${leadId}`
        });

        // 4. Get integration settings
        const { baseUrl, apiKey } = await getWahaConfig();

        // 5. Call WAHA API directly
        await callWahaSendText(baseUrl, apiKey, { session, chatId, text: message });

        // 6. Log activity and update lead on success
        const batch = db.batch();
        const messageRef = leadRef.collection('messages').doc();

        const messagePayload: Omit<Message, 'id'> = {
            direction: 'out',
            text: message,
            session: session,
            actorUid: userProfile.id,
            timestamp: FieldValue.serverTimestamp() as Timestamp,
            status: 'sent',
        };
        batch.set(messageRef, messagePayload);

        batch.update(leadRef, {
            lastMessagePreview: message,
            lastMessageAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await batch.commit();

        await createAuditLog({
            action: 'SEND_WA_SUCCESS',
            byUid: userProfile.id,
            result: 'SUCCESS',
            message: `Message successfully sent to lead ${leadId}`
        });
        
        return NextResponse.json({ success: true, message: 'Message sent successfully.' }, { status: 200 });

    } catch (error: any)
    {
        console.error('Error sending WhatsApp message:', error);
        
        if (userProfile && leadId) {
            await createAuditLog({
                action: 'SEND_WA_FAIL',
                byUid: userProfile.id,
                result: 'FAILURE',
                message: `Failed to send message to lead ${leadId}: ${error.message}`
            });
        }
        
        const status = (error as any).status || 500;
        return NextResponse.json({ success: false, error: error.message }, { status });
    }
}

    