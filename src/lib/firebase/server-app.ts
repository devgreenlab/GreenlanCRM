import { getApps, initializeApp, getApp, App } from 'firebase-admin/app';
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

  // Explicitly set the projectId to match the frontend configuration.
  // This overrides any project ID discovered from the server's environment
  // or service account, resolving the "project mismatch" error.
  return initializeApp({
    projectId: 'monospace-4',
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

export function getBackendFirebaseProjectId(): string | null {
    try {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccountJson) {
            const serviceAccount = JSON.parse(serviceAccountJson);
            return serviceAccount.project_id || null;
        }
        
        // Fallback to the initialized app's project ID if the env var isn't set/parsed
        const adminApp = getAdminApp();
        return adminApp.options.projectId || null;
    } catch (error) {
        console.error("Could not determine backend Firebase Project ID:", error);
        return null;
    }
}
