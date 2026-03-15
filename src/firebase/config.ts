/**
 * @file firebase/config.ts
 * Firebase initialization — reads credentials from VITE_ environment variables.
 *
 * If VITE_FIREBASE_DATABASE_URL is not set (local dev / test env),
 * `db` is exported as null and all room functions degrade gracefully.
 *
 * See /docs/FIREBASE.md for environment variable setup instructions.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

let db: Database | null = null;

if (import.meta.env.VITE_FIREBASE_DATABASE_URL) {
  try {
    // Avoid duplicate app initialization in HMR environments
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getDatabase(app);
  } catch {
    // Firebase not configured — offline/dev mode
    console.warn('[Firebase] Initialization failed — running in offline mode.');
  }
}

export { db };
