// src/lib/server/auth-utils.ts
import { getAdminServices } from '@/lib/firebase/server-app';
import type { UserProfile } from '../firestore/types';

export class AuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'AuthError';
        this.status = status;
    }
}

async function verifyTokenAndGetUser(request: Request): Promise<{ uid: string }> {
    const authHeader = request.headers.get('authorization') || '';

    const startsWithBearer = /^Bearer\s+/i.test(authHeader);
    
    if (!startsWithBearer) {
        const errorMsg = 'Unauthorized: Authorization header format must be "Bearer <token>".';
        console.warn(`Auth verification failed: ${errorMsg}`);
        throw new AuthError(errorMsg, 401);
    }
    
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    
    console.log(`Auth verification attempt: Header starts with 'Bearer ': ${startsWithBearer}, Token length: ${token.length}`);

    if (!token) {
        const errorMsg = 'Unauthorized: Missing or invalid Authorization header. Token is missing.';
        console.warn(`Auth verification failed: ${errorMsg}`);
        throw new AuthError(errorMsg, 401);
    }

    try {
        const decodedToken = await getAdminServices().auth.verifyIdToken(token);
        return { uid: decodedToken.uid };
    } catch (error: any) {
        console.error("Token verification failed:", error.message);
        throw new AuthError(`Forbidden: Invalid authentication token. Reason: ${error.code || error.message}`, 403);
    }
}


/**
 * Verifies the Firebase Auth ID token from an incoming request and checks if the user is a SUPER_ADMIN.
 * Throws an AuthError if authentication or authorization fails.
 * @param request The incoming Request object.
 * @returns {Promise<{uid: string}>} The UID of the verified Super Admin.
 */
export async function verifySuperAdmin(request: Request): Promise<{ uid: string }> {
    const { uid } = await verifyTokenAndGetUser(request);

    const db = getAdminServices().firestore;
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists || userDoc.data()?.role !== 'SUPER_ADMIN') {
        throw new AuthError('Forbidden: User is not a Super Admin.', 403);
    }

    return { uid };
}

/**
 * Verifies the Firebase Auth ID token and checks if the user has one of the allowed roles.
 * @param request The incoming Request object.
 * @param allowedRoles An array of roles that are allowed to access the endpoint.
 * @returns {Promise<UserProfile>} The full user profile of the authenticated user.
 */
export async function verifyAuthenticatedUser(request: Request, allowedRoles: UserProfile['role'][]): Promise<UserProfile> {
    const { uid } = await verifyTokenAndGetUser(request);
    
    const db = getAdminServices().firestore;
    const userDocSnap = await db.collection('users').doc(uid).get();

    if (!userDocSnap.exists) {
         throw new AuthError('Forbidden: User profile not found.', 403);
    }
    
    const userProfile = { id: userDocSnap.id, ...userDocSnap.data() } as UserProfile;

    if (!userProfile.isActive) {
        throw new AuthError('Forbidden: User account is inactive.', 403);
    }

    if (!allowedRoles.includes(userProfile.role)) {
        throw new AuthError(`Forbidden: User does not have one of the required roles (${allowedRoles.join(', ')}).`, 403);
    }

    return userProfile;
}
