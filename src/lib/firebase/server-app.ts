import { getApps, initializeApp, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getFunctions } from 'firebase-admin/functions';
// Since we're using ES modules, we need to import the JSON file with an assertion
import serviceAccount from '../../../service-account.json' assert { type: "json" };

const PROJECT_ID = serviceAccount.project_id;
const BUCKET_NAME = `${PROJECT_ID}.appspot.com`;

const app =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert(serviceAccount),
        storageBucket: BUCKET_NAME,
      });

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
