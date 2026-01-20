// src/app/api/admin/waha/stop/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/server/auth-utils';
import { createAuditLog } from '@/lib/server/audit';
import { getAdminFirestore } from '@/lib/server/firebase-admin';
import { decrypt } from '@/lib/server/crypto';

async function getWahaConfig() {
    const db = getAdminFirestore();
    const settingsDoc = await db.collection('integrations').doc('settings').get();
    const settings = settingsDoc.data();
    if (!settings?.waha?.baseUrl) throw new Error('WAHA Base URL not configured.');

    const secretDoc = await db.collection('integrations_secrets').doc('waha').get();
    const encryptedApiKey = secretDoc.exists ? secretDoc.data()?.apiKey : null;
    if (!encryptedApiKey) throw new Error('WAHA API Key not set.');
    
    const apiKey = decrypt(encryptedApiKey);
    return { baseUrl: settings.waha.baseUrl, apiKey };
}

export async function POST(request: Request) {
    let userUid: string;
    let sessionName: string = '';
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;

        const body = await request.json();
        sessionName = body.session;
        if (!sessionName) throw new Error('Session name is required.');

        const { baseUrl, apiKey } = await getWahaConfig();

        const stopUrl = `${baseUrl}/api/sessions/${sessionName}/stop`;
        
        const response = await fetch(stopUrl, {
            method: 'POST',
            headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`WAHA API returned status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        
        await createAuditLog({
            action: 'WAHA_SESSION_STOP',
            byUid: userUid,
            result: 'SUCCESS',
            message: `Stopped session '${sessionName}'.`,
        });

        return NextResponse.json(data, { status: 200 });

    } catch (error: any) {
        const message = error.message || 'Failed to stop session.';
        if (userUid) {
            await createAuditLog({
                action: 'WAHA_SESSION_STOP',
                byUid: userUid,
                result: 'FAILURE',
                message: `Failed to stop session '${sessionName}': ${message}`,
            });
        }
        console.error('Error stopping WAHA session:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

    