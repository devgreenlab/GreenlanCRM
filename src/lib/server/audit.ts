// src/lib/server/audit.ts
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminServices } from '@/lib/firebase/server-app';
import { FIRESTORE_COLLECTIONS } from '../firestore/collections';
import type { AuditLog } from '../firestore/types';

/**
 * Creates an audit log entry in Firestore.
 * This function is designed to be called from server-side environments (e.g., API Routes).
 */
export async function createAuditLog(payload: Omit<AuditLog, 'id' | 'at'>): Promise<void> {
    try {
        const { firestore: db } = getAdminServices();
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
    