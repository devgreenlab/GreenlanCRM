// src/app/api/admin/waha/key/route.ts
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';
import { getAdminServices } from '@/lib/firebase/server-app';
import { createAuditLog } from '@/lib/server/audit';

export const runtime = 'nodejs';

/**
 * POST /api/admin/waha/key
 * Saves the WAHA API key to the server-only secrets collection.
 */
export async function POST(request: Request) {
    let userUid: string;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;

        const body = await request.json();
        
        // Sanitize the API key by trimming whitespace.
        const apiKey = (body.apiKey || '').trim();

        if (!apiKey) {
            throw new Error('A valid API key is required.');
        }

        const { firestore: db } = getAdminServices();
        
        // The `integrations_secrets` collection has Firestore rules blocking all client access.
        const secretRef = db.collection('integrations_secrets').doc('waha');
        await secretRef.set({ 
            apiKey: apiKey,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        await createAuditLog({
            action: 'SET_WAHA_KEY',
            byUid: userUid,
            result: 'SUCCESS',
            message: 'Successfully set/rotated WAHA API key.',
        });

        return NextResponse.json({ message: 'API Key set successfully' }, { status: 200 });

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
