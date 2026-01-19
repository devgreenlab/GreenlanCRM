// src/app/api/admin/integrations/waha-key/route.ts
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifySuperAdmin } from '@/lib/server/auth-utils';
import { getAdminFirestore } from '@/lib/server/firebase-admin';
import { createAuditLog } from '@/lib/server/audit';

// In a real application, this would save the key to a secure store like Google Secret Manager
async function saveWahaApiKey(apiKey: string): Promise<void> {
    // !! SIMULATION !!
    // This is a placeholder. In a real app, you would save this to a secure location.
    // For this prototype, we'll save it to a Firestore doc that clients can't access.
    // This is NOT a recommended production pattern for storing secrets.
    try {
        const db = getAdminFirestore();
        await db.collection('integrations_secrets').doc('waha').set({ apiKey });
    } catch(e) {
        console.error("Could not save WAHA API Key placeholder:", e);
        throw new Error("Failed to save API key.");
    }
}

// In a real application, this would delete the key from a secure store
async function deleteWahaApiKey(): Promise<void> {
    // !! SIMULATION !!
    try {
        const db = getAdminFirestore();
        await db.collection('integrations_secrets').doc('waha').delete();
    } catch(e) {
        console.error("Could not delete WAHA API Key placeholder:", e);
        throw new Error("Failed to clear API key.");
    }
}


export async function POST(request: Request) {
    let userUid: string;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;
        const body = await request.json();
        const { apiKey } = body;

        if (typeof apiKey !== 'string' || apiKey.length < 10) {
            throw new Error('A valid API key is required.');
        }

        // Save the key to a secure, server-only location
        await saveWahaApiKey(apiKey);

        // Update the public metadata in the main settings document
        const db = getAdminFirestore();
        const settingsRef = db.collection('integrations').doc('settings');

        const metadata = {
            'secrets.wahaApiKeyLast4': apiKey.slice(-4),
            'secrets.wahaApiKeyRotatedAt': FieldValue.serverTimestamp(),
            'updatedBy': uid,
            'updatedAt': FieldValue.serverTimestamp(),
        };

        await settingsRef.set(metadata, { merge: true });

        await createAuditLog({
            action: 'SET_WAHA_KEY',
            byUid: uid,
            result: 'SUCCESS',
            message: 'Successfully set/rotated WAHA API key.',
        });

        // Return only the public metadata, NOT the key
        return NextResponse.json({
            wahaApiKeyLast4: metadata['secrets.wahaApiKeyLast4'],
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
        if (error.status) {
            return NextResponse.json({ error: message }, { status: error.status });
        }
        console.error('Error setting WAHA API key:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    let userUid: string;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;
        
        await deleteWahaApiKey();

        const db = getAdminFirestore();
        const settingsRef = db.collection('integrations').doc('settings');

        const metadata = {
            'secrets.wahaApiKeyLast4': FieldValue.delete(),
            'secrets.wahaApiKeyRotatedAt': FieldValue.delete(),
             'updatedBy': uid,
            'updatedAt': FieldValue.serverTimestamp(),
        };

        await settingsRef.update(metadata);

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
         if (error.status) {
            return NextResponse.json({ error: message }, { status: error.status });
        }
        console.error('Error clearing WAHA API key:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
