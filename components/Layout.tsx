import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Factory, 
  ClipboardCheck, 
  Users, 
  Box, 
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Truck,
  Wrench,
  ShoppingCart,
  FileBarChart,
  AlertTriangle,
  Briefcase,
  Layers
} from 'lucide-react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';

interface NavItem {
  key: string;
  icon: any;
  path?: string;
  children?: { path: string; label: string }[];
}

const Layout: React.FC = () => {
  const { factory_settings } = useFactoryData();
  const { t, language, setLanguage } = useTranslation();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>(['sales', 'production', 'warehouse', 'management']);

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const navStructure: NavItem[] = [
    { 
      key: 'overview', 
      icon: LayoutDashboard, 
      path: '/dashboard' 
    },
    { 
      key: 'sales', 
      icon: Briefcase,
      children: [
        { path: '/customers', label: 'nav.customers' },
        { path: '/orders', label: 'nav.orders' }
      ]
    },
    { 
      key: 'production', 
      icon: Factory,
      children: [
        { path: '/machine-status', label: 'nav.machineStatus' },
        { path: '/kanban', label: 'nav.kanban' },
        { path: '/production', label: 'nav.prodLogs' }
      ]
    },
    { 
      key: 'warehouse', 
      icon: Box,
      children: [
        { path: '/qc', label: 'nav.qc' },
        { path: '/inventory', label: 'nav.finishedGoods' },
        { path: '/raw-materials', label: 'nav.rawMaterials' },
        { path: '/products', label: 'nav.products' },
        { path: '/shipping', label: 'nav.shipping' },
        { path: '/complaints', label: 'nav.complaints' }
      ]
    },
    { 
      key: 'management', 
      icon: FileBarChart,
      children: [
        { path: '/employees', label: 'nav.employees' },
        { path: '/maintenance', label: 'nav.maintenance' },
        { path: '/purchasing', label: 'nav.purchasing' },
        { path: '/analytics-material', label: 'nav.analysisMat' },
        { path: '/analytics-cost', label: 'nav.analysisCost' },
        { path: '/analytics-profit', label: 'nav.analysisProfit' },
        { path: '/oee', label: 'nav.oee' },
        { path: '/reports', label: 'nav.reports' },
        { path: '/settings', label: 'nav.settings' }
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden md:flex flex-col transition-all duration-300">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
             {/* Placeholder logo */}
             <div className="h-8 w-8 rounded bg-primary-500 flex items-center justify-center text-white font-bold shrink-0">
               {factory_settings?.name?.substring(0, 2) || "CT"}
             </div>
            <span className="font-bold text-white text-lg tracking-tight truncate">
               {factory_settings?.name || "Factory OS"}
            </span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {navStructure.map((item) => {
            const Icon = item.icon;
            
            // Single Link
            if (!item.children) {
                const isActive = location.pathname === item.path;
                return (
                    <NavLink
                        key={item.key}
                        to={item.path!}
                        className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 mb-1 ${
                            isActive
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50'
                            : 'hover:bg-slate-800 hover:text-white'
                        }`
                        }
                    >
                        <Icon size={20} />
                        <span className="font-medium text-sm">{t(`nav.${item.key}`)}</span>
                    </NavLink>
                );
            }

            // Dropdown Menu
            const isOpen = openMenus.includes(item.key);
            const isChildActive = item.children.some(child => location.pathname.startsWith(child.path));

            return (
                <div key={item.key} className="mb-1">
                    <button
                        onClick={() => toggleMenu(item.key)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors duration-200 
                            ${isChildActive ? 'text-white bg-slate-800' : 'hover:bg-slate-800/50 hover:text-white text-slate-400'}
                        `}
                    >
                        <div className="flex items-center space-x-3">
                            <Icon size={20} />
                            <span className="font-medium text-sm">{t(`nav.${item.key}`)}</span>
                        </div>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {isOpen && (
                        <div className="mt-1 ml-4 pl-3 border-l border-slate-700 space-y-1">
                            {item.children.map(child => (
                                <NavLink
                                    key={child.path}
                                    to={child.path}
                                    className={({ isActive }) =>
                                        `block px-3 py-2 rounded-md text-sm transition-colors ${
                                            isActive 
                                            ? 'text-primary-400 bg-slate-800/50 font-medium' 
                                            : 'text-slate-500 hover:text-slate-300'
                                        }`
                                    }
                                >
                                    {t(child.label)}
                                </NavLink>
                            ))}
                        </div>
                    )}
                </div>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          v2.0 • CT Electric
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 md:px-10 shrink-0">
           <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800 capitalize">
                    {/* Find current page label */}
                    {(() => {
                        for (const item of navStructure) {
                            if (item.path === location.pathname) return t(`nav.${item.key}`);
                            if (item.children) {
                                const child = item.children.find(c => c.path === location.pathname);
                                if (child) return t(child.label);
                            }
                        }
                        return "Factory OS";
                    })()}
                </h1>
           </div>

           <div className="flex items-center space-x-4">
             {/* Language Switcher */}
             <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                {['th', 'en', 'cn'].map((lang) => (
                    <button 
                        key={lang}
                        onClick={() => setLanguage(lang as any)} 
                        className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-all ${language === lang ? 'bg-white shadow text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {lang}
                    </button>
                ))}
             </div>

             <div className="h-6 w-px bg-slate-200 mx-2"></div>

             <span className="text-sm text-slate-500 hidden sm:inline">{t('nav.welcome')}, Admin</span>
             <div className="h-9 w-9 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-full flex items-center justify-center font-bold shadow-sm">
               A
             </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
