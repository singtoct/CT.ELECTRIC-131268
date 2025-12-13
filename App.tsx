import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Production from './pages/Production';
import Inventory from './pages/Inventory';
import QC from './pages/QC';
import Employees from './pages/Employees';
import { getFactoryData } from './services/database';
import { FactoryData } from './types';

// Data Context
const FactoryContext = createContext<FactoryData | null>(null);

export const useFactoryData = () => {
  const context = useContext(FactoryContext);
  if (!context) throw new Error("useFactoryData must be used within a FactoryProvider");
  return context;
};

const App: React.FC = () => {
  const [data, setData] = useState<FactoryData | null>(null);

  useEffect(() => {
    // Simulate fetching data
    const loadedData = getFactoryData();
    setData(loadedData);
  }, []);

  if (!data) return <div className="flex items-center justify-center h-screen text-slate-500">Loading Factory Data...</div>;

  return (
    <FactoryContext.Provider value={data}>
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
          </Route>
        </Routes>
      </HashRouter>
    </FactoryContext.Provider>
  );
};

export default App;