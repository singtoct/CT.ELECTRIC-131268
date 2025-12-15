import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Factory, ClipboardCheck, Users, Box, Settings as SettingsIcon } from 'lucide-react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';

const Layout: React.FC = () => {
  const { factory_settings } = useFactoryData();
  const { t, language, setLanguage } = useTranslation();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'nav.dashboard', icon: LayoutDashboard },
    { path: '/orders', label: 'nav.orders', icon: Package },
    { path: '/production', label: 'nav.production', icon: Factory },
    { path: '/inventory', label: 'nav.inventory', icon: Box },
    { path: '/qc', label: 'nav.qc', icon: ClipboardCheck },
    { path: '/employees', label: 'nav.employees', icon: Users },
    { path: '/settings', label: 'nav.settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden md:flex flex-col transition-all duration-300">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
             {/* Placeholder logo */}
            <div className="h-8 w-8 rounded bg-primary-500 flex items-center justify-center text-white font-bold">CT</div>
            <span className="font-bold text-white text-lg tracking-tight">Factory OS</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
             {factory_settings?.name || "CT Electric"}
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon size={20} />
                <span className="font-medium">{t(item.label)}</span>
              </NavLink>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          v1.0.0 • Production Build
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 md:px-10">
           <h1 className="text-xl font-semibold text-slate-800 capitalize">
             {t(`nav.${location.pathname.replace('/', '')}`)}
           </h1>
           <div className="flex items-center space-x-4">
             {/* Language Switcher */}
             <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                <button 
                  onClick={() => setLanguage('th')} 
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${language === 'th' ? 'bg-white shadow text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  TH
                </button>
                <button 
                  onClick={() => setLanguage('en')} 
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${language === 'en' ? 'bg-white shadow text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLanguage('cn')} 
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${language === 'cn' ? 'bg-white shadow text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  CN
                </button>
             </div>

             <div className="h-6 w-px bg-slate-200 mx-2"></div>

             <span className="text-sm text-slate-500 hidden sm:inline">{t('nav.welcome')}, Manager</span>
             <div className="h-8 w-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
               M
             </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;