// src/app/api/webhooks/waha/route.ts
import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/server/firebase-admin';
import { FieldValue, Timestamp, query, where, limit } from 'firebase-admin/firestore';
import type { Lead, UserProfile } from '@/lib/firestore/types';

// This is a simplified, non-secure way to verify webhooks for this prototype.
// In production, use a more robust method like HMAC signature verification.
async function verifyWebhookSecret(request: Request): Promise<boolean> {
    const db = getAdminFirestore();
    const settingsDoc = await db.collection('integrations').doc('settings').get();
    const storedSecret = settingsDoc.data()?.secrets?.crmWebhookSecret;
    
    const requestSecret = request.headers.get('X-WAHA-SECRET');

    // If no secret is configured in the CRM, allow the request to proceed.
    if (!storedSecret) {
        console.warn('CRM Webhook Secret is not configured. Skipping verification.');
        return true;
    }

    return storedSecret === requestSecret;
}


export async function POST(request: Request) {
    try {
        // 1. Verify the webhook source
        const isVerified = await verifyWebhookSecret(request);
        if (!isVerified) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await request.json();
        
        // 2. We only care about incoming text messages for now.
        if (payload.event !== 'message' || !payload.payload?.body) {
            return NextResponse.json({ success: true, message: 'Event ignored.' });
        }

        const { from, body: text, timestamp } = payload.payload;
        const session = payload.session;
        const chatId = from; // The customer's WhatsApp ID (e.g., 62812...@c.us)

        if (!session || !chatId || !text) {
             return NextResponse.json({ error: 'Missing required fields in payload.' }, { status: 400 });
        }

        const db = getAdminFirestore();
        const batch = db.batch();

        // 3. Find the sales agent by their WAHA session
        const usersRef = db.collection('users');
        const userQuery = query(usersRef, where('wahaSession', '==', session), limit(1));
        const userSnapshot = await userQuery.get();

        if (userSnapshot.empty) {
            console.error(`No user found for WAHA session: ${session}`);
            // Still return 200 to prevent WAHA from retrying.
            return NextResponse.json({ error: `No user found for session ${session}` });
        }
        
        const userDoc = userSnapshot.docs[0];
        const user = { id: userDoc.id, ...userDoc.data() } as UserProfile;
        const userRef = userDoc.ref;

        // 4. Find or create the lead associated with this chat
        const leadsRef = db.collection('leads');
        const leadQuery = query(leadsRef, where('chatId', '==', chatId), limit(1));
        const leadSnapshot = await leadQuery.get();
        
        let leadRef;
        let leadData: Partial<Lead>;

        if (leadSnapshot.empty) {
            // Lead doesn't exist, create a new one
            leadRef = leadsRef.doc(); // Create a new ref
            leadData = {
                ownerUid: userRef.id,
                teamId: user.teamId,
                source: 'whatsapp',
                customerName: payload.payload.pushName || chatId.split('@')[0], // Use pushName or derive from ID
                phone: chatId.split('@')[0],
                chatId: chatId,
                wahaSession: session,
                stage: 'new', // Default stage for new leads
                createdAt: FieldValue.serverTimestamp(),
            };
        } else {
            // Lead exists, get its reference
            leadRef = leadSnapshot.docs[0].ref;
            leadData = {}; // No need to create, just update
        }
        
        // 5. Add the incoming message to the subcollection
        const messageRef = leadRef.collection('messages').doc();
        batch.set(messageRef, {
            direction: 'in',
            text: text,
            session: session,
            timestamp: Timestamp.fromMillis(timestamp * 1000), // WAHA timestamp is in seconds
            raw: payload, // Store the raw event for debugging
        });

        // 6. Update the lead document with the latest message info
        const leadUpdatePayload = {
            ...leadData,
            lastMessagePreview: text,
            lastMessageAt: Timestamp.fromMillis(timestamp * 1000),
            updatedAt: FieldValue.serverTimestamp(),
            // Optionally, increment unread count here
            // unreadCount: FieldValue.increment(1),
        };
        batch.set(leadRef, leadUpdatePayload, { merge: true });

        // 7. Commit all batched writes
        await batch.commit();

        return NextResponse.json({ success: true, message: 'Message processed.' });

    } catch (error: any) {
        console.error('Error processing WAHA webhook:', error);
        // Return a 500 error but WAHA might retry, so logging is key.
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

    