// src/app/api/admin/waha/config/route.ts
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';
import { getAdminServices } from '@/lib/firebase/server-app';
import { createAuditLog } from '@/lib/server/audit';
import type { IntegrationSettings } from '@/lib/firestore/types';

export const runtime = 'nodejs';

/**
 * GET /api/admin/waha/config
 * Fetches the public WAHA configuration.
 */
export async function GET(request: Request) {
  try {
    await verifySuperAdmin(request);
    
    const { firestore: db } = getAdminServices();
    const settingsRef = db.collection('integrations').doc('settings');
    const secretRef = db.collection('integrations_secrets').doc('waha');
    
    const [settingsDoc, secretDoc] = await Promise.all([settingsRef.get(), secretRef.get()]);

    if (!settingsDoc.exists) {
      return NextResponse.json({
        baseUrl: '',
        authMode: 'X-Api-Key',
        keySet: false,
      }, { status: 200 });
    }

    const settings = settingsDoc.data() as IntegrationSettings;
    const apiKeyExists = secretDoc.exists && !!secretDoc.data()?.apiKey;

    return NextResponse.json({
      baseUrl: settings.wahaBaseUrl || '',
      authMode: settings.wahaAuthMode || 'X-Api-Key',
      keySet: apiKeyExists,
    }, { status: 200 });

  } catch (error: any) {
    if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching WAHA config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/waha/config
 * Saves the public WAHA configuration.
 */
export async function POST(request: Request) {
  let userUid: string;
  try {
    const { uid } = await verifySuperAdmin(request);
    userUid = uid;

    const body = await request.json();
    const { baseUrl, authMode } = body;

    if (!baseUrl || !authMode) {
      return NextResponse.json({ error: 'baseUrl and authMode are required.' }, { status: 400 });
    }

    if (!['X-Api-Key', 'Bearer'].includes(authMode)) {
      return NextResponse.json({ error: 'Invalid authMode.' }, { status: 400 });
    }
    
    const { firestore: db } = getAdminServices();
    const settingsRef = db.collection('integrations').doc('settings');
    
    // Normalize URL
    const normalizedUrl = baseUrl.trim().replace(/\/dashboard\/?$/, '').replace(/\/$/, '');
    
    const updatePayload: Partial<IntegrationSettings> = {
        wahaBaseUrl: normalizedUrl,
        wahaAuthMode: authMode,
        updatedBy: userUid,
        updatedAt: FieldValue.serverTimestamp() as any,
    };

    await settingsRef.set(updatePayload, { merge: true });

    await createAuditLog({
        action: 'SAVE_WAHA_CONFIG',
        byUid: userUid,
        result: 'SUCCESS',
        message: 'Successfully updated WAHA configuration.'
    });
    
    return NextResponse.json({ message: 'Settings saved successfully' }, { status: 200 });

  } catch (error: any) {
    const message = error.message || 'Failed to save settings.';
    if(userUid!) {
      await createAuditLog({
          action: 'SAVE_WAHA_CONFIG',
          byUid: userUid,
          result: 'FAILURE',
          message,
      });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: message }, { status: error.status });
    }
    console.error('Error saving WAHA config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
    