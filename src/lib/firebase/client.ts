import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  type Firestore,
  type FirestoreSettings,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getClientApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

const FIRESTORE_DATABASE_ID =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID.length > 0
    ? process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID
    : "(default)";

const FIRESTORE_SETTINGS: FirestoreSettings = {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
};

function getClientFirestore(app: FirebaseApp): Firestore {
  try {
    return initializeFirestore(app, FIRESTORE_SETTINGS, FIRESTORE_DATABASE_ID);
  } catch {
    return getFirestore(app);
  }
}

const app = getClientApp();
export const db = getClientFirestore(app);
