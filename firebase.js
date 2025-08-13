import { initializeApp } from 'firebase/app';
import { getAuth }        from 'firebase/auth';
import { getFirestore }   from 'firebase/firestore';

// Firebase AI
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend          
} from 'firebase/ai';     

const firebaseConfig = {
  apiKey:            'AIzaSyAzwhmYOTh-Z0we8ktl0p-cdvg83V-RpmY',
  authDomain:        'swaphub-d9f7f.firebaseapp.com',  
  projectId:         'swaphub-d9f7f',
  storageBucket:     'swaphub-d9f7f.appspot.com',     
  messagingSenderId: '603767684947',
  appId:             '1:603767684947:web:1ebe5a07bf6e6af6f3aba6',
  measurementId:     'G-0ZTM03ZJ77'
};

const app = initializeApp(firebaseConfig);

export const firebase_app  = app;
export const firebase_auth = getAuth(app);
export const firebase_db   = getFirestore(app);

const ai = getAI(app, {
  backend: new GoogleAIBackend()       
});

export const geminiModel = getGenerativeModel(ai, {
  model: 'gemini-1.5-flash'             
});



