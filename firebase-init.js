// public/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js"; 
const firebaseConfig = {
  apiKey: "AIzaSyB_2gMKzZuOtATxu-KIjcsTKq26DMEcXbA",
  authDomain: "pos-miscelanea.firebaseapp.com",
  projectId: "pos-miscelanea",
  storageBucket: "pos-miscelanea.firebasestorage.app",
  messagingSenderId: "1078315527152",
  appId: "1:1078315527152:web:99063a9619e13921a08b35",
  measurementId: "G-1YJJQV5LVY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Exportamos 'db' para usarlo en otros scripts
export { db, auth, storage};
