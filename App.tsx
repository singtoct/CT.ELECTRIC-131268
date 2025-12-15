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
import { FactoryData } from './types';
import { LanguageProvider } from './services/i18n';
import { fetchFactoryData, saveFactoryData } from './services/firebase';
import { getFactoryData as getLocalDefault } from './services/database';

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

const App: React.FC = () => {
  const [data, setData] = useState<FactoryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const cloudData = await fetchFactoryData();
        setData(cloudData);
        setError(null);
      } catch (err) {
        console.error("Failed to load from Firebase:", err);
        // Fallback to local default if Firebase fails (e.g. no config)
        setData(getLocalDefault());
        setError("Failed to connect to cloud database. Using local demo data.");
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  const updateData = async (newData: FactoryData) => {
    setIsLoading(true);
    try {
      // Optimistic UI update (update local state immediately)
      setData(newData); 
      // Sync with Cloud
      await saveFactoryData(newData);
      setError(null);
    } catch (err) {
      console.error("Failed to save to Firebase:", err);
      setError("Failed to save changes to the cloud.");
      // Optional: Rollback state here if strict consistency is needed
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

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-600 gap-4">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <p>Connecting to Factory Database...</p>
      </div>
    );
  }

  // If failed completely and no fallback data
  if (!data) return <div className="flex items-center justify-center h-screen text-red-500">System Error: Could not load data.</div>;

  return (
    <LanguageProvider>
      <FactoryContext.Provider value={data}>
        <FactoryActionsContext.Provider value={{ updateData, resetData, isLoading, error }}>
          <HashRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="orders" element={<Orders />} />
                <Route path="production" element={<Production />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="qc" element={<QC />} />
                <Route path="employees" element={<Employees />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
            
            {/* Global Error Toast (Simple implementation) */}
            {error && (
              <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50 flex items-center gap-2">
                <span>⚠️ {error}</span>
                <button onClick={() => setError(null)} className="font-bold ml-2">x</button>
              </div>
            )}
          </HashRouter>
        </FactoryActionsContext.Provider>
      </FactoryContext.Provider>
    </LanguageProvider>
  );
};

export default App;