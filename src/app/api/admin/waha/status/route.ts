// src/app/api/admin/waha/status/route.ts
import { NextResponse } from 'next/server';
import { verifySuperAdmin, AuthError } from '@/lib/server/auth-utils';
import { wahaFetch } from '@/lib/server/waha';

export const runtime = 'nodejs';

/**
 * GET /api/admin/waha/status
 * Fetches the status for a given session, including QR code if needed.
 */
export async function GET(request: Request) {
    try {
        await verifySuperAdmin(request);
        
        const { searchParams } = new URL(request.url);
        const session = searchParams.get('session');

        if (!session) {
            return NextResponse.json({ error: 'The "session" query parameter is required.' }, { status: 400 });
        }

        // First, get the general status of the session
        const statusResponse = await wahaFetch(`/api/sessions/${session}`);
        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
             return NextResponse.json(statusData, { status: statusResponse.status });
        }
        
        // If status is SCAN_QR_CODE, fetch the QR image
        if (statusData.status === 'SCAN_QR_CODE') {
            const qrResponse = await wahaFetch(`/api/${session}/auth/qr?format=image`);
            
            if (!qrResponse.ok) {
                 // Return the general status even if QR fails, but log the error
                 console.error(`Failed to fetch QR for session ${session}. Status: ${qrResponse.status}`);
                 return NextResponse.json(statusData, { status: 200 });
            }

            const qrData = await qrResponse.json();
            
            return NextResponse.json({
                status: 'SCAN_QR_CODE',
                qrCode: qrData.qr, // The QR code is in the 'qr' field as base64
            });
        }

        // For all other statuses, just return the status data
        return NextResponse.json(statusData);

    } catch (error: any) {
        if (error.name === 'AuthError') {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[API /admin/waha/status] Error:', error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
