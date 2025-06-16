// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Add other imports as needed

// Your web app's  configuration
const Config = {
  apiKey: "AIzaSyAzwhmYOTh-Z0we8ktl0p-cdvg83V-RpmY",
  authDomain: "swaphub-d9f7f.app.com",
  projectId: "swaphub-d9f7f",
  storageBucket: "swaphub-d9f7f.storage.app",
  messagingSenderId: "603767684947",
  appId: "1:603767684947:web:1ebe5a07bf6e6af6f3aba6",
  measurementId: "G-0ZTM03ZJ77"
};

// Initialize 
export const firebase_app = initializeApp(Config);

// Optionally export services you need
export const firebase_auth = getAuth(firebase_app);

export const firebase_db = getFirestore(firebase_app);

