import { getApps, initializeApp, getApp, App, credential } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getFunctions } from 'firebase-admin/functions';

const ADMIN_APP_NAME = 'greenlab-crm-admin';

function getAdminApp(): App {
  // Check if the named app already exists to prevent re-initialization.
  const existingApp = getApps().find(app => app.name === ADMIN_APP_NAME);
  if (existingApp) {
    return existingApp;
  }

  // This is a more forceful method to ensure the correct project ID is used.
  // It attempts to modify the service account from the environment in memory before initializing.
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      // Explicitly override the project_id to match the frontend.
      serviceAccount.project_id = 'studio-7786152721-d1bea';
      
      return initializeApp({
        credential: credential.cert(serviceAccount),
        // We also specify the projectId here for good measure.
        projectId: 'studio-7786152721-d1bea',
      }, ADMIN_APP_NAME);
    }
  } catch (error) {
      console.error("Could not initialize admin app with modified service account, falling back.", error);
  }

  // Fallback to the previous method if the environment variable is not available or fails parsing.
  // This explicitly sets the project ID for the Admin SDK.
  return initializeApp({
    projectId: 'studio-7786152721-d1bea',
  }, ADMIN_APP_NAME);
}

// A helper function to get the Firebase admin services
export const getAdminServices = () => {
  const app = getAdminApp();
  return {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app),
    functions: getFunctions(app),
  };
};

/**
 * Safely retrieves the backend Firebase Project ID.
 * It first tries to get it from the initialized admin app's options.
 * If that fails, it attempts to parse it from the FIREBASE_SERVICE_ACCOUNT_KEY environment variable.
 * @returns {string | null} The backend Project ID or null if not found.
 */
export function getBackendFirebaseProjectId(): string | null {
    try {
        const adminApp = getAdminApp();
        const projectIdFromApp = adminApp.options.projectId;
        if (projectIdFromApp) {
            return projectIdFromApp;
        }
    } catch (e) {
        // Continue to the next method if getting the app fails
    }
    
    try {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccountJson) {
            const serviceAccount = JSON.parse(serviceAccountJson);
            return serviceAccount.project_id || null;
        }
    } catch (error) {
        console.error("Could not parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
    }
    
    return null;
}
