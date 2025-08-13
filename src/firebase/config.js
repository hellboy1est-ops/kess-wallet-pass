// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- Your Firebase config ---
const firebaseConfig = {
  apiKey: 'AIzaSyDtvNE8u7zHjSU31bsazMhmKiMcNTu8Chg',
  authDomain: 'loyalty-platform-80bbe.firebaseapp.com',
  projectId: 'loyalty-platform-80bbe',
  storageBucket: 'loyalty-platform-80bbe.firebasestorage.app',
  messagingSenderId: '777887813327',
  appId: '1:777887813327:web:978168900327f0c0cff1ba',
  measurementId: 'G-J2YR98JVQ5',
};

// --- Init ---
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Ensure auth persists across tab reloads
setPersistence(auth, browserLocalPersistence).catch((e) => {
  // Non-fatal: if this ever fails, Firebase falls back to in-memory
  console.warn('Auth persistence setup failed:', e?.message || e);
});

// Helper: wait once for Firebase to restore the user on page load/refresh
export const waitForAuthInit = () =>
  new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user || null);
    });
  });