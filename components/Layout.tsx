import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Factory, ClipboardCheck, Users, Box } from 'lucide-react';
import { useFactoryData } from '../App';

const Layout: React.FC = () => {
  const { factory_settings } = useFactoryData();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/orders', label: 'Orders', icon: Package },
    { path: '/production', label: 'Production', icon: Factory },
    { path: '/inventory', label: 'Inventory', icon: Box },
    { path: '/qc', label: 'Quality Control', icon: ClipboardCheck },
    { path: '/employees', label: 'Employees', icon: Users },
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
                <span className="font-medium">{item.label}</span>
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
        {/* Header for Mobile/Tablet mostly, or just context */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 md:px-10">
           <h1 className="text-xl font-semibold text-slate-800 capitalize">
             {location.pathname.replace('/', '')}
           </h1>
           <div className="flex items-center space-x-4">
             <span className="text-sm text-slate-500">Welcome, Manager</span>
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