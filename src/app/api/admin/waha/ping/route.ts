// src/app/api/admin/waha/ping/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';
import { wahaFetch } from '@/lib/server/waha';

export const runtime = 'nodejs';

/**
 * GET /api/admin/waha/ping
 * Pings the WAHA instance by checking its version endpoint.
 */
export async function GET(request: Request) {
    try {
        await verifySuperAdmin(request);

        // wahaFetch will throw an error if ENV vars are not set.
        const wahaResponse = await wahaFetch('/api/version');

        if (!wahaResponse.ok) {
            const errorText = await wahaResponse.text().catch(() => 'Could not read error response from WAHA.');
            throw new Error(`Ping failed. WAHA API responded with status ${wahaResponse.status}. Details: ${errorText}`);
        }
        
        const data = await wahaResponse.json();

        return NextResponse.json({ 
            message: `Connection to WAHA successful!`,
            ...data 
        });

    } catch (error: any) {
        // Catch AuthError first to return 401/403
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        
        // Check if the error is due to missing ENV vars from our custom wahaFetch error
        if (error.message && error.message.includes('WAHA env missing')) {
             return NextResponse.json({ error: "WAHA env missing" }, { status: 500 });
        }
        
        // For other errors (e.g., network issues, WAHA is down), return a generic error.
        console.error('[API Ping Error]', error.message);
        return NextResponse.json({ error: 'Internal Server Error during ping test.' }, { status: 500 });
    }
}
