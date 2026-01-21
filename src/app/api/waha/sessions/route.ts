// src/app/api/waha/sessions/route.ts
import { NextResponse } from 'next/server';
import { verifyAuthenticatedUser, AuthError } from '@/lib/server/auth-utils';
import { wahaFetch } from '@/lib/server/waha';

export const runtime = 'nodejs';

/**
 * GET /api/waha/sessions
 * Proxies the request to the WAHA /api/sessions endpoint.
 * Applies role-based filtering.
 */
export async function GET(request: Request) {
    try {
        const user = await verifyAuthenticatedUser(request, ['SUPER_ADMIN', 'HEAD_SALES', 'SALES']);
        
        const response = await wahaFetch('/api/sessions');

        if (!response.ok) {
            const errorText = await response.text();
             try {
                const errorJson = JSON.parse(errorText);
                return NextResponse.json({ error: errorJson.error || 'Failed to fetch sessions from WAHA.' }, { status: response.status });
            } catch {
                return NextResponse.json({ error: errorText }, { status: response.status });
            }
        }
        
        const sessions = await response.json();

        // SUPER_ADMIN and HEAD_SALES can see all sessions
        if (user.role === 'SUPER_ADMIN' || user.role === 'HEAD_SALES') {
            return NextResponse.json(sessions);
        }

        // SALES role can only see their own assigned session
        if (user.role === 'SALES') {
            if (!user.wahaSession) {
                return NextResponse.json([]); // Return empty array if sales user has no session assigned
            }
            const userSession = sessions.find((s: any) => s.name === user.wahaSession);
            return NextResponse.json(userSession ? [userSession] : []);
        }

        // Should not be reached if roles are correctly handled
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[API /waha/sessions] Error:', error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
