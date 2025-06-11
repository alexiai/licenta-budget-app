import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, addDoc, doc, onSnapshot, QuerySnapshot, DocumentData, enableIndexedDbPersistence } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    console.warn('Firebase persistence error:', err);
});

// Cache manager for Firebase data
class FirebaseCache {
    private static instance: FirebaseCache;
    private cache: { [key: string]: { data: any; timestamp: number } } = {};
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private readonly STORAGE_KEY = '@firebase_cache_';

    private constructor() {
        this.loadCacheFromStorage();
    }

    static getInstance(): FirebaseCache {
        if (!FirebaseCache.instance) {
            FirebaseCache.instance = new FirebaseCache();
        }
        return FirebaseCache.instance;
    }

    private async loadCacheFromStorage() {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith(this.STORAGE_KEY));
            for (const key of cacheKeys) {
                const data = await AsyncStorage.getItem(key);
                if (data) {
                    this.cache[key] = JSON.parse(data);
                }
            }
        } catch (error) {
            console.warn('Error loading cache:', error);
        }
    }

    private async saveToStorage(key: string, data: any) {
        try {
            await AsyncStorage.setItem(
                `${this.STORAGE_KEY}${key}`,
                JSON.stringify({ data, timestamp: Date.now() })
            );
        } catch (error) {
            console.warn('Error saving to cache:', error);
        }
    }

    async get(key: string): Promise<any | null> {
        const cached = this.cache[key];
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }
        return null;
    }

    async set(key: string, data: any) {
        this.cache[key] = { data, timestamp: Date.now() };
        await this.saveToStorage(key, data);
    }

    async invalidate(key: string) {
        delete this.cache[key];
        await AsyncStorage.removeItem(`${this.STORAGE_KEY}${key}`);
    }
}

export const firebaseCache = FirebaseCache.getInstance();

interface CachedDocument {
    id: string;
    [key: string]: any;
}

// Enhanced Firebase operations with caching
export async function getCachedCollection(collectionPath: string, userId: string) {
    const cacheKey = `${collectionPath}_${userId}`;
    const cached = await firebaseCache.get(cacheKey);
    
    if (cached) {
        return cached;
    }

    const q = query(collection(db, collectionPath), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    await firebaseCache.set(cacheKey, data);
    return data;
}

export async function addDocWithCache(collectionPath: string, data: any) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    // Optimistic update
    const cacheKey = `${collectionPath}_${userId}`;
    const cached = await firebaseCache.get(cacheKey) || [];
    const optimisticId = Date.now().toString();
    const optimisticDoc = { id: optimisticId, ...data };
    
    await firebaseCache.set(cacheKey, [...cached, optimisticDoc]);

    try {
        // Actual Firebase operation
        const docRef = await addDoc(collection(db, collectionPath), data);
        
        // Update cache with real ID
        const updatedCache = cached.map((doc: CachedDocument) => 
            doc.id === optimisticId ? { ...doc, id: docRef.id } : doc
        );
        await firebaseCache.set(cacheKey, updatedCache);
        
        return docRef;
    } catch (error) {
        // Rollback optimistic update
        await firebaseCache.set(cacheKey, cached);
        throw error;
    }
}

// Real-time updates with cache
export function subscribeToCollection(collectionPath: string, userId: string, onUpdate: (data: any[]) => void) {
    const q = query(collection(db, collectionPath), where('userId', '==', userId));
    
    return onSnapshot(q, async (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const cacheKey = `${collectionPath}_${userId}`;
        await firebaseCache.set(cacheKey, data);
        onUpdate(data);
    });
}
