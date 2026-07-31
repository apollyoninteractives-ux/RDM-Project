import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCLa46YH695k6RXRHZdZmotT5wONW25Zng",
    authDomain: "rdm-project-f592c.firebaseapp.com",
    projectId: "rdm-project-f592c",
    storageBucket: "rdm-project-f592c.firebasestorage.app",
    messagingSenderId: "29229792264",
    appId: "1:29229792264:web:a406bbd881410a93ebe5bd",
    measurementId: "G-PRCZWFW3QW"
  };

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);