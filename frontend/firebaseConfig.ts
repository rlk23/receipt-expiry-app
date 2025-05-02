// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAf3dH4NbySUO0tft5Yl49F5BtFVer4Eb0",
  authDomain: "receipt-expiry-app.firebaseapp.com",
  projectId: "receipt-expiry-app",
  storageBucket: "receipt-expiry-app.firebasestorage.app",
  messagingSenderId: "703458339510",
  appId: "1:703458339510:web:f03f38dcbbb56e86095417",
  measurementId: "G-3W2KQKT84M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
