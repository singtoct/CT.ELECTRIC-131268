import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, enableIndexedDbPersistence } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app); 

// Enable Offline Persistence
// This allows the app to work if the network is flaky or offline by using cached data.
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        console.warn('Firebase persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firebase persistence not supported in this browser');
    }
});

// Collection 'factory' -> Document 'main_data'
const DATA_DOC_REF = doc(db, "factory", "main_data");

// --- Helper: Deep Sanitize Data ---
// This function recursively copies the object, removing circular references,
// DOM nodes, and non-serializable objects.
export const sanitizeData = (input: any, stack = new Set<any>()): any => {
  // 1. Null / Undefined / Primitives
  if (input === null || input === undefined || typeof input !== 'object') {
    return input;
  }

  // 2. Dates -> ISO String
  if (input instanceof Date) {
    return input.toISOString();
  }

  // 3. Cycle Detection
  if (stack.has(input)) {
    return undefined; 
  }

  // 4. Block DOM Nodes & React Events explicitly
  // 'nodeType' checks for DOM elements. 'nativeEvent' checks for React Events.
  if (input.nodeType || (input.nativeEvent && input.preventDefault)) {
    return undefined;
  }

  // 5. Strict Type Checking
  const tag = Object.prototype.toString.call(input);
  const isArray = tag === '[object Array]';
  const isPlainObject = tag === '[object Object]';

  // Reject Map, Set, WeakMap, HTML...Element, Window, etc.
  if (!isArray && !isPlainObject) {
    return undefined;
  }

  // 6. Block Class Instances (objects that are not plain POJOs)
  if (isPlainObject) {
    const proto = Object.getPrototypeOf(input);
    // Only allow objects created via {} or new Object() or Object.create(null)
    if (proto !== null && proto !== Object.prototype) {
      return undefined;
    }
  }

  stack.add(input);
  
  let output: any;

  // 7. Recursion
  if (isArray) {
    output = [];
    for (const item of input) {
        const sanitized = sanitizeData(item, stack);
        if (sanitized !== undefined) {
            output.push(sanitized);
        }
    }
  } else {
    output = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        // Skip internal/private properties or hidden firebase props
        if (key.startsWith('_') || key.startsWith('$') || key === 'constructor' || key === '__proto__') continue;

        const value = sanitizeData(input[key], stack);
        if (value !== undefined) {
          output[key] = value;
        }
      }
    }
  }

  stack.delete(input);
  return output;
};

// --- 3. Service Functions ---

// Fetch Data
export const fetchFactoryData = async (): Promise<FactoryData> => {
  try {
    const docSnap = await getDoc(DATA_DOC_REF);
    
    if (docSnap.exists()) {
      console.log("✅ Document data loaded from Firebase!");
      const rawData = docSnap.data();
      // Sanitize data on fetch to ensure no internal objects leak into the app state
      return sanitizeData(rawData) as FactoryData;
    } else {
      console.log("⚠️ No cloud data found! Initializing with default data...");
      const defaultData = getDefaultData();
      await saveFactoryData(defaultData);
      return defaultData;
    }
  } catch (error) {
    console.error("❌ Error getting document (Offline or Permission):", error);
    // Re-throw to let App.tsx handle fallback to local data
    throw error;
  }
};

// Save Data
export const saveFactoryData = async (data: FactoryData): Promise<void> => {
  try {
    // Robust Sanitization before saving
    const cleanData = sanitizeData(data);
    
    // Double-check with JSON stringify/parse to ensure absolute purity.
    let finalData;
    try {
      finalData = JSON.parse(JSON.stringify(cleanData));
    } catch (jsonError) {
      console.error("JSON Serialization failed even after sanitization:", jsonError);
      throw new Error("Data contains circular references or invalid objects that could not be cleaned.");
    }

    await setDoc(DATA_DOC_REF, finalData);
    console.log("✅ Document successfully written to Firebase!");
  } catch (error) {
    console.error("❌ Error writing document: ", error);
    throw error;
  }
};