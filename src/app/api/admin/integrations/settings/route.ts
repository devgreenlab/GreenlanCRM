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

    const settings = doc.data();
    // Ensure secrets are not sent to the client, even though they shouldn't be here anyway.
    if (settings?.secrets) {
        delete settings.secrets.wahaApiKey; 
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

    const updatePayload: Partial<IntegrationSettings> = {
        waha: {
            baseUrl: body.waha?.baseUrl || '',
            session: body.waha?.session || 'default',
        },
        n8n: {
            outboundWebhookUrl: body.n8n?.outboundWebhookUrl || ''
        },
        secrets: {
            crmWebhookSecret: body.secrets?.crmWebhookSecret || '',
        },
        flags: {
            inboundEnabled: body.flags?.inboundEnabled === true,
            outboundEnabled: body.flags?.outboundEnabled === true,
        },
        updatedBy: uid,
        updatedAt: FieldValue.serverTimestamp() as any,
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
