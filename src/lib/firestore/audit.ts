import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuthenticatedAppForUser } from '@/lib/firebase/server-app';
import { FIRESTORE_COLLECTIONS } from './collections';
import type { AuditLog } from './types';

// This function must be called from the server-side (e.g., API routes)
export async function createAuditLog(
    logData: Omit<AuditLog, 'id' | 'at'>
) {
    try {
        const { firestore } = getAuthenticatedAppForUser();
        const auditLogsRef = collection(firestore, FIRESTORE_COLLECTIONS.auditLogs);

        await addDoc(auditLogsRef, {
            ...logData,
            at: serverTimestamp(),
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
        // Depending on requirements, you might want to throw the error
        // or handle it silently. For now, we'll just log it to the server console.
    }
}
