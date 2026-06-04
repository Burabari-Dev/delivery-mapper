import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA-3xXkbRU3J7Iacp3of7eE2GpLP0-_hs4",
  authDomain: "deliverymapper.firebaseapp.com",
  projectId: "deliverymapper",
  storageBucket: "deliverymapper.firebasestorage.app",
  messagingSenderId: "213121561745",
  appId: "1:213121561745:web:e0443c0727cc7a673bbb30",
  measurementId: "G-P5QER5JP8L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
