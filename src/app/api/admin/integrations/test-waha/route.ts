// src/app/api/admin/integrations/test-waha/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/server/auth-utils';
import { createAuditLog } from '@/lib/server/audit';
import { getAdminServices } from '@/lib/firebase/server-app';
import { decrypt } from '@/lib/server/crypto';

// This function centralizes fetching the WAHA configuration and API key.
async function getWahaConfig() {
    const { firestore: db } = getAdminServices();
    const settingsDoc = await db.collection('integrations').doc('settings').get();
    const settings = settingsDoc.data();
    if (!settings?.waha?.baseUrl) {
        throw new Error('WAHA Base URL not configured.');
    }

    // The actual key is stored encrypted in a secure, server-only collection.
    const secretDoc = await db.collection('integrations_secrets').doc('waha').get();
    const encryptedApiKey = secretDoc.exists ? secretDoc.data()?.apiKey : null;
    if (!encryptedApiKey) {
        throw new Error('WAHA API Key not set.');
    }

    // Decrypt the key on the server before using it.
    const apiKey = decrypt(encryptedApiKey);

    return { baseUrl: settings.waha.baseUrl, apiKey };
}


export async function POST(request: Request) {
    let userUid: string;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;

        const { baseUrl, apiKey } = await getWahaConfig();

        // The /api/check-connection endpoint is a common pattern for health checks.
        const testUrl = `${baseUrl}/api/check-connection`;

        const response = await fetch(testUrl, {
            method: 'GET',
            headers: { 'X-Api-Key': apiKey },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Connection test failed. WAHA API responded with status ${response.status}: ${errorBody}`);
        }

        await createAuditLog({
            action: 'TEST_WAHA_CONNECTION',
            byUid: uid,
            result: 'SUCCESS',
            message: 'Successfully connected to WAHA instance.',
        });

        return NextResponse.json({ message: 'Connection to WAHA successful!' });

    } catch (error: any) {
        const message = error.message || 'An unknown error occurred during the connection test.';
        if (userUid!) {
            await createAuditLog({
                action: 'TEST_WAHA_CONNECTION',
                byUid: userUid,
                result: 'FAILURE',
                message,
            });
        }
        console.error('Error testing WAHA connection:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
