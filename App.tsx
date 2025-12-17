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
import ProductionOrderDocs from './pages/ProductionOrderDocs'; // IMPORT NEW PAGE

import { FactoryData } from './types';
import { LanguageProvider, useTranslation } from './services/i18n';
import { fetchFactoryData, saveFactoryData, sanitizeData } from './services/firebase';
import { getFactoryData as getLocalDefault } from './services/database';
import { Construction } from 'lucide-react';

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

  // Initial Load
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const cloudData = await fetchFactoryData();
        // Ensure production_documents exists in loaded data (migration for existing users)
        if (!cloudData.production_documents) {
            cloudData.production_documents = [];
        }
        setData(cloudData);
        setError(null);
      } catch (err) {
        console.error("Failed to load from Firebase:", err);
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
      // CRITICAL: Sanitize data BEFORE setting state.
      // This prevents circular references or non-serializable objects (like Events/DOM nodes) 
      // from entering the app state, which would crash JSON.stringify() in downstream components.
      const cleanData = sanitizeData(newData) as FactoryData;
      
      setData(cleanData); 
      await saveFactoryData(cleanData);
      setError(null);
    } catch (err) {
      console.error("Failed to save to Firebase:", err);
      setError("Failed to save changes to the cloud.");
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

  if (!data) return <div className="flex items-center justify-center h-screen text-red-500">System Error: Could not load data.</div>;

  return (
    <LanguageProvider>
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
                <Route path="po-docs" element={<ProductionOrderDocs />} /> {/* NEW ROUTE */}

                {/* Production */}
                <Route path="machine-status" element={<Maintenance view="status" />} />
                <Route path="kanban" element={<Kanban />} />
                <Route path="production" element={<Production />} />
                
                {/* Warehouse & QC */}
                <Route path="qc" element={<QC />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="raw-materials" element={<Inventory defaultTab="raw" />} />
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