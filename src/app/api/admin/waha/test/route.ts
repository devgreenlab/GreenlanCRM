// src/app/api/admin/waha/test/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';
import { createAuditLog } from '@/lib/server/audit';
import { wahaFetch } from '@/lib/server/waha';

export const runtime = 'nodejs';

/**
 * POST /api/admin/waha/test
 * Tests the connection to the configured WAHA instance.
 */
export async function POST(request: Request) {
    let userUid: string;
    try {
        const { uid } = await verifySuperAdmin(request);
        userUid = uid;

        // Using wahaFetch handles getting config and auth automatically
        const response = await wahaFetch('/api/sessions');

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[WAHA Test] Failed with status ${response.status}: ${errorBody}`);
            throw new Error(`Connection test failed. WAHA API responded with status ${response.status}.`);
        }
        
        const data = await response.json();
        const sessionCount = Array.isArray(data) ? data.length : 0;

        await createAuditLog({
            action: 'TEST_WAHA_CONNECTION',
            byUid: uid,
            result: 'SUCCESS',
            message: `Successfully connected to WAHA. Found ${sessionCount} sessions.`,
        });

        return NextResponse.json({ 
            message: `Connection to WAHA successful! Found ${sessionCount} active sessions.` 
        });

    } catch (error: any) {
        const message = error.message || 'An unknown error occurred during the connection test.';
        if (userUid!) {
            await createAuditLog({
                action: 'TEST_WAHA_CONNECTION',
                byUid: userUid,
                result: 'FAILURE',
                message,
            });
        }
        if (error instanceof AuthError) {
            return NextResponse.json({ error: message }, { status: error.status });
        }
        console.error('Error testing WAHA connection:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
    