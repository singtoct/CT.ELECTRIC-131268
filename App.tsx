
import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Production from './pages/Production';
import Inventory from './pages/Inventory';
import QC from './pages/QC';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
// New Pages
import Kanban from './pages/Kanban';
import Customers from './pages/Customers';
import Maintenance from './pages/Maintenance';
import Shipping from './pages/Shipping';
import Products from './pages/Products';
import Analytics from './pages/Analytics';
import RawMaterialBOM from './pages/RawMaterialBOM';

import { FactoryData } from './types';
import { LanguageProvider, useTranslation } from './services/i18n';
import { fetchFactoryData, saveFactoryData, sanitizeData } from './services/firebase';
import { getFactoryData as getLocalDefault } from './services/database';
import { Construction, Key, ShieldCheck, Sparkles, WifiOff } from 'lucide-react';

// --- API Key Context ---
interface ApiKeyContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  isKeySet: boolean;
}
const ApiKeyContext = createContext<ApiKeyContextType | null>(null);

export const useApiKey = () => {
  const context = useContext(ApiKeyContext);
  if (!context) throw new Error("useApiKey must be used within an ApiKeyProvider");
  return context;
};

// Data Context
const FactoryContext = createContext<FactoryData | null>(null);

// Actions Context (to update data)
interface FactoryActions {
  updateData: (newData: FactoryData) => Promise<void>;
  resetData: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}
const FactoryActionsContext = createContext<FactoryActions | null>(null);

export const useFactoryData = () => {
  const context = useContext(FactoryContext);
  if (!context) throw new Error("useFactoryData must be used within a FactoryProvider");
  return context;
};

export const useFactoryActions = () => {
  const context = useContext(FactoryActionsContext);
  if (!context) throw new Error("useFactoryActions must be used within a FactoryProvider");
  return context;
};

// --- Placeholder Component for Future Modules ---
const ComingSoon: React.FC<{title?: string}> = ({title}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
      <div className="bg-slate-100 p-6 rounded-full mb-4">
        <Construction size={48} className="text-slate-400" />
      </div>
      <h2 className="text-xl font-bold text-slate-700">{title || t('common.comingSoon')}</h2>
      <p className="text-sm mt-2">{t('common.underConstruction')}</p>
    </div>
  );
};

