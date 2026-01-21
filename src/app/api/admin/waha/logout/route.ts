// src/app/api/admin/waha/logout/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';
import { wahaFetch } from '@/lib/server/waha';
import { createAuditLog } from '@/lib/server/audit';

export const runtime = 'nodejs';

/**
 * POST /api/admin/waha/logout
 * Logs out a specific WAHA session.
 */
export async function POST(request: Request) {
    let userUid: string | undefined;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;

        const body = await request.json();
        const { session } = body;
        
        if (!session) {
            return NextResponse.json({ error: 'The "session" field is required in the body.' }, { status: 400 });
        }
        
        const wahaResponse = await wahaFetch('/api/sessions/logout', {
            method: 'POST',
            body: JSON.stringify({ name: session }), // WAHA expects { "name": "session_name" }
        });

        if (!wahaResponse.ok) {
            const responseData = await wahaResponse.json().catch(() => ({ error: 'Invalid JSON response from WAHA' }));
            throw new Error(responseData.error || `Failed to logout session ${session}. Status: ${wahaResponse.status}`);
        }

        const responseData = await wahaResponse.json();
        
        await createAuditLog({
            action: 'WAHA_SESSION_LOGOUT',
            byUid: userUid,
            result: 'SUCCESS',
            message: `Successfully logged out session: ${session}.`
        });

        return NextResponse.json(responseData);

    } catch (error: any) {
         const message = error.message || 'An unknown error occurred.';
         if (userUid) {
            await createAuditLog({
                action: 'WAHA_SESSION_LOGOUT',
                byUid: userUid,
                result: 'FAILURE',
                message: message,
            });
         }
        if (error instanceof AuthError) {
            return NextResponse.json({ error: message }, { status: error.status });
        }
        console.error('[API /admin/waha/logout] Error:', error);
        return NextResponse.json({ error: `Internal Server Error: ${message}` }, { status: 500 });
    }
}
