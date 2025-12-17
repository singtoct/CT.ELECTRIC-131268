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
// Use compat initialization to handle potential module resolution issues
const app = !firebase.apps.length 
  ? firebase.initializeApp(firebaseConfig) 
  : firebase.app();

const db = firebase.firestore(app);
let analytics;
try {
  analytics = firebase.analytics(app);
} catch (err) {
  console.warn("Firebase Analytics failed to load", err);
}

// Enable Offline Persistence
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Firebase persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.warn('Firebase persistence not supported in this browser');
    }
});

// Collection 'factory' -> Document 'main_data'
const DATA_DOC_REF = db.collection("factory").doc("main_data");

// --- Helper: Deep Sanitize Data ---
export const sanitizeData = (data: any): any => {
    const seen = new WeakSet();
    
    const visit = (obj: any): any => {
        // 1. Pass through primitives and null
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        // 2. Handle Dates
        if (obj instanceof Date) {
            return obj.toISOString();
        }

        // 3. Cycle Detection
        if (seen.has(obj)) {
            return null; // Return null instead of undefined to keep structure but break cycle
        }

        // 4. Strict Plain Object/Array Check
        // Explicitly check for DOM nodes which often cause 'src' circular errors
        if (obj.nodeType || obj instanceof Element) {
            return null;
        }

        const constr = obj.constructor;
        const isArray = Array.isArray(obj);
        // Allow Objects with no constructor or strictly 'Object'
        const isPlain = !constr || constr.name === 'Object';
        
        // Reject custom classes (likely Firebase internal objects or unknown libs)
        if (!isArray && !isPlain) {
             return null;
        }

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
                    // Filter out private keys often used by libs
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

// Fetch Data
export const fetchFactoryData = async (): Promise<FactoryData> => {
  try {
    const docSnap = await DATA_DOC_REF.get();
    
    // In compat API, .exists is a property, not a function
    if (docSnap.exists) {
      console.log("✅ Document data loaded from Firebase!");
      const rawData = docSnap.data();
      return sanitizeData(rawData) as FactoryData;
    } else {
      console.log("⚠️ No cloud data found! Initializing with default data...");
      const defaultData = getDefaultData();
      await saveFactoryData(defaultData);
      return defaultData;
    }
  } catch (error) {
    console.error("❌ Error getting document (Offline or Permission):", error);
    throw error;
  }
};

// Save Data
export const saveFactoryData = async (data: FactoryData): Promise<void> => {
  try {
    // Robust Sanitization before saving
    const cleanData = sanitizeData(data);
    
    // Double-check with JSON stringify to ensure absolute purity
    const finalData = JSON.parse(JSON.stringify(cleanData));

    await DATA_DOC_REF.set(finalData);
    console.log("✅ Document successfully written to Firebase!");
  } catch (error) {
    console.error("❌ Error writing document: ", error);
    throw error;
  }
};