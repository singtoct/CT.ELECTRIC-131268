
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Menu, X, ChevronDown, ChevronRight, Briefcase, Factory, Box, FileBarChart,
  User, Bell, Plus, Moon, Sun, Languages, ShoppingCart, Map, LogOut, Settings,
  PackagePlus, FilePlus, UserPlus
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
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState<string[]>(['sales', 'production', 'warehouse', 'management']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Header States ---
  const [activeDropdown, setActiveDropdown] = useState<'add' | 'notif' | 'profile' | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsSidebarOpen(false);
    setActiveDropdown(null);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        { path: '/orders', label: 'nav.orders' },
        { path: '/production-docs', label: 'nav.poDocs' },
        { path: '/complaints', label: 'nav.complaints' }
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
        { path: '/warehouse-map', label: 'nav.warehouseMap' },
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
        { path: '/purchasing', label: 'nav.purchasing' },
        { path: '/analytics-profit', label: 'nav.analysisProfit' },
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

  const notifications = [
      { id: 1, text: "Machine 1: Job Completed", type: "success", time: "2 min ago" },
      { id: 2, text: "Low Stock: Resin PP Black", type: "warning", time: "1 hr ago" },
      { id: 3, text: "New Order: PO-2025008", type: "info", time: "3 hrs ago" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

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
              <span className="font-black text-white text-lg leading-tight">{t('app.name')}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[2px]">{t('app.desc')}</span>
            </div>
          </div>
          <button className="lg:hidden text-slate-500 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <NavContent />
        
        <div className="p-6 border-t border-slate-800">
           <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              <span>{t('layout.copyright')}</span>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-8 shrink-0 z-30 relative" ref={headerRef}>
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
                   <NavLink to="/warehouse-map" className={({isActive}) => `p-2 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}><Map size={20}/></NavLink>
                   <NavLink to="/purchasing" className={({isActive}) => `p-2 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}><ShoppingCart size={20}/></NavLink>
                </div>
           </div>

           <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
                <Languages size={16} className="text-slate-400" />
                {['th', 'en', 'cn'].map((lang) => (
                    <button 
                        key={lang}
                        onClick={() => setLanguage(lang as any)} 
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all ${language === lang ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {lang}
                    </button>
                ))}
             </div>
             
             <div className="flex items-center gap-1 border-l border-slate-200 pl-4 ml-1 relative">
                <button 
                    onClick={() => setIsDark(!isDark)}
                    className={`p-2.5 rounded-2xl transition-all ${isDark ? 'bg-slate-800 text-yellow-400' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                    {isDark ? <Sun size={20}/> : <Moon size={20}/>}
                </button>

                {/* Quick Add */}
                <div className="relative">
                    <button 
                        onClick={() => setActiveDropdown(activeDropdown === 'add' ? null : 'add')}
                        className={`p-2.5 rounded-2xl transition-all ${activeDropdown === 'add' ? 'bg-primary-50 text-primary-600' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                        <Plus size={20}/>
                    </button>
                    {activeDropdown === 'add' && (
                        <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-200 transform origin-top-right">
                            <span className="text-[10px] font-black text-slate-400 px-3 uppercase">{t('layout.quickAdd')}</span>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button onClick={() => { navigate('/production-docs'); setActiveDropdown(null); }} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 text-left transition-colors">
                                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><FilePlus size={16}/></div>
                                <div>
                                    <div className="text-xs font-bold text-slate-800">{t('layout.newOrder')}</div>
                                    <div className="text-[10px] text-slate-400">{t('layout.newOrderDesc')}</div>
                                </div>
                            </button>
                            <button onClick={() => { navigate('/products'); setActiveDropdown(null); }} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 text-left transition-colors">
                                <div className="bg-purple-100 text-purple-600 p-2 rounded-lg"><PackagePlus size={16}/></div>
                                <div>
                                    <div className="text-xs font-bold text-slate-800">{t('layout.newProduct')}</div>
                                    <div className="text-[10px] text-slate-400">{t('layout.newProductDesc')}</div>
                                </div>
                            </button>
                            <button onClick={() => { navigate('/customers'); setActiveDropdown(null); }} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 text-left transition-colors">
                                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg"><UserPlus size={16}/></div>
                                <div>
                                    <div className="text-xs font-bold text-slate-800">{t('layout.newCustomer')}</div>
                                    <div className="text-[10px] text-slate-400">{t('layout.newCustomerDesc')}</div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div className="relative">
                    <button 
                        onClick={() => { setActiveDropdown(activeDropdown === 'notif' ? null : 'notif'); setHasUnread(false); }}
                        className={`p-2.5 rounded-2xl transition-all relative ${activeDropdown === 'notif' ? 'bg-primary-50 text-primary-600' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                        <Bell size={20}/>
                        {hasUnread && <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>}
                    </button>
                    {activeDropdown === 'notif' && (
                        <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transform origin-top-right">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{t('layout.notifications')}</span>
                                <span className="text-[10px] font-bold text-primary-600 cursor-pointer">{t('layout.markRead')}</span>
                            </div>
                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                {notifications.map(n => (
                                    <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3">
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'success' ? 'bg-green-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 leading-snug">{n.text}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-2 bg-slate-50 text-center">
                                <button className="text-[10px] font-bold text-slate-500 hover:text-slate-800">{t('layout.viewAll')}</button>
                            </div>
                        </div>
                    )}
                </div>
             </div>
             
             {/* Profile */}
             <div className="relative">
                 <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'profile' ? null : 'profile')}
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${activeDropdown === 'profile' ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                 >
                    <User size={20}/>
                 </button>
                 {activeDropdown === 'profile' && (
                    <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-200 transform origin-top-right">
                        <div className="px-4 py-3 border-b border-slate-50 mb-2">
                            <p className="text-sm font-black text-slate-800">{t('layout.profile')}</p>
                            <p className="text-[10px] text-slate-400">{t('layout.role')}</p>
                        </div>
                        <button onClick={() => { navigate('/settings'); setActiveDropdown(null); }} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 text-left transition-colors text-slate-600">
                            <Settings size={16}/> <span className="text-xs font-bold">{t('layout.settings')}</span>
                        </button>
                        <button onClick={() => alert("Logged out")} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-50 text-left transition-colors text-red-600">
                            <LogOut size={16}/> <span className="text-xs font-bold">{t('layout.logout')}</span>
                        </button>
                    </div>
                 )}
             </div>
           </div>
        </header>

        <div className={`flex-1 overflow-y-auto p-8 custom-scrollbar transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-[#fdfdfd]'}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
