// src/app/api/admin/waha/stop/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';
import { wahaFetch } from '@/lib/server/waha';
import { createAuditLog } from '@/lib/server/audit';

export const runtime = 'nodejs';

/**
 * POST /api/admin/waha/stop
 * Stops a specific WAHA session.
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
        
        const wahaResponse = await wahaFetch(`/api/sessions/${session}/stop`, {
            method: 'POST',
        });

        if (!wahaResponse.ok) {
            const responseData = await wahaResponse.json().catch(() => ({ error: 'Invalid JSON response from WAHA' }));
            throw new Error(responseData.error || `Failed to stop session ${session}. Status: ${wahaResponse.status}`);
        }

        const responseData = await wahaResponse.json();
        
        await createAuditLog({
            action: 'WAHA_SESSION_LOGOUT', // Using LOGOUT action as it's similar
            byUid: userUid,
            result: 'SUCCESS',
            message: `Successfully stopped session: ${session}.`
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
        if (error.name === 'AuthError') {
            return NextResponse.json({ error: message }, { status: error.status });
        }
        console.error('[API /admin/waha/stop] Error:', error);
        return NextResponse.json({ error: `Internal Server Error: ${message}` }, { status: 500 });
    }
}
