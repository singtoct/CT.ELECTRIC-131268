import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { FactoryData } from "../types";
import { getFactoryData as getDefaultData } from "./database";

// --- 1. Firebase Configuration (จากที่คุณให้มา) ---
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
const analytics = getAnalytics(app); // Initialize Analytics as requested

// เราจะเก็บข้อมูลทั้งหมดไว้ใน Collection 'factory' -> Document 'main_data'
// เปรียบเสมือนไฟล์ JSON ก้อนเดียวบน Cloud
const DATA_DOC_REF = doc(db, "factory", "main_data");

// --- 3. Service Functions ---

// ดึงข้อมูลจาก Cloud
export const fetchFactoryData = async (): Promise<FactoryData> => {
  try {
    const docSnap = await getDoc(DATA_DOC_REF);
    
    if (docSnap.exists()) {
      console.log("✅ Document data loaded from Firebase!");
      return docSnap.data() as FactoryData;
    } else {
      // ถ้าเปิดเว็บครั้งแรกและยังไม่มีข้อมูลบน Cloud ให้เอาข้อมูลเริ่มต้น (Default) ยิงขึ้นไปเก็บไว้ก่อน
      console.log("⚠️ No cloud data found! Initializing with default data...");
      const defaultData = getDefaultData();
      await saveFactoryData(defaultData);
      return defaultData;
    }
  } catch (error) {
    console.error("❌ Error getting document:", error);
    // ถ้าเน็ตหลุด หรือมีปัญหา ให้คืนค่า Default ไปก่อนเพื่อให้เว็บไม่พัง
    throw error;
  }
};

// บันทึกข้อมูลทับลง Cloud (ใช้เมื่อมีการแก้ข้อมูล หรืออัพโหลด JSON ใหม่)
export const saveFactoryData = async (data: FactoryData): Promise<void> => {
  try {
    // ใช้ setDoc เพื่อเขียนทับ (Overwrite) ข้อมูลทั้งหมด
    await setDoc(DATA_DOC_REF, data);
    console.log("✅ Document successfully written to Firebase!");
  } catch (error) {
    console.error("❌ Error writing document: ", error);
    throw error;
  }
};
