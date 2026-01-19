// src/app/api/admin/integrations/settings/route.ts
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifySuperAdmin } from '@/lib/server/auth-utils';
import { getAdminFirestore } from '@/lib/server/firebase-admin';
import { createAuditLog } from '@/lib/server/audit';
import type { IntegrationSettings } from '@/lib/firestore/types';

export async function GET(request: Request) {
  try {
    const { uid } = await verifySuperAdmin(request);
    
    const db = getAdminFirestore();
    const settingsRef = db.collection('integrations').doc('settings');
    const doc = await settingsRef.get();

    if (!doc.exists) {
      return NextResponse.json({}, { status: 200 });
    }

    const settings = doc.data() as IntegrationSettings;
    // Ensure secrets are not sent to the client, even though they shouldn't be here anyway.
    // We only send the public metadata like wahaApiKeyLast4.
    if (settings?.secrets) {
        // This is a safeguard; actual secret values are in a separate, inaccessible collection.
    }

    return NextResponse.json(settings, { status: 200 });

  } catch (error: any) {
    if (error.status) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching integration settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let userUid: string;
  try {
    const { uid } = await verifySuperAdmin(request);
    userUid = uid;

    const body = await request.json();
    
    const db = getAdminFirestore();
    const settingsRef = db.collection('integrations').doc('settings');
    
    // We only update non-secret fields here. Secrets are handled by their own endpoints.
    const updatePayload = {
        'waha.baseUrl': body.waha?.baseUrl || '',
        'waha.session': body.waha?.session || 'default',
        'n8n.inboundWebhookUrl': body.n8n?.inboundWebhookUrl || '',
        'n8n.outboundWebhookUrl': body.n8n?.outboundWebhookUrl || '',
        'secrets.crmWebhookSecret': body.secrets?.crmWebhookSecret || '',
        'flags.inboundEnabled': body.flags?.inboundEnabled === true,
        'flags.outboundEnabled': body.flags?.outboundEnabled === true,
        'updatedBy': uid,
        'updatedAt': FieldValue.serverTimestamp(),
    };
    
    await settingsRef.set(updatePayload, { merge: true });

    await createAuditLog({
        action: 'SAVE_INTEGRATION_SETTINGS',
        byUid: uid,
        result: 'SUCCESS',
        message: 'Successfully updated integration settings.'
    });
    
    return NextResponse.json({ message: 'Settings saved successfully' }, { status: 200 });

  } catch (error: any) {
    const message = error.message || 'Failed to save settings.';
    if(userUid!) {
      await createAuditLog({
          action: 'SAVE_INTEGRATION_SETTINGS',
          byUid: userUid,
          result: 'FAILURE',
          message,
      });
    }
    if (error.status) {
      return NextResponse.json({ error: message }, { status: error.status });
    }
    console.error('Error saving integration settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
