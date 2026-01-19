'use server';

import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { verifyAuthenticatedUser } from '@/lib/server/auth-utils';
import { getAdminFirestore } from '@/lib/server/firebase-admin';
import { createAuditLog } from '@/lib/server/audit';
import type { IntegrationSettings, Lead, UserProfile, Activity } from '@/lib/firestore/types';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';

async function callN8nWebhook(
    webhookUrl: string,
    secret: string,
    payload: { leadId: string, chatId: string, text: string, session: string }
) {
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CRM-Secret': secret,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`n8n webhook failed with status ${response.status}: ${errorBody}`);
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
            throw new Error('Message and leadId are required.');
        }

        await createAuditLog({
            action: 'SEND_WA_ATTEMPT',
            byUid: userProfile.id,
            result: 'SUCCESS',
            message: `Attempting to send message to lead ${leadId}`
        });

        // 2. Get integration settings from Firestore
        const db = getAdminFirestore();
        const settingsRef = db.collection('integrations').doc('settings');
        const doc = await settingsRef.get();
        
        if (!doc.exists) {
            throw new Error('Integration settings not found.');
        }
        const settings = doc.data() as IntegrationSettings;

        // 3. Validate if outbound is enabled
        if (!settings.flags?.outboundEnabled) {
            throw new Error('Outbound messaging is disabled by an administrator.');
        }

        if (!settings.n8n?.outboundWebhookUrl || !settings.secrets?.crmWebhookSecret) {
            throw new Error('n8n webhook URL or CRM secret is not configured.');
        }

        // 4. Fetch Lead to get session and chatId
        const leadRef = db.collection(FIRESTORE_COLLECTIONS.leads).doc(leadId);
        const leadDoc = await leadRef.get();
        if (!leadDoc.exists) {
            throw new Error('Lead not found.');
        }
        const lead = leadDoc.data() as Lead;
        
        // Security check: ensure user is allowed to message this lead
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

        // 5. Call n8n webhook
        await callN8nWebhook(
            settings.n8n.outboundWebhookUrl,
            settings.secrets.crmWebhookSecret,
            { leadId, chatId, text: message, session }
        );

        // 6. Log activity and update lead on success
        const batch = db.batch();

        const activityRef = db.collection(FIRESTORE_COLLECTIONS.activities).doc();
        const activityPayload: Omit<Activity, 'id'> = {
            leadId,
            teamId: lead.teamId,
            actorUid: userProfile.id,
            type: 'whatsapp_out',
            content: message,
            createdAt: FieldValue.serverTimestamp() as Timestamp,
        };
        batch.set(activityRef, activityPayload);

        batch.update(leadRef, {
            lastMessagePreview: message,
            lastOutboundAt: FieldValue.serverTimestamp(),
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
