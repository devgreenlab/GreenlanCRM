// src/app/api/admin/integrations/test-waha/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/server/auth-utils';
import { createAuditLog } from '@/lib/server/audit';
import { getAdminFirestore } from '@/lib/server/firebase-admin';

// In a real application, this would retrieve the key from a secure store like Google Secret Manager
async function getWahaApiKey(): Promise<string | null> {
    // This is a placeholder for retrieving the secret from a secure, server-side location.
    // For this prototype, we'll read it from a Firestore doc that clients can't access via security rules.
    try {
        const db = getAdminFirestore();
        const secretDoc = await db.collection('integrations_secrets').doc('waha').get();
        if (secretDoc.exists) {
            return secretDoc.data()?.apiKey || null;
        }
        return null;
    } catch (e) {
        console.error("Could not retrieve WAHA API Key placeholder:", e);
        return null;
    }
}


export async function POST(request: Request) {
    let userUid: string;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;

        const db = getAdminFirestore();
        const settingsDoc = await db.collection('integrations').doc('settings').get();
        const settings = settingsDoc.data();

        if (!settings?.waha?.baseUrl) {
            throw new Error('WAHA Base URL is not configured.');
        }

        const apiKey = await getWahaApiKey();
        if (!apiKey) {
            throw new Error('WAHA API Key is not set.');
        }

        const testUrl = `${settings.waha.baseUrl}/api/sessions/${settings.waha.session || 'default'}`;
        
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`WAHA API returned status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();

        await createAuditLog({
            action: 'TEST_WAHA_CONNECTION',
            byUid: uid,
            result: 'SUCCESS',
            message: `Successfully connected to WAHA at ${settings.waha.baseUrl}.`,
        });

        return NextResponse.json({ success: true, data }, { status: 200 });

    } catch (error: any) {
        const message = error.message || 'Failed to test WAHA connection.';
        if (userUid!) {
            await createAuditLog({
                action: 'TEST_WAHA_CONNECTION',
                byUid: userUid,
                result: 'FAILURE',
                message,
            });
        }
        // Don't check for error.status here, as custom errors might not have it.
        // The default is to return a 500 error.
        console.error('Error testing WAHA connection:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
