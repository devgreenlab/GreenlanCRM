import { NextResponse } from 'next/server';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuthenticatedAppForUser } from '@/lib/firebase/server-app';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import { createAuditLog } from '@/lib/firestore/audit';
// In a real scenario, you'd import from '@google-cloud/secret-manager'
// For this example, we'll simulate the behavior.
// import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// const secretManager = new SecretManagerServiceClient();
const SECRET_NAME = `projects/${process.env.GCP_PROJECT_ID}/secrets/sumopod_api_key/versions/latest`;

async function checkSuperAdmin(auth: any) {
    if (!auth.currentUser) return false;
    const userDoc = await getDoc(doc(getAuthenticatedAppForUser().firestore, FIRESTORE_COLLECTIONS.users, auth.currentUser.uid));
    return userDoc.exists() && userDoc.data().role === 'SUPER_ADMIN';
}

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
    const { auth } = getAuthenticatedAppForUser();
    const uid = auth.currentUser?.uid;

    if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (!(await checkSuperAdmin(auth))) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { apiKey } = await request.json();
        if (!apiKey || typeof apiKey !== 'string') {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
        }

        // Securely save the key
        await saveSecret(apiKey);

        // Update the non-secret metadata in Firestore
        const settingsRef = doc(getAuthenticatedAppForUser().firestore, FIRESTORE_COLLECTIONS.integrationSettings);
        await setDoc(settingsRef, {
            sumopod: {
                apiKeyLast4: apiKey.slice(-4),
                apiKeyRotatedAt: serverTimestamp(),
            }
        }, { merge: true });
        
        await createAuditLog({
            action: 'SET_SUMOPOD_KEY',
            byUid: uid,
            result: 'SUCCESS',
            message: 'SumoPod API Key was set/rotated.',
        });

        return NextResponse.json({ message: 'SumoPod API Key set successfully' });

    } catch (e: any) {
        console.error('Error setting SumoPod key:', e);
        await createAuditLog({
            action: 'SET_SUMOPOD_KEY',
            byUid: uid,
            result: 'FAIL',
            message: e.message || 'An unknown error occurred.',
        });
        return NextResponse.json({ error: e.message || 'An unknown error occurred' }, { status: 500 });
    }
}


export async function DELETE(request: Request) {
    const { auth } = getAuthenticatedAppForUser();
    const uid = auth.currentUser?.uid;

    if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        if (!(await checkSuperAdmin(auth))) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Delete/disable the secret
        await deleteSecret();

        // Update the metadata in Firestore
        const settingsRef = doc(getAuthenticatedAppForUser().firestore, FIRESTORE_COLLECTIONS.integrationSettings);
        await setDoc(settingsRef, {
            sumopod: {
                apiKeyLast4: null,
                apiKeyRotatedAt: serverTimestamp(),
            }
        }, { merge: true });

        await createAuditLog({
            action: 'CLEAR_SUMOPOD_KEY',
            byUid: uid,
            result: 'SUCCESS',
            message: 'SumoPod API Key was cleared.',
        });

        return NextResponse.json({ message: 'SumoPod API Key cleared successfully' });

    } catch (e: any) {
        console.error('Error clearing SumoPod key:', e);
        await createAuditLog({
            action: 'CLEAR_SUMOPOD_KEY',
            byUid: uid,
            result: 'FAIL',
            message: e.message || 'An unknown error occurred.',
        });
        return NextResponse.json({ error: e.message || 'An unknown error occurred' }, { status: 500 });
    }
}
