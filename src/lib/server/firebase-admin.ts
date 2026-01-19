// src/lib/server/firebase-admin.ts
import * as admin from 'firebase-admin';
import { App, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // In a Google Cloud environment (like Cloud Functions or App Engine),
  // `admin.initializeApp()` without arguments will use the service account automatically.
  // For local development, you need to set the GOOGLE_APPLICATION_CREDENTIALS environment variable.
  return initializeApp();
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