const App: React.FC = () => {
  const [data, setData] = useState<FactoryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  
  // API Key State
  const [apiKey, setApiKeyState] = useState<string>(localStorage.getItem('gemini_api_key') || '');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(!localStorage.getItem('gemini_api_key'));

  // Initial Load
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const cloudData = await fetchFactoryData();
        if (!cloudData.production_documents) {
            cloudData.production_documents = [];
        }
        setData(cloudData);
        setError(null);
        setIsOffline(false);
      } catch (err) {
        console.warn("Using local data (Offline Mode)");
        // Fallback to local data seamlessly
        setData(getLocalDefault());
        setIsOffline(true);
        // Do NOT set error here to avoid blocking the UI
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  const updateData = async (newData: FactoryData) => {
    setIsLoading(true);
    try {
      const cleanData = sanitizeData(newData) as FactoryData;
      setData(cleanData); 
      await saveFactoryData(cleanData);
      setError(null);
    } catch (err) {
      console.error("Failed to save to Firebase:", err);
      // Even if cloud save fails, we keep local state updated
      setError("Changes saved locally only (Offline)");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const resetData = async () => {
    setIsLoading(true);
    try {
      const defaultData = getLocalDefault();
      setData(defaultData);
      await saveFactoryData(defaultData);
      setError(null);
    } catch (err) {
      console.error("Failed to reset data:", err);
      setError("Failed to reset data on cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = (key: string) => {
      localStorage.setItem('gemini_api_key', key);
      setApiKeyState(key);
      setShowKeyModal(false);
  };

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-600 gap-4">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <p>Loading System...</p>
      </div>
    );
  }

  if (!data) return <div className="flex items-center justify-center h-screen text-red-500">System Error: Could not load data.</div>;

  return (
    <LanguageProvider>
      <ApiKeyContext.Provider value={{ apiKey, setApiKey: handleSaveApiKey, isKeySet: !!apiKey }}>
        <FactoryContext.Provider value={data}>
          <FactoryActionsContext.Provider value={{ updateData, resetData, isLoading, error }}>
            <HashRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Overview */}
                  <Route path="dashboard" element={<Dashboard />} />
                  
                  {/* Sales */}
                  <Route path="customers" element={<Customers />} />
                  <Route path="orders" element={<Orders />} />

                  {/* Production */}
                  <Route path="machine-status" element={<Maintenance view="status" />} />
                  <Route path="kanban" element={<Kanban />} />
                  <Route path="production" element={<Production />} />
                  
                  {/* Warehouse & QC */}
                  <Route path="qc" element={<QC />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="raw-materials" element={<RawMaterialBOM />} />
                  <Route path="products" element={<Products />} />
                  <Route path="shipping" element={<Shipping />} />
                  <Route path="complaints" element={<ComingSoon title="Customer Complaints" />} />

                  {/* Management */}
                  <Route path="employees" element={<Employees />} />
                  <Route path="maintenance" element={<Maintenance view="maintenance" />} />
                  <Route path="purchasing" element={<ComingSoon title="Purchasing" />} />
                  
                  {/* Analytics Group */}
                  <Route path="analytics-material" element={<Analytics mode="material" />} />
                  <Route path="analytics-cost" element={<Analytics mode="cost" />} />
                  <Route path="analytics-profit" element={<Analytics mode="profit" />} />
                  <Route path="oee" element={<Analytics mode="oee" />} />
                  
                  <Route path="reports" element={<ComingSoon title="Reports" />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
              
              {/* Offline Indicator */}
              {isOffline && (
                  <div className="fixed bottom-4 left-4 bg-slate-800 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg z-50 opacity-80 hover:opacity-100 transition-opacity">
                      <WifiOff size={12} /> Offline Mode
                  </div>
              )}

              {/* API Key Modal */}
              {showKeyModal && (
                  <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
                          <div className="p-8 text-center">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center text-white mb-6 shadow-lg shadow-purple-200">
                                  <Sparkles size={32} />
                              </div>
                              <h2 className="text-2xl font-black text-slate-800 mb-2">ต้องใช้ Gemini API Key</h2>
                              <p className="text-slate-500 text-sm mb-6">
                                  คุณสมบัติ AI บางอย่างถูกปิดใช้งาน โปรดตั้งค่า API Key เพื่อเปิดใช้งานระบบอัจฉริยะ (เช่น การคำนวณราคา, จับคู่ BOM)
                              </p>
                              
                              <div className="text-left space-y-2 mb-6">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Google Gemini API Key</label>
                                  <div className="relative">
                                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                      <input 
                                          type="password" 
                                          placeholder="วาง Gemini API Key ของคุณที่นี่..." 
                                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                          onKeyDown={(e) => {
                                              if(e.key === 'Enter') handleSaveApiKey((e.target as HTMLInputElement).value);
                                          }}
                                      />
                                  </div>
                                  <p className="text-[10px] text-slate-400 text-center mt-2">
                                      Key จะถูกบันทึกในเครื่องของคุณเท่านั้น (LocalStorage)
                                  </p>
                              </div>

                              <button 
                                  onClick={() => {
                                      const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                                      if(input.value) handleSaveApiKey(input.value);
                                  }}
                                  className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                              >
                                  <ShieldCheck size={20}/> บันทึก Key และเริ่มใช้งาน
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {error && (
                <div className="fixed bottom-4 right-4 bg-amber-100 border border-amber-400 text-amber-800 px-4 py-3 rounded shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-bottom-2">
                  <span>⚠️ {error}</span>
                  <button onClick={() => setError(null)} className="font-bold ml-2">x</button>
                </div>
              )}
            </HashRouter>
          </FactoryActionsContext.Provider>
        </FactoryContext.Provider>
      </ApiKeyContext.Provider>
    </LanguageProvider>
  );
};

export default App;
