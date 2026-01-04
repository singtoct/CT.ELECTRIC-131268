
import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getFirestore,
  doc, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getDocFromCache,
  getDocFromServer,
  setDoc,
  Firestore
} from "firebase/firestore";
import { FactoryData } from "../types";
import { getFactoryData as getDefaultData } from "./database";

const firebaseConfig = {
  apiKey: "AIzaSyBSnnhiHdlsb1ZxgwG_hxAMNrTGYi4ge4Y",
  authDomain: "ct-plastic.firebaseapp.com",
  projectId: "ct-plastic",
  storageBucket: "ct-plastic.firebasestorage.app",
  messagingSenderId: "511879881850",
  appId: "1:511879881850:web:eb7c3ba032768db193c7c3",
  measurementId: "G-4PDR78NMBC"
};

// Singleton App Instance
// We wrap this in a try-catch to prevent immediate crash if Firebase SDK fails to load entirely
let app: any;
try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
    console.error("Critical: Firebase App Initialization Failed", e);
}

/**
 * Robustly initialize Firestore with Graceful Degradation.
 * If initialization fails (e.g., service not available, offline, version mismatch),
 * we catch the error and leave db as null. The app will then run in Offline Mode.
 */
let db: Firestore | null = null;

if (app) {
    try {
        try {
            // Attempt 1: Initialize with persistence (preferred)
            db = initializeFirestore(app, {
              localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
              })
            });
        } catch (e: any) {
            // Attempt 2: Fallback to default instance if persistence fails or already initialized
            console.warn("Firestore: Persistence init warning (falling back to default):", e.message);
            db = getFirestore(app);
        }
    } catch (criticalError: any) {
        // Critical Failure: Service unavailable or module error.
        console.error("Critical: Firestore service unavailable. App starting in OFFLINE mode.", criticalError);
        db = null;
    }
}

const DATA_DOC_PATH = "factory/main_data";

/**
 * Robustly sanitizes data to be JSON-safe.
 */
export const sanitizeData = (data: any): any => {
    const seen = new WeakSet();

    const isPlainObject = (obj: any): boolean => {
        if (typeof obj !== 'object' || obj === null) return false;
        const proto = Object.getPrototypeOf(obj);
        return proto === Object.prototype || proto === null;
    };

    const visit = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj !== 'object') return obj;
        if (seen.has(obj)) return null;
        
        if (obj instanceof Date) return obj.toISOString();
        if (typeof obj.toDate === 'function') {
            try { return obj.toDate().toISOString(); } catch(e) { return null; }
        }

        if (Array.isArray(obj)) {
            seen.add(obj);
            return obj.map(visit);
        }
        
        if (!isPlainObject(obj)) {
            if (typeof obj.toJSON === 'function') {
                try { 
                    const json = obj.toJSON();
                    if (json === obj || typeof json !== 'object') return json;
                    return visit(json); 
                } catch (e) { return null; }
            }
            return null;
        }

        seen.add(obj);
        const copy: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (key.startsWith('_') || key.startsWith('$')) continue;
                const val = visit(obj[key]);
                if (val !== undefined) {
                    copy[key] = val;
                }
            }
        }
        return copy;
    };

    return visit(data);
};

/**
 * Fetches factory data from Firestore with an aggressive fast-fail strategy.
 * Returns default data immediately if Firestore is not initialized.
 */
export const fetchFactoryData = async (): Promise<FactoryData> => {
  // Graceful fallback if DB failed to init
  if (!db) {
      console.warn("Firestore: DB not initialized. Returning default data (Offline Mode).");
      return getDefaultData();
  }

  const docRef = doc(db, DATA_DOC_PATH);
  const isOnline = navigator.onLine;

  if (isOnline) {
    try {
      // 3s timeout for server fetch
      const serverPromise = getDocFromServer(docRef);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 3000)
      );

      const docSnap = await Promise.race([serverPromise, timeoutPromise]);
      if (docSnap.exists()) {
        return sanitizeData(docSnap.data()) as FactoryData;
      }
    } catch (error: any) {
      console.warn(`Firestore: Server fetch bypassed: ${error.message}`);
    }
  }

  // Fallback to cache
  try {
    const cachedSnap = await getDocFromCache(docRef);
    if (cachedSnap.exists()) {
      return sanitizeData(cachedSnap.data()) as FactoryData;
    }
  } catch (cacheErr: any) {
    console.warn("Firestore: Cache empty.");
  }

  return getDefaultData();
};

let saveTimer: any = null;
/**
 * Saves factory data with final sanitization before write.
 */
export const saveFactoryData = async (data: FactoryData): Promise<void> => {
  if (!db) {
      console.warn("Firestore: DB not initialized. Save skipped (Simulated success).");
      return;
  }

  const cleanData = sanitizeData(data);
  const docRef = doc(db, DATA_DOC_PATH);

  return new Promise((resolve) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        try {
            await setDoc(docRef, cleanData);
            console.log("Firestore: Saved locally (Sync in background)");
        } catch (e: any) {
            console.error("Firestore Error: Write failed", e.message);
        }
        resolve();
    }, 2000);
  });
};
