// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDtvNE8u7zHjSU31bsazMhmKiMcNTu8Chg",
  authDomain: "loyalty-platform-80bbe.firebaseapp.com",
  projectId: "loyalty-platform-80bbe",
  storageBucket: "loyalty-platform-80bbe.firebasestorage.app",
  messagingSenderId: "777887813327",
  appId: "1:777887813327:web:978168900327f0c0cff1ba",
  measurementId: "G-J2YR98JVQ5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);