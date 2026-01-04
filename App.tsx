
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
import Kanban from './pages/Kanban';
import Customers from './pages/Customers';
import Maintenance from './pages/Maintenance';
import Shipping from './pages/Shipping';
import Products from './pages/Products';
import Analytics from './pages/Analytics';
import RawMaterialBOM from './pages/RawMaterialBOM';
import Purchasing from './pages/Purchasing';
import WarehouseMap from './pages/WarehouseMap';
import Reports from './pages/Reports';

import { FactoryData } from './types';
import { LanguageProvider, useTranslation } from './services/i18n';
import { fetchFactoryData, saveFactoryData, sanitizeData } from './services/firebase';
import { getFactoryData as getLocalDefault } from './services/database';
import { Construction, WifiOff, CloudOff, AlertTriangle } from 'lucide-react';

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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [apiKey, setApiKeyState] = useState<string>(localStorage.getItem('gemini_api_key') || '');

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const loadedData = await fetchFactoryData();
        if (!loadedData.production_documents) {
            loadedData.production_documents = [];
        }
        // Ensure warehouse locations exist if not present in loaded data
        if (!loadedData.warehouse_locations) {
            const defaultData = getLocalDefault();
            loadedData.warehouse_locations = defaultData.warehouse_locations || [];
        }
        setData(loadedData);
        setError(null);
      } catch (err) {
        console.error("Critical error loading data:", err);
        setData(getLocalDefault());
        setError("Network error: Working in Offline Mode.");
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  const updateData = async (newData: FactoryData) => {
    const cleanData = sanitizeData(newData) as FactoryData;
    setData(cleanData); 
    try {
      await saveFactoryData(cleanData);
      setError(null);
    } catch (err) {
      console.warn("Failed to sync change with cloud:", err);
      setError("Local save successful. Sync pending.");
      setTimeout(() => setError(null), 3000);
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
      setError("Failed to sync reset to cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = (key: string) => {
      localStorage.setItem('gemini_api_key', key);
      setApiKeyState(key);
  };

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-600 gap-4">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center">
            <p className="font-bold text-slate-800">Initializing CT Electric Factory OS</p>
            <p className="text-xs text-slate-400 mt-1">Connecting to Secure Cloud Backend...</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="flex items-center justify-center h-screen text-red-500">System Error: Data could not be initialized.</div>;

  return (
    <LanguageProvider>
      <ApiKeyContext.Provider value={{ apiKey, setApiKey: handleSaveApiKey, isKeySet: !!apiKey }}>
        <FactoryContext.Provider value={data}>
          <FactoryActionsContext.Provider value={{ updateData, resetData, isLoading, error }}>
            <HashRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="machine-status" element={<Maintenance view="status" />} />
                  <Route path="kanban" element={<Kanban />} />
                  <Route path="production" element={<Production />} />
                  <Route path="qc" element={<QC />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="raw-materials" element={<RawMaterialBOM />} />
                  <Route path="products" element={<Products />} />
                  <Route path="shipping" element={<Shipping />} />
                  <Route path="complaints" element={<ComingSoon title="Customer Complaints" />} />
                  <Route path="employees" element={<Employees />} />
                  <Route path="maintenance" element={<Maintenance view="maintenance" />} />
                  <Route path="purchasing" element={<Purchasing />} />
                  <Route path="warehouse-map" element={<WarehouseMap />} />
                  <Route path="analytics-material" element={<Analytics mode="material" />} />
                  <Route path="analytics-cost" element={<Analytics mode="cost" />} />
                  <Route path="analytics-profit" element={<Analytics mode="profit" />} />
                  <Route path="oee" element={<Analytics mode="oee" />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
              
              {isOffline && (
                  <div className="fixed bottom-6 left-6 bg-slate-900 text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xl z-50 border border-slate-800 animate-in slide-in-from-left-4">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                      <CloudOff size={14} /> Offline Mode (Sync Paused)
                  </div>
              )}

              {error && (
                <div className="fixed bottom-6 right-6 bg-amber-50 border border-amber-200 text-amber-800 px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-right-4 border-l-4 border-l-amber-500">
                  <div className="bg-amber-100 p-1.5 rounded-lg">
                      <AlertTriangle size={18} className="text-amber-600" />
                  </div>
                  <div className="flex flex-col">
                      <span className="font-black text-xs uppercase tracking-wider">System Alert</span>
                      <span className="text-sm font-bold">{error}</span>
                  </div>
                  <button onClick={() => setError(null)} className="font-bold ml-2 p-1 hover:bg-amber-100 rounded-lg">×</button>
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