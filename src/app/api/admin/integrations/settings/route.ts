// src/app/api/admin/integrations/settings/route.ts
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifySuperAdmin } from '@/lib/server/auth-utils';
import { getAdminServices } from '@/lib/firebase/server-app';
import { createAuditLog } from '@/lib/server/audit';
import type { IntegrationSettings } from '@/lib/firestore/types';

export async function GET(request: Request) {
  try {
    await verifySuperAdmin(request);
    
    const { firestore: db } = getAdminServices();
    const settingsRef = db.collection('integrations').doc('settings');
    const doc = await settingsRef.get();

    if (!doc.exists) {
      return NextResponse.json({}, { status: 200 });
    }

    const settings = doc.data() as IntegrationSettings;

    // Ensure sensitive parts of secrets are not sent to the client.
    // We only send the public metadata like wahaApiKeyLast4.
    if (settings?.secrets?.crmWebhookSecret) {
        // Redact the secret before sending to client
        settings.secrets.crmWebhookSecret = '********';
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
    
    const { firestore: db } = getAdminServices();
    const settingsRef = db.collection('integrations').doc('settings');
    const doc = await settingsRef.get();
    const currentData = doc.exists ? doc.data() : {};
    
    // Construct the payload with the correct nested object structure
    const updatePayload: Partial<IntegrationSettings> = {
        waha: {
            baseUrl: body.waha?.baseUrl || '',
        },
        flags: {
            inboundEnabled: body.flags?.inboundEnabled === true,
            outboundEnabled: body.flags?.outboundEnabled === true,
            captureFromNow: body.flags?.captureFromNow === true,
        },
        updatedBy: uid,
        updatedAt: FieldValue.serverTimestamp() as any,
        secrets: {
            // Preserve existing secrets that are not part of this form
            ...(currentData?.secrets || {}),
        }
    };
    
    // Only update the crmWebhookSecret if it's provided and not just the redacted placeholder
    if (body.secrets?.crmWebhookSecret && body.secrets.crmWebhookSecret !== '********') {
        if(updatePayload.secrets) {
            updatePayload.secrets.crmWebhookSecret = body.secrets.crmWebhookSecret;
        }
    }

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
