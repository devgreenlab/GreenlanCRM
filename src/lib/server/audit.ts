// src/lib/server/audit.ts
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from './firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../firestore/collections';

type AuditLogPayload = {
    action: 'SAVE_INTEGRATION_SETTINGS' | 'SET_WAHA_KEY' | 'CLEAR_WAHA_KEY' | 'TEST_WAHA_CONNECTION';
    byUid: string;
    result: 'SUCCESS' | 'FAILURE';
    message?: string;
};

/**
 * Creates an audit log entry in Firestore.
 * This function is designed to be called from server-side environments (e.g., API Routes).
 */
export async function createAuditLog(payload: AuditLogPayload): Promise<void> {
    try {
        const db = getAdminFirestore();
        const logRef = db.collection(FIRESTORE_COLLECTIONS.auditLogs).doc();
        
        await logRef.set({
            ...payload,
            at: FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // We don't re-throw the error to prevent it from crashing the parent operation.
        // Logging the failure is sufficient.
    }
}
