// firebase.ts  (or .js if you prefer)

/* ------------------------------------------------------- */
/*            Core Firebase services you already use        */
import { initializeApp } from 'firebase/app';
import { getAuth }        from 'firebase/auth';
import { getFirestore }   from 'firebase/firestore';

/* -------------------  NEW: Firebase AI  ------------------ */
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend          // provides the Gemini endpoint
} from 'firebase/ai';      // requires firebase v10.8.0+

/* ------------------------------------------------------- */
/*                   Your project config                    */
const firebaseConfig = {
  apiKey:            'AIzaSyAzwhmYOTh-Z0we8ktl0p-cdvg83V-RpmY',
  authDomain:        'swaphub-d9f7f.firebaseapp.com',   // <- fixed suffix
  projectId:         'swaphub-d9f7f',
  storageBucket:     'swaphub-d9f7f.appspot.com',       // <- fixed suffix
  messagingSenderId: '603767684947',
  appId:             '1:603767684947:web:1ebe5a07bf6e6af6f3aba6',
  measurementId:     'G-0ZTM03ZJ77'
};

/* ------------------------------------------------------- */
/*                   Initialize Firebase                    */
const app = initializeApp(firebaseConfig);

/* Export the services you already use */
export const firebase_app  = app;
export const firebase_auth = getAuth(app);
export const firebase_db   = getFirestore(app);

/* ------------------------------------------------------- */
/*            Initialize Gemini (Firebase AI)               */
const ai = getAI(app, {
  backend: new GoogleAIBackend()        // ← points to Gemini servers
});

/* Pick whichever public Gemini model you want */
export const geminiModel = getGenerativeModel(ai, {
  model: 'gemini-1.5-flash'             // ‘flash’ is fast & free-tier eligible
});

/* ------------------------------------------------------- */


