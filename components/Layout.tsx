import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Factory,
  Box,
  FileBarChart
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on route change (for mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const navStructure: NavItem[] = [
    { key: 'overview', icon: LayoutDashboard, path: '/dashboard' },
    { 
      key: 'sales', 
      icon: Briefcase,
      children: [
        { path: '/po-docs', label: 'nav.poDocs' },
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
        { path: '/shipping', label: 'nav.shipping' }
      ]
    },
    { 
      key: 'management', 
      icon: FileBarChart,
      children: [
        { path: '/employees', label: 'nav.employees' },
        { path: '/maintenance', label: 'nav.maintenance' },
        { path: '/analytics-material', label: 'nav.analysisMat' },
        { path: '/oee', label: 'nav.oee' },
        { path: '/settings', label: 'nav.settings' }
      ]
    }
  ];

  const NavContent = () => (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
      {navStructure.map((item) => {
        const Icon = item.icon;
        if (!item.children) {
          return (
            <NavLink
              key={item.key}
              to={item.path!}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 mb-1 ${
                  isActive ? 'bg-primary-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`
              }
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{t(`nav.${item.key}`)}</span>
            </NavLink>
          );
        }

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
                        isActive ? 'text-primary-400 bg-slate-800/50 font-medium' : 'text-slate-500 hover:text-slate-300'
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
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans print:bg-white overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop and Mobile (Drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:inset-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        print:hidden
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="h-8 w-8 rounded bg-primary-500 flex items-center justify-center text-white font-bold shrink-0">
              {factory_settings?.name?.substring(0, 2) || "CT"}
            </div>
            <span className="font-bold text-white text-lg tracking-tight truncate">
              {factory_settings?.name || "Factory OS"}
            </span>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <NavContent />
        
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          v2.0 • CT Electric
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-6 shrink-0 print:hidden">
           <div className="flex items-center gap-3">
                <button 
                  className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu size={24} />
                </button>
                <h1 className="text-lg md:text-xl font-bold text-slate-800 truncate">
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

           <div className="flex items-center space-x-2 md:space-x-4">
             {/* Language Switcher - Compact on mobile */}
             <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                {['th', 'en'].map((lang) => (
                    <button 
                        key={lang}
                        onClick={() => setLanguage(lang as any)} 
                        className={`px-2 py-1 md:px-3 md:py-1 rounded-md text-[10px] md:text-xs font-bold uppercase transition-all ${language === lang ? 'bg-white shadow text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {lang}
                    </button>
                ))}
             </div>

             <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

             <div className="flex items-center gap-2">
               <span className="text-xs text-slate-500 hidden lg:inline">Admin</span>
               <div className="h-8 w-8 md:h-9 md:w-9 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-full flex items-center justify-center font-bold shadow-sm text-sm">
                 A
               </div>
             </div>
           </div>
        </header>

        {/* Dynamic Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 print:p-0 print:bg-white print:overflow-visible custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;