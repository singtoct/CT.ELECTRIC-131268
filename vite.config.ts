
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 1. ป้องกัน Error "process is not defined" ซึ่งเป็นสาเหตุหลักที่ทำให้จอขาวในบาง Browser
  define: {
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      // 2. สั่งให้ข้าม @google/genai ไม่ต้องเอามา Build (เพราะเราไม่มีไฟล์นี้ในเครื่อง)
      // แก้ปัญหา: "Rollup failed to resolve import @google/genai"
      external: ['@google/genai'],
      output: {
        format: 'es',
        globals: {
          '@google/genai': 'GoogleGenAI'
        }
      }
    }
  },
})
