// src/app/api/admin/waha/config/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';

export const runtime = 'nodejs';

/**
 * GET /api/admin/waha/config
 * Checks for the presence of required WAHA environment variables on the server.
 * Does NOT return the actual values. This is a read-only status check for the admin UI.
 */
export async function GET(request: Request) {
  try {
    // This endpoint is for admins to verify server setup.
    await verifySuperAdmin(request);
    
    const status = {
      isBaseUrlSet: !!process.env.WAHA_BASE_URL,
      isApiKeySet: !!process.env.WAHA_API_KEY,
      isWebhookSecretSet: !!process.env.WAHA_WEBHOOK_SECRET,
    };

    return NextResponse.json(status, { status: 200 });

  } catch (error: any) {
    if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    // This could happen if verifySuperAdmin fails for non-auth reasons (e.g., Firestore connection)
    console.error('Error fetching WAHA env status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
