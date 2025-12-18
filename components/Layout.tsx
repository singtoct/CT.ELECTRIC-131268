
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
  FileBarChart,
  User,
  Bell,
  Plus,
  Moon,
  Languages
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
    <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
      {navStructure.map((item) => {
        const Icon = item.icon;
        if (!item.children) {
          return (
            <NavLink
              key={item.key}
              to={item.path!}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                  isActive ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'hover:bg-slate-800 text-slate-400'
                }`
              }
            >
              <Icon size={20} className={location.pathname === item.path ? 'text-white' : 'group-hover:text-primary-400'} />
              <span className="font-bold text-sm tracking-wide">{t(`nav.${item.key}`)}</span>
            </NavLink>
          );
        }

        const isOpen = openMenus.includes(item.key);
        const isChildActive = item.children.some(child => location.pathname === child.path);

        return (
          <div key={item.key} className="space-y-1">
            <button
              onClick={() => toggleMenu(item.key)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 
                ${isChildActive ? 'text-white' : 'hover:bg-slate-800/50 text-slate-400'}
              `}
            >
              <div className="flex items-center space-x-3">
                <Icon size={20} className={isChildActive ? 'text-primary-400' : 'group-hover:text-primary-400'} />
                <span className="font-bold text-sm tracking-wide">{t(`nav.${item.key}`)}</span>
              </div>
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {isOpen && (
              <div className="ml-4 pl-4 border-l border-slate-800 space-y-1 my-1">
                {item.children.map(child => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    className={({ isActive }) =>
                      `block px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive ? 'text-primary-400 bg-primary-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
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
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 rounded-2xl bg-primary-600 flex items-center justify-center text-white font-black shadow-lg shadow-primary-600/20">
              CT
            </div>
            <div className="flex flex-col">
              <span className="font-black text-white text-lg leading-tight">CT.ELECTRIC</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[2px]">Factory OS</span>
            </div>
          </div>
          <button className="lg:hidden text-slate-500 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <NavContent />
        
        <div className="p-6 border-t border-slate-800">
           <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              <span>CT.ELECTRIC © 2025</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-8 shrink-0">
           <div className="flex items-center gap-6">
                <button 
                  className="p-2 -ml-2 text-slate-400 hover:bg-slate-100 rounded-2xl lg:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu size={24} />
                </button>
                <div className="hidden md:flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                   <NavLink to="/dashboard" className={({isActive}) => `p-2 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutDashboard size={20}/></NavLink>
                   <NavLink to="/production" className={({isActive}) => `p-2 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}><Factory size={20}/></NavLink>
                   <NavLink to="/inventory" className={({isActive}) => `p-2 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}><Box size={20}/></NavLink>
                </div>
           </div>

           <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
                <Languages size={16} className="text-slate-400" />
                {['th', 'en'].map((lang) => (
                    <button 
                        key={lang}
                        onClick={() => setLanguage(lang as any)} 
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all ${language === lang ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {lang}
                    </button>
                ))}
             </div>
             
             <div className="flex items-center gap-1 border-l border-slate-200 pl-4 ml-1">
                <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-2xl transition-all"><Moon size={20}/></button>
                <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-2xl transition-all"><Plus size={20}/></button>
                <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-2xl transition-all relative">
                   <Bell size={20}/>
                   <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
             </div>
             
             <div className="h-10 w-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all cursor-pointer">
                <User size={20}/>
             </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#fdfdfd]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
