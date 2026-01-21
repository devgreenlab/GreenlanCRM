// src/app/api/webhooks/waha/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getAdminServices } from '@/lib/firebase/server-app';
import { collection, query, where, getDocs, FieldValue, Timestamp, doc, runTransaction } from 'firebase-admin/firestore';
import { createAuditLog } from '@/lib/server/audit';

export const runtime = 'nodejs';

/**
 * Validates the incoming webhook request using a secret from environment variables.
 * Supports checking both a header (X-WAHA-SECRET) and a query parameter (token).
 * @param request The NextRequest object.
 * @returns {boolean} True if the request is valid, false otherwise.
 */
function validateWebhookSecret(request: NextRequest): boolean {
    const webhookSecret = process.env.WAHA_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn('WAHA_WEBHOOK_SECRET is not set on the server. Cannot validate incoming webhooks. Denying request.');
        return false;
    }

    const headerSecret = request.headers.get('X-WAHA-SECRET');
    const querySecret = request.nextUrl.searchParams.get('token');

    if (headerSecret === webhookSecret || querySecret === webhookSecret) {
        return true;
    }

    console.warn('Webhook validation failed: Invalid or missing secret.');
    return false;
}


/**
 * POST /api/webhooks/waha
 * Receives webhook events from a WAHA instance, creating leads if they don't exist.
 */
export async function POST(request: NextRequest) {
    if (!validateWebhookSecret(request)) {
        // Return 401 Unauthorized but without any details.
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: any;
    let rawBodyText: string = '';
    const { firestore: db } = getAdminServices();

    try {
        payload = await request.json();
        rawBodyText = JSON.stringify(payload);

        // Ignore non-message events
        if (payload.event !== 'message' || !payload.data) {
            return NextResponse.json({ status: 'ignored', reason: `Event type is '${payload.event}', not 'message'.` }, { status: 200 });
        }

        const { from: chatId, body: text, timestamp, id: wahaMessageId } = payload.data;
        const session = payload.session;
        const notifyName = payload.data.notifyName;
        
        // Return 200 OK for invalid payloads to prevent WAHA from retrying
        if (!chatId || typeof text === 'undefined' || !timestamp || !session || !wahaMessageId) {
             console.warn(`Ignoring message with incomplete data: ${rawBodyText}`);
             return NextResponse.json({ status: 'ignored', reason: 'Missing required message data (chatId, text, timestamp, session, id).' }, { status: 200 });
        }

        await createAuditLog({
            action: 'INBOUND_WA_RECEIVED',
            byUid: 'system',
            result: 'SUCCESS',
            message: `Received message ${wahaMessageId} from ${chatId} via session ${session}.`
        });

        // Use a transaction to safely create/update lead and add message
        await runTransaction(db, async (transaction) => {
            const leadsRef = collection(db, 'leads');
            const q = query(leadsRef, where('chatId', '==', chatId), where('wahaSession', '==', session));
            const leadSnapshot = await transaction.get(q);

            let leadRef: FirebaseFirestore.DocumentReference;
            let leadExists = !leadSnapshot.empty;
            
            if (leadExists) {
                leadRef = leadSnapshot.docs[0].ref;
            } else {
                leadRef = doc(collection(db, 'leads')); // Create a new document reference
            }

            // De-duplication check: Use wahaMessageId as the Firestore document ID for the message.
            const messageRef = leadRef.collection('messages').doc(wahaMessageId);
            const messageDoc = await transaction.get(messageRef);
            if (messageDoc.exists) {
                console.log(`Duplicate message ID ${wahaMessageId} for lead ${leadRef.id}. Skipping.`);
                return; // Exit transaction, message already processed
            }

            if (!leadExists) {
                // --- CREATE NEW LEAD ---
                const usersRef = collection(db, 'users');
                const userQuery = query(usersRef, where('wahaSession', '==', session), where('role', '==', 'SALES'));
                // Use non-transactional getDocs inside a transaction for reads that don't depend on transactional writes.
                const userSnapshot = await getDocs(userQuery); 

                if (userSnapshot.empty) {
                    throw new Error(`No active sales user found for WAHA session '${session}'. Cannot create lead.`);
                }
                const salesUser = userSnapshot.docs[0].data();
                const ownerUid = userSnapshot.docs[0].id;
                const teamId = salesUser.teamId;

                transaction.set(leadRef, {
                    ownerUid: ownerUid,
                    teamId: teamId,
                    source: 'whatsapp',
                    customerName: notifyName || chatId.split('@')[0],
                    phone: chatId.split('@')[0],
                    chatId: chatId,
                    wahaSession: session,
                    stage: 'new', // Default stage for new leads
                    lastMessageAt: Timestamp.fromMillis(timestamp * 1000),
                    lastMessagePreview: text.substring(0, 100),
                    unreadCount: 1,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            } else {
                // --- UPDATE EXISTING LEAD ---
                transaction.update(leadRef, {
                    lastMessageAt: Timestamp.fromMillis(timestamp * 1000),
                    lastMessagePreview: text.substring(0, 100),
                    unreadCount: FieldValue.increment(1),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }

            // Save the new message
            transaction.set(messageRef, {
                direction: 'in',
                text: text,
                session: session,
                timestamp: Timestamp.fromMillis(timestamp * 1000),
                status: 'delivered',
                raw: payload.data
            });
        });

        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error('Webhook processing error:', error);
        await createAuditLog({
            action: 'INBOUND_WA_FAILED',
            byUid: 'system',
            result: 'FAILURE',
            message: `Webhook processing error: ${error.message}. Raw Body: ${rawBodyText || 'Could not read body'}`,
        });
        // Return 200 OK even on error to prevent WAHA from retrying and causing a loop.
        // The error is logged for debugging.
        return NextResponse.json({ error: 'Internal processing error' }, { status: 200 });
    }
}
