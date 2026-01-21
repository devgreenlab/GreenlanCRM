// src/app/api/admin/waha/start/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';
import { createAuditLog } from '@/lib/server/audit';
import { wahaFetch } from '@/lib/server/waha';

export const runtime = 'nodejs';

/**
 * POST /api/admin/waha/start
 * Starts a WAHA session. Webhook configuration should be done on the WAHA dashboard.
 */
export async function POST(request: Request) {
    let userUid: string;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;

        const body = await request.json();
        const { session } = body;
        
        if (!session) {
            return NextResponse.json({ error: 'The "session" field is required in the body.' }, { status: 400 });
        }
        
        // The start endpoint should only start the session.
        // Webhook configuration should be done manually on the WAHA dashboard
        // for better security and separation of concerns.
        const wahaResponse = await wahaFetch('/api/sessions/start', {
            method: 'POST',
            body: JSON.stringify({ 
                name: session,
            }),
        });

        const responseData = await wahaResponse.json();

        if (!wahaResponse.ok) {
            const errorMsg = responseData.error || responseData.message || `Failed to start session ${session}.`;
            throw new Error(errorMsg);
        }
        
        await createAuditLog({
            action: 'WAHA_SESSION_START',
            byUid: userUid,
            result: 'SUCCESS',
            message: `Successfully started session: ${session}.`
        });

        return NextResponse.json(responseData);

    } catch (error: any) {
        const message = error.message || 'An unknown error occurred.';
        if (userUid!) {
           await createAuditLog({
               action: 'WAHA_SESSION_START',
               byUid: userUid,
               result: 'FAILURE',
               message: message,
           });
        }
        if (error instanceof AuthError) {
            return NextResponse.json({ error: message }, { status: error.status });
        }
        console.error('[API /admin/waha/start] Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
