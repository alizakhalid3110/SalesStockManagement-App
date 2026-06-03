// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDEyyfg3jGoZqnAq_D1jpGtNZDPvO5c2u4",
  authDomain: "fertilizer-25cf6.firebaseapp.com",
  projectId: "fertilizer-25cf6",
  storageBucket: "fertilizer-25cf6.firebasestorage.app",
  messagingSenderId: "491777358162",
  appId: "1:491777358162:web:0b7cad579662ece88c228b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

// 🔥 OFFLINE SUPPORT (VERY IMPORTANT)
enableIndexedDbPersistence(db).catch((err) => {
  // agar multiple tabs ya already enabled ho
  console.log("Firestore persistence error:", err.code);
});