
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/analytics";
import { FactoryData } from "../types";
import { getFactoryData as getDefaultData } from "./database";

// --- 1. Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBSnnhiHdlsb1ZxgwG_hxAMNrTGYi4ge4Y",
  authDomain: "ct-plastic.firebaseapp.com",
  projectId: "ct-plastic",
  storageBucket: "ct-plastic.firebasestorage.app",
  messagingSenderId: "511879881850",
  appId: "1:511879881850:web:eb7c3ba032768db193c7c3",
  measurementId: "G-4PDR78NMBC"
};

// --- 2. Initialize Firebase ---
const app = !firebase.apps.length 
  ? firebase.initializeApp(firebaseConfig) 
  : firebase.app();

const db = firebase.firestore(app);

// Enable Offline Persistence (Best effort)
// Note: synchronizeTabs: true can cause "Write stream exhausted" errors if tabs fight for the lock. 
// We disable it to be safe and prevent overloading the client-side queue.
db.enablePersistence({ synchronizeTabs: false }).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open.');
    } else if (err.code === 'unimplemented') {
        console.warn('Persistence not supported by browser.');
    }
});

// Collection 'factory' -> Document 'main_data'
const DATA_DOC_REF = db.collection("factory").doc("main_data");

// --- Helper: Deep Sanitize Data ---
export const sanitizeData = (data: any): any => {
    const seen = new WeakSet();
    const visit = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return obj.toISOString();
        if (seen.has(obj)) return null;
        if (obj.nodeType || obj instanceof Element) return null;

        const constr = obj.constructor;
        const isArray = Array.isArray(obj);
        const isPlain = !constr || constr.name === 'Object';
        
        if (!isArray && !isPlain) return null;

        seen.add(obj);

        if (isArray) {
            const copy = [];
            for (let i = 0; i < obj.length; i++) {
                const val = visit(obj[i]);
                if (val !== undefined) copy.push(val);
            }
            seen.delete(obj); 
            return copy;
        } else {
            const copy: any = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    if (key.startsWith('_') || key.startsWith('$')) continue;
                    const val = visit(obj[key]);
                    if (val !== undefined) copy[key] = val;
                }
            }
            seen.delete(obj);
            return copy;
        }
    };
    return visit(data);
};

// --- 3. Service Functions ---

// Fetch Data with Timeout for Offline Support
export const fetchFactoryData = async (): Promise<FactoryData> => {
  // Create a timeout promise (2 seconds)
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Connection timeout")), 2000)
  );

  try {
    // Race Firestore against timeout
    const docSnap: any = await Promise.race([DATA_DOC_REF.get(), timeout]);
    
    if (docSnap.exists) {
      console.log("✅ Document data loaded from Firebase!");
      const rawData = docSnap.data();
      return sanitizeData(rawData) as FactoryData;
    } else {
      console.log("⚠️ No cloud data found! Initializing with default data...");
      const defaultData = getDefaultData();
      return defaultData;
    }
  } catch (error) {
    // If we time out or fail to connect, explicitly throw so App.tsx can handle it
    console.warn("⚠️ Firebase offline or unreachable. Switching to local mode.");
    throw new Error("Offline");
  }
};

// --- Debounced Save Logic ---
// Prevents "Write stream exhausted" errors by coalescing rapid updates into a single write.

let pendingSave: { data: any, resolve: () => void, reject: (e: any) => void } | null = null;
let saveTimer: any = null;

const executeSave = async () => {
  if (!pendingSave) return;
  
  const { data, resolve } = pendingSave;
  pendingSave = null; // Clear pending so new ones can queue
  
  try {
    await DATA_DOC_REF.set(data);
    console.log("✅ Cloud Sync Complete");
    resolve();
  } catch (error) {
    console.warn("❌ Cloud Sync Failed (likely offline/throttled):", error);
    // Resolve anyway to prevent blocking the UI; the data is safely in local state
    resolve(); 
  }
};

// Save Data (Debounced)
export const saveFactoryData = async (data: FactoryData): Promise<void> => {
  const cleanData = sanitizeData(data);
  const finalData = JSON.parse(JSON.stringify(cleanData));

  return new Promise((resolve, reject) => {
    // If there is a pending save waiting to fire, resolve it immediately (skip it)
    // effectively replacing it with this newer data.
    if (pendingSave) {
        pendingSave.resolve();
    }

    pendingSave = { data: finalData, resolve, reject };

    // Reset timer
    if (saveTimer) clearTimeout(saveTimer);
    
    // Wait 3 seconds (increased from 2s) to be safer against write exhaustion
    saveTimer = setTimeout(executeSave, 3000);
  });
};
