import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifySuperAdmin } from '@/lib/server/auth-utils';
import { getAdminServices } from '@/lib/firebase/server-app';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import { createAuditLog } from '@/lib/server/audit';

// In a real scenario, you'd import from '@google-cloud/secret-manager'
// For this example, we'll simulate the behavior.
// import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// const secretManager = new SecretManagerServiceClient();
const SECRET_NAME = `projects/${process.env.GCP_PROJECT_ID}/secrets/sumopod_api_key/versions/latest`;

// SIMULATED Secret Manager function
async function saveSecret(key: string): Promise<void> {
    console.log(`[SIMULATED] Saving SumoPod API Key to Secret Manager. Key: ${key.substring(0, 4)}...`);
    // In a real implementation:
    // await secretManager.addSecretVersion({
    //   parent: `projects/${process.env.GCP_PROJECT_ID}/secrets/sumopod_api_key`,
    //   payload: { data: Buffer.from(key, 'utf8') },
    // });
    return Promise.resolve();
}

// SIMULATED Secret Manager function
async function deleteSecret(): Promise<void> {
    console.log(`[SIMULATED] Deleting/disabling SumoPod API Key from Secret Manager.`);
    // In a real implementation, you would disable the latest version.
    return Promise.resolve();
}


export async function POST(request: Request) {
    let userUid: string;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;

        const { apiKey } = await request.json();
        if (!apiKey || typeof apiKey !== 'string') {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
        }

        // Securely save the key
        await saveSecret(apiKey);

        // Update the non-secret metadata in Firestore
        const { firestore } = getAdminServices();
        const settingsRef = firestore.collection('integrations').doc('settings');

        await settingsRef.set({
            secrets: {
                sumopodApiKeyLast4: apiKey.slice(-4),
                sumopodApiKeyRotatedAt: FieldValue.serverTimestamp(),
            }
        }, { merge: true });
        
        await createAuditLog({
            action: 'SET_SUMOPOD_KEY',
            byUid: userUid,
            result: 'SUCCESS',
            message: 'SumoPod API Key was set/rotated.',
        });

        return NextResponse.json({ message: 'SumoPod API Key set successfully' });

    } catch (e: any) {
        const message = e.message || 'An unknown error occurred.';
        if (userUid) {
            await createAuditLog({
                action: 'SET_SUMOPOD_KEY',
                byUid: userUid,
                result: 'FAILURE',
                message,
            });
        }
        if (e.status) {
          return NextResponse.json({ error: message }, { status: e.status });
        }
        console.error('Error setting SumoPod key:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


export async function DELETE(request: Request) {
    let userUid: string;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;

        // Delete/disable the secret
        await deleteSecret();

        // Update the metadata in Firestore
        const { firestore } = getAdminServices();
        const settingsRef = firestore.collection('integrations').doc('settings');
        
        const updateData = {
            'secrets.sumopodApiKeyLast4': FieldValue.delete(),
            'secrets.sumopodApiKeyRotatedAt': FieldValue.delete(),
        };

        await settingsRef.update(updateData);

        await createAuditLog({
            action: 'CLEAR_SUMOPOD_KEY',
            byUid: userUid,
            result: 'SUCCESS',
            message: 'SumoPod API Key was cleared.',
        });

        return NextResponse.json({ message: 'SumoPod API Key cleared successfully' });

    } catch (e: any) {
        const message = e.message || 'An unknown error occurred.';
        if (userUid) {
            await createAuditLog({
                action: 'CLEAR_SUMOPOD_KEY',
                byUid: userUid,
                result: 'FAILURE',
                message,
            });
        }
        if (e.status) {
            return NextResponse.json({ error: message }, { status: e.status });
        }
        console.error('Error clearing SumoPod key:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

    