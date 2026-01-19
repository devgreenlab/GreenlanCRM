// src/app/api/admin/waha/status/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/server/auth-utils';
import { createAuditLog } from '@/lib/server/audit';
import { getAdminFirestore } from '@/lib/server/firebase-admin';

async function getWahaConfig() {
    const db = getAdminFirestore();
    const settingsDoc = await db.collection('integrations').doc('settings').get();
    const settings = settingsDoc.data();

    if (!settings?.waha?.baseUrl) {
        throw new Error('WAHA Base URL is not configured.');
    }

    const secretDoc = await db.collection('integrations_secrets').doc('waha').get();
    const apiKey = secretDoc.exists ? secretDoc.data()?.apiKey : null;

    if (!apiKey) {
        throw new Error('WAHA API Key is not set.');
    }

    return {
        baseUrl: settings.waha.baseUrl,
        apiKey
    };
}

export async function GET(request: Request) {
    let userUid: string;
    let sessionName: string | null = null;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;

        sessionName = new URL(request.url).searchParams.get('session');
        if (!sessionName) {
            throw new Error('Session name is required.');
        }

        const { baseUrl, apiKey } = await getWahaConfig();

        const statusUrl = `${baseUrl}/api/sessions/${sessionName}`;
        
        const response = await fetch(statusUrl, {
            method: 'GET',
            headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
        });

        if (!response.ok && response.status !== 404) { // 404 is a valid state (stopped)
            const errorBody = await response.text();
            throw new Error(`WAHA API returned status ${response.status}: ${errorBody}`);
        }
        
        const data = response.status === 404 ? { status: 'STOPPED' } : await response.json();
        
        let qrCodeBase64 = null;
        if (data.status === 'SCAN_QR_CODE') {
             const qrResponse = await fetch(`${baseUrl}/api/sessions/${sessionName}/qr?format=image`, {
                headers: { 'X-Api-Key': apiKey },
             });
             if (qrResponse.ok) {
                const buffer = await qrResponse.arrayBuffer();
                qrCodeBase64 = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
             }
        }

        await createAuditLog({
            action: 'WAHA_SESSION_STATUS',
            byUid: userUid,
            result: 'SUCCESS',
            message: `Checked status for session '${sessionName}': ${data.status}`,
        });

        return NextResponse.json({ status: data.status, qrCode: qrCodeBase64 }, { status: 200 });

    } catch (error: any) {
        const message = error.message || 'Failed to get session status.';
        if (userUid) {
            await createAuditLog({
                action: 'WAHA_SESSION_STATUS',
                byUid: userUid,
                result: 'FAILURE',
                message: `Failed to check status for session '${sessionName}': ${message}`,
            });
        }
        console.error('Error getting WAHA session status:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
