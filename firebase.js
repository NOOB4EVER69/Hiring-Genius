// ============================================================
//  PASTE YOUR FIREBASE CONFIG BELOW (Firebase Console →
//  Project settings → General → Your apps → Web app → Config)
// ============================================================
export const firebaseConfig = {
  apiKey: "AIzaSyCXmeM21iH7f0ISI46efVzxbNsHXLKzAYw",
  authDomain: "hire-3feea.firebaseapp.com",
  projectId: "hire-3feea",
  storageBucket: "hire-3feea.firebasestorage.app",
  messagingSenderId: "563248467494",
  appId: "1:563248467494:web:c792c22d7632e13a1820e7"
};
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
