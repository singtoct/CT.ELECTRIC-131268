
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
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    console.debug('Firebase persistence disabled:', err.code);
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

// Save Data
export const saveFactoryData = async (data: FactoryData): Promise<void> => {
  try {
    const cleanData = sanitizeData(data);
    const finalData = JSON.parse(JSON.stringify(cleanData));
    // We don't await this if we want optimistic UI updates, but here we wait to confirm save
    await DATA_DOC_REF.set(finalData);
  } catch (error) {
    console.warn("❌ Error writing document (likely offline): ", error);
    // Don't throw here to prevent disrupting the UI
  }
};
