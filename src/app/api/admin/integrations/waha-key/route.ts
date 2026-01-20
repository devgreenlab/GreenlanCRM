// src/app/api/admin/integrations/waha-key/route.ts
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';
import { getAdminServices } from '@/lib/firebase/server-app';
import { createAuditLog } from '@/lib/server/audit';
import { encrypt, decrypt } from '@/lib/server/crypto';

// This function saves the encrypted API key to a secure, server-only collection.
async function saveWahaApiKey(apiKey: string): Promise<void> {
    try {
        const encryptedKey = encrypt(apiKey);
        const { firestore: db } = getAdminServices();
        // The `integrations_secrets` collection has Firestore rules blocking all client access.
        await db.collection('integrations_secrets').doc('waha').set({ apiKey: encryptedKey });
    } catch(e) {
        console.error("Could not save encrypted WAHA API Key:", e);
        throw new Error("Failed to save API key to secure store.");
    }
}

// This function deletes the key from the secure store.
async function deleteWahaApiKey(): Promise<void> {
    try {
        const { firestore: db } = getAdminServices();
        await db.collection('integrations_secrets').doc('waha').delete();
    } catch(e) {
        console.error("Could not delete WAHA API Key:", e);
        throw new Error("Failed to clear API key from secure store.");
    }
}


export async function POST(request: Request) {
    let userUid: string = 'development-user-uid'; // Mock user for development
    try {
        // const { uid } = await verifySuperAdmin(request); // Temporarily disabled for development
        // userUid = uid;
        const uid = userUid;

        const body = await request.json();
        
        // Sanitize the API key by trimming whitespace.
        const apiKey = (body.apiKey || '').trim();

        if (apiKey.length < 10) {
            throw new Error('A valid API key is required.');
        }

        // 1. Encrypt and save the key to a secure, server-only location
        await saveWahaApiKey(apiKey);

        // 2. Update public metadata in the main settings document
        const { firestore: db } = getAdminServices();
        const settingsRef = db.collection('integrations').doc('settings');

        await settingsRef.set({
            secrets: {
                wahaApiKeyLast4: apiKey.slice(-4),
                wahaApiKeyRotatedAt: FieldValue.serverTimestamp(),
            },
            updatedBy: uid,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        await createAuditLog({
            action: 'SET_WAHA_KEY',
            byUid: uid,
            result: 'SUCCESS',
            message: 'Successfully set/rotated WAHA API key.',
        });

        // 3. Return only the public metadata, NOT the key
        return NextResponse.json({
            wahaApiKeyLast4: apiKey.slice(-4),
            wahaApiKeyRotatedAt: new Date().toISOString(), // Approximate for client
        }, { status: 200 });

    } catch (error: any) {
        const message = error.message || 'Failed to set API key.';
        if (userUid!) {
            await createAuditLog({
                action: 'SET_WAHA_KEY',
                byUid: userUid,
                result: 'FAILURE',
                message,
            });
        }
        if (error instanceof AuthError) {
            return NextResponse.json({ error: message }, { status: error.status });
        }
        console.error('Error setting WAHA API key:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    let userUid: string = 'development-user-uid'; // Mock user for development
    try {
        // const { uid } = await verifySuperAdmin(request); // Temporarily disabled for development
        // userUid = uid;
        const uid = userUid;
        
        // 1. Delete the key from the secure store
        await deleteWahaApiKey();

        // 2. Update the public metadata by removing the fields
        const { firestore: db } = getAdminServices();
        const settingsRef = db.collection('integrations').doc('settings');

        const metadataUpdate = {
            'secrets.wahaApiKeyLast4': FieldValue.delete(),
            'secrets.wahaApiKeyRotatedAt': FieldValue.delete(),
             'updatedBy': uid,
            'updatedAt': FieldValue.serverTimestamp(),
        };

        await settingsRef.update(metadataUpdate);

        await createAuditLog({
            action: 'CLEAR_WAHA_KEY',
            byUid: uid,
            result: 'SUCCESS',
            message: 'Successfully cleared WAHA API key.',
        });
        
        return NextResponse.json({ message: 'API Key cleared' }, { status: 200 });
    } catch (error: any) {
        const message = error.message || 'Failed to clear API key.';
        if (userUid!) {
            await createAuditLog({
                action: 'CLEAR_WAHA_KEY',
                byUid: userUid,
                result: 'FAILURE',
                message,
            });
        }
         if (error instanceof AuthError) {
            return NextResponse.json({ error: message }, { status: error.status });
        }
        console.error('Error clearing WAHA API key:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
