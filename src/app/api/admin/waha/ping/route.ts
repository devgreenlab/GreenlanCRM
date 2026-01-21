// src/app/api/admin/waha/ping/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';
import { wahaFetch } from '@/lib/server/waha';
import { createAuditLog } from '@/lib/server/audit';

export const runtime = 'nodejs';

/**
 * GET /api/admin/waha/ping
 * Pings the WAHA instance by checking its version endpoint.
 * Requires SUPER_ADMIN role.
 */
export async function GET(request: Request) {
    let userUid: string;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;

        const wahaResponse = await wahaFetch('/api/version');

        if (!wahaResponse.ok) {
            const errorText = await wahaResponse.text().catch(() => 'Could not read error response from WAHA.');
            throw new Error(`Ping failed. WAHA API responded with status ${wahaResponse.status}. Details: ${errorText}`);
        }
        
        const data = await wahaResponse.json();

        await createAuditLog({
            action: 'TEST_WAHA_CONNECTION',
            byUid: uid,
            result: 'SUCCESS',
            message: 'Successfully pinged WAHA version endpoint.',
        });

        return NextResponse.json({ 
            message: `Connection to WAHA successful!`,
            ...data 
        });

    } catch (error: any) {
        const message = error.message || 'An unknown error occurred.';
        if (userUid!) {
            await createAuditLog({
                action: 'TEST_WAHA_CONNECTION',
                byUid: userUid,
                result: 'FAILURE',
                message: message,
            });
        }
        
        if (error instanceof AuthError) {
            return NextResponse.json({ error: message }, { status: error.status });
        }
        
        if (message.includes('WAHA env missing')) {
             return NextResponse.json({ error: "WAHA env missing" }, { status: 500 });
        }
        
        console.error('[API /admin/waha/ping] Error:', error.message);
        return NextResponse.json({ error: 'Internal Server Error during ping test.' }, { status: 500 });
    }
}
