import { getApps, initializeApp, getApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getFunctions } from 'firebase-admin/functions';

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // Initialize without arguments to let the Admin SDK auto-discover
  // credentials and configuration from the App Hosting environment.
  // This is the most reliable way to ensure client and server auth are aligned.
  return initializeApp();
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
