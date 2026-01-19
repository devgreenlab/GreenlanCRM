import { getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getFunctions } from 'firebase-admin/functions';

// Firebase App Hosting provides environment variables to automatically initialize 
// the Admin SDK without needing a service account file. `initializeApp()` will
// automatically use these credentials.
const app = getApps().length > 0 ? getApp() : initializeApp();

// A helper function to get the Firebase services
export const getAuthenticatedAppForUser = () => {
  return {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app),
    functions: getFunctions(app),
  };
};
