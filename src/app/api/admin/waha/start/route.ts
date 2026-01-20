// src/app/api/admin/waha/start/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';
import { createAuditLog } from '@/lib/server/audit';
import { getAdminServices } from '@/lib/firebase/server-app';
import { decrypt } from '@/lib/server/crypto';

async function getWahaConfig() {
    const { firestore: db } = getAdminServices();
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

        const startUrl = `${baseUrl}/api/sessions/${sessionName}/start`;
        
        const response = await fetch(startUrl, {
            method: 'POST',
            headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
            // Wait for QR code scan, simplifies client logic
            body: JSON.stringify({ wait: true }), 
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`WAHA API returned status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        
        let qrCodeBase64 = null;
        if (data.status === 'SCAN_QR_CODE' && data.qr) {
            // QR might be returned directly in the start response
            qrCodeBase64 = data.qr;
        }
        
        await createAuditLog({
            action: 'WAHA_SESSION_START',
            byUid: userUid,
            result: 'SUCCESS',
            message: `Started session '${sessionName}'. Status: ${data.status}`,
        });

        return NextResponse.json({ status: data.status, qrCode: qrCodeBase64 }, { status: 200 });

    } catch (error: any) {
        const message = error.message || 'Failed to start session.';
        if (userUid) {
            await createAuditLog({
                action: 'WAHA_SESSION_START',
                byUid: userUid,
                result: 'FAILURE',
                message: `Failed to start session '${sessionName}': ${message}`,
            });
        }
        if (error instanceof AuthError) {
            return NextResponse.json({ error: message }, { status: error.status });
        }
        console.error('Error starting WAHA session:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
