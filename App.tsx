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
import ProductionOrderDocs from './pages/ProductionOrderDocs';
import Complaints from './pages/Complaints'; // Import Complaints

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
        if (!loadedData.warehouse_locations) {
            const defaultData = getLocalDefault();
            loadedData.warehouse_locations = defaultData.warehouse_locations || [];
        }
        // Ensure complaints array exists
        if (!loadedData.factory_complaints) {
            loadedData.factory_complaints = [];
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
                  <Route path="production-docs" element={<ProductionOrderDocs />} />
                  <Route path="machine-status" element={<Maintenance view="status" />} />
                  <Route path="kanban" element={<Kanban />} />
                  <Route path="production" element={<Production />} />
                  <Route path="qc" element={<QC />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="raw-materials" element={<RawMaterialBOM />} />
                  <Route path="products" element={<Products />} />
                  <Route path="shipping" element={<Shipping />} />
                  <Route path="complaints" element={<Complaints />} /> {/* Updated Route */}
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
                <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 z-[9999] animate-pulse">
                    <WifiOff size={20}/>
                    <span className="font-bold">Offline Mode (Local Data)</span>
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