import { Platform } from 'react-native';
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, type Persistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import AsyncStorage from "@react-native-async-storage/async-storage";

const configured = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(
    configured.apiKey && configured.authDomain && configured.projectId && configured.appId
);

// Allow the welcome and sign-in screens to load before local configuration is available.
const firebaseConfig = firebaseConfigured ? configured : {
    apiKey: 'local-config-required',
    projectId: 'demo-bunnybuddy',
    appId: 'local-config-required',
};

const app = initializeApp(firebaseConfig);

function initializeBunnyAuth() {
    if (Platform.OS === 'web') return getAuth(app);
    const nativeAuth = require('firebase/auth') as {
        getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
    };
    return nativeAuth.getReactNativePersistence
        ? initializeAuth(app, { persistence: nativeAuth.getReactNativePersistence(AsyncStorage) })
        : getAuth(app);
}

export const auth = initializeBunnyAuth();
export const db = initializeFirestore(app,
    typeof indexedDB === 'undefined' ? {} : { localCache: persistentLocalCache() }
);
