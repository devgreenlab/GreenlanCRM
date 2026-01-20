import { getApps, initializeApp, getApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getFunctions } from 'firebase-admin/functions';
import { firebaseConfig } from '@/firebase/config';

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // Explicitly initialize with the projectId from the client config
  // to ensure alignment between client and server environments.
  // The Admin SDK will automatically discover other credentials from the environment.
  return initializeApp({
    projectId: firebaseConfig.projectId,
  });
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

    