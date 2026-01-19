import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { getAuthenticatedAppForUser } from '@/lib/firebase/server-app';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import { createAuditLog } from '@/lib/firestore/audit';
// In a real scenario, you'd import from '@google-cloud/secret-manager'
// For this example, we'll simulate the behavior.
// import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

async function checkSuperAdmin(auth: any) {
    if (!auth.currentUser) return false;
    const userDoc = await getDoc(doc(getAuthenticatedAppForUser().firestore, FIRESTORE_COLLECTIONS.users, auth.currentUser.uid));
    return userDoc.exists() && userDoc.data().role === 'SUPER_ADMIN';
}

// SIMULATED Secret Manager function
async function getSecret(): Promise<string | null> {
    console.log(`[SIMULATED] Fetching WAHA API Key from Secret Manager.`);
    // In a real implementation:
    // const [version] = await secretManager.accessSecretVersion({ name: SECRET_NAME });
    // return version.payload?.data?.toString() || null;
    // For simulation, we return a mock key if it's supposed to be set.
    // In a real app, you can't know this, but we need it for the test logic.
    return "simulated_secret_key";
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

        const settingsRef = doc(getAuthenticatedAppForUser().firestore, FIRESTORE_COLLECTIONS.integrationSettings);
        const settingsDoc = await getDoc(settingsRef);

        if (!settingsDoc.exists() || !settingsDoc.data().waha?.baseUrl || !settingsDoc.data().waha?.apiKeyLast4) {
            throw new Error('WAHA settings or API Key are not configured.');
        }

        const { baseUrl } = settingsDoc.data().waha;
        const apiKey = await getSecret(); // Fetch securely on the server
        
        if (!apiKey) {
            throw new Error('WAHA API Key is not available in the secret store.');
        }

        // In a real test, you'd call a specific WAHA endpoint, e.g., /api/sessions
        const testUrl = `${baseUrl}/api/sessions`;

        const response = await fetch(testUrl, {
            method: 'GET',
            headers: { 'X-Api-Key': apiKey },
        });

        if (!response.ok) {
            throw new Error(`WAHA server responded with status ${response.status}. Check Base URL and API Key.`);
        }
        
        await createAuditLog({
            action: 'TEST_WAHA_SUCCESS',
            byUid: uid,
            result: 'SUCCESS',
            message: `Successfully connected to WAHA at ${baseUrl}.`,
        });

        return NextResponse.json({ message: 'Connection to WAHA successful!' });

    } catch (e: any) {
        console.error('Error testing WAHA connection:', e);
         await createAuditLog({
            action: 'TEST_WAHA_FAIL',
            byUid: uid,
            result: 'FAIL',
            message: e.message || 'An unknown error occurred during the test.',
        });
        return NextResponse.json({ error: e.message || 'An unknown error occurred' }, { status: 500 });
    }
}
