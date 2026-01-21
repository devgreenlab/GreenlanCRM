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

  // For managed environments like Firebase App Hosting, initializing with an
  // empty object allows the SDK to automatically discover credentials and project
  // configuration, which is a more robust method.
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
