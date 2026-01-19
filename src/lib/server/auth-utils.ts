// src/lib/server/auth-utils.ts
import { getAdminAuth, getAdminFirestore } from './firebase-admin';

class AuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'AuthError';
        this.status = status;
    }
}

/**
 * Verifies the Firebase Auth ID token from an incoming request and checks if the user is a SUPER_ADMIN.
 * Throws an AuthError if authentication or authorization fails.
 * @param request The incoming Request object.
 * @returns {Promise<{uid: string}>} The UID of the verified Super Admin.
 */
export async function verifySuperAdmin(request: Request): Promise<{ uid: string }> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthError('Unauthorized: Missing or invalid Authorization header.', 401);
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
        throw new AuthError('Unauthorized: Token is missing.', 401);
    }

    let decodedToken;
    try {
        decodedToken = await getAdminAuth().verifyIdToken(idToken);
    } catch (error) {
        console.error("Token verification failed:", error);
        throw new AuthError('Forbidden: Invalid authentication token.', 403);
    }

    const uid = decodedToken.uid;
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists || userDoc.data()?.role !== 'SUPER_ADMIN') {
        throw new AuthError('Forbidden: User is not a Super Admin.', 403);
    }

    return { uid };
}
