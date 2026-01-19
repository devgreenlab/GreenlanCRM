import { NextResponse } from 'next/server';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuthenticatedAppForUser } from '@/lib/firebase/server-app';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';
import { createAuditLog } from '@/lib/firestore/audit';
import type { IntegrationSettings } from '@/lib/firestore/types';

// Force dynamic resolution for Next.js API routes
export const dynamic = 'force-dynamic';

async function checkSuperAdmin(auth: any) {
    if (!auth.currentUser) return false;
    const userDoc = await getDoc(doc(getAuthenticatedAppForUser().firestore, FIRESTORE_COLLECTIONS.users, auth.currentUser.uid));
    return userDoc.exists() && userDoc.data().role === 'SUPER_ADMIN';
}

// GET handler to fetch current settings
export async function GET(request: Request) {
    const { auth } = getAuthenticatedAppForUser();
    
    try {
        const isSuperAdminUser = await checkSuperAdmin(auth);
        if (!isSuperAdminUser) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const settingsRef = doc(getAuthenticatedAppForUser().firestore, FIRESTORE_COLLECTIONS.integrationSettings);
        const settingsDoc = await getDoc(settingsRef);

        if (!settingsDoc.exists()) {
            return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
        }

        return NextResponse.json(settingsDoc.data());

    } catch (e: any) {
        console.error('Error fetching integration settings:', e);
        return NextResponse.json({ error: e.message || 'An unknown error occurred.' }, { status: 500 });
    }
}

// POST handler to save settings
export async function POST(request: Request) {
    const { auth } = getAuthenticatedAppForUser();
    const uid = auth.currentUser?.uid;

    try {
        if (!uid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const isSuperAdminUser = await checkSuperAdmin(auth);
        if (!isSuperAdminUser) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();

        // Validate body against your expected schema if necessary (Zod is good for this)

        const settingsRef = doc(getAuthenticatedAppForUser().firestore, FIRESTORE_COLLECTIONS.integrationSettings);
        const currentSettingsDoc = await getDoc(settingsRef);
        const currentSettings = currentSettingsDoc.data() as Partial<IntegrationSettings> || {};

        const dataToSave: Partial<IntegrationSettings> = {
            ...currentSettings, // Preserve existing fields like apiKey metadata
            waha: {
                ...currentSettings.waha,
                baseUrl: body.waha.baseUrl,
                session: body.waha.session,
            },
            n8n: {
                outboundWebhookUrl: body.n8n.outboundWebhookUrl,
            },
            secrets: {
                crmWebhookSecret: body.secrets.crmWebhookSecret,
            },
            flags: body.flags,
            updatedAt: serverTimestamp() as any,
            updatedBy: uid,
        };

        await setDoc(settingsRef, dataToSave, { merge: true });

        await createAuditLog({
            action: "SAVE_SETTINGS",
            byUid: uid,
            result: "SUCCESS",
            message: "Integration settings updated successfully.",
        });

        return NextResponse.json({ message: 'Settings saved successfully' });

    } catch (e: any) {
        console.error('Error saving integration settings:', e);
        await createAuditLog({
            action: "SAVE_SETTINGS",
            byUid: uid || 'unknown',
            result: "FAIL",
            message: e.message || 'An unknown error occurred while saving settings.',
        });
        return NextResponse.json({ error: e.message || 'An unknown error occurred.' }, { status: 500 });
    }
}
