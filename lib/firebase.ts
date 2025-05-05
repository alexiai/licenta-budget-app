import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBk2fYDleM7Ivbh6JbrRFXtUDpHBnF-ZRo",
    authDomain: "licenta-cf752.firebaseapp.com",
    projectId: "licenta-cf752",
    storageBucket: "licenta-cf752.firebasestorage.app",
    messagingSenderId: "840302280820",
    appId: "1:840302280820:web:cc73afe69bff2810aed121",
    measurementId: "G-PV664NGR40"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
