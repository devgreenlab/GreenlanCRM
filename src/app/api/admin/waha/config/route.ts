// src/app/api/admin/waha/config/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';
import { getAdminServices, getBackendFirebaseProjectId } from '@/lib/firebase/server-app';
import type { IntegrationSettings } from '@/lib/firestore/types';
import { createAuditLog } from '@/lib/server/audit';
import { firebaseConfig } from '@/firebase/config';

export const runtime = 'nodejs';

/**
 * GET /api/admin/waha/config
 * Checks for the presence of required WAHA environment variables on the server
 * and retrieves the non-secret wahaBaseUrl.
 * This is a read-only status check for the admin UI.
 */
export async function GET(request: Request) {
  const backendFirebaseProjectId = getBackendFirebaseProjectId();
  try {
    await verifySuperAdmin(request);
    
    const { firestore } = getAdminServices();
    const settingsDoc = await firestore.collection('integrations').doc('settings').get();
    const settingsData = settingsDoc.data() as IntegrationSettings | undefined;

    const status = {
      wahaBaseUrl: settingsData?.wahaBaseUrl || process.env.WAHA_BASE_URL || '',
      isApiKeySet: !!process.env.WAHA_API_KEY,
      isWebhookSecretSet: !!process.env.WAHA_WEBHOOK_SECRET,
    };

    return NextResponse.json({ 
        ...status, 
        debug: {
            backendFirebaseProjectId,
            frontendFirebaseProjectId: firebaseConfig.projectId
        } 
    }, { status: 200 });

  } catch (error: any) {
    if (error.name === 'AuthError') {
        return NextResponse.json({ error: error.message, debug: { backendFirebaseProjectId, frontendFirebaseProjectId: firebaseConfig.projectId } }, { status: error.status });
    }
    console.error('Error fetching WAHA config status:', error);
    return NextResponse.json({ error: 'Internal Server Error', debug: { backendFirebaseProjectId, frontendFirebaseProjectId: firebaseConfig.projectId } }, { status: 500 });
  }
}

/**
 * POST /api/admin/waha/config
 * Saves non-secret WAHA configuration like the base URL.
 */
export async function POST(request: Request) {
    let userUid: string | undefined;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;

        const body = await request.json();
        const { wahaBaseUrl } = body;

        if (typeof wahaBaseUrl !== 'string') {
            return NextResponse.json({ error: 'wahaBaseUrl must be a string.' }, { status: 400 });
        }
        
        try {
            // Basic URL validation
            if(wahaBaseUrl) new URL(wahaBaseUrl);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid URL format for wahaBaseUrl.' }, { status: 400 });
        }

        const { firestore } = getAdminServices();
        const settingsRef = firestore.collection('integrations').doc('settings');

        await settingsRef.set({ wahaBaseUrl }, { merge: true });

        await createAuditLog({
            action: 'SAVE_WAHA_CONFIG',
            byUid: userUid,
            result: 'SUCCESS',
            message: `Saved WAHA base URL.`
        });

        return NextResponse.json({ message: 'Configuration saved successfully.' });

    } catch (error: any) {
        const backendFirebaseProjectId = getBackendFirebaseProjectId();
        const message = error.message || 'An unknown error occurred.';
         if (userUid) {
            await createAuditLog({
                action: 'SAVE_WAHA_CONFIG',
                byUid: userUid,
                result: 'FAILURE',
                message: message,
            });
         }
        if (error.name === 'AuthError') {
            return NextResponse.json({ error: message, debug: { backendFirebaseProjectId } }, { status: error.status });
        }
        console.error('[API /admin/waha/config POST] Error:', error);
        return NextResponse.json({ error: `Internal Server Error: ${message}`, debug: { backendFirebaseProjectId } }, { status: 500 });
    }
}
