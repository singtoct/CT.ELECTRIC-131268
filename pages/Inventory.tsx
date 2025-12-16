import React, { useState, useEffect } from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { Archive, Layers, Search } from 'lucide-react';

interface InventoryProps {
    defaultTab?: 'finished' | 'raw';
}

const Inventory: React.FC<InventoryProps> = ({ defaultTab = 'finished' }) => {
  const { packing_inventory, packing_raw_materials } = useFactoryData();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'finished' | 'raw'>(defaultTab);
  const [search, setSearch] = useState('');

  // Update tab if prop changes (e.g. navigation)
  useEffect(() => {
      setActiveTab(defaultTab);
  }, [defaultTab]);

  const data = activeTab === 'finished' ? (packing_inventory || []) : (packing_raw_materials || []);
  const filteredData = data.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('inv.title')}</h2>
          <p className="text-slate-500">{t('inv.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('finished')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'finished'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Archive size={18} />
            {t('inv.finishedGoods')} ({packing_inventory?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'raw'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Layers size={18} />
            {t('inv.rawMaterials')} ({packing_raw_materials?.length || 0})
          </button>
        </nav>
      </div>

      {/* Toolbar */}
      <div className="flex justify-end">
         <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={activeTab === 'finished' ? t('inv.searchFinished') : t('inv.searchRaw')} 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">{t('inv.itemName')}</th>
                <th className="px-6 py-4 text-right">{t('orders.quantity')}</th>
                <th className="px-6 py-4 text-right">{t('inv.unit')}</th>
                {activeTab === 'raw' && <th className="px-6 py-4 text-right">{t('inv.costUnit')}</th>}
                <th className="px-6 py-4 text-center">{t('inv.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 text-right font-mono text-base">{(item.quantity || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-slate-500">{item.unit || 'pcs'}</td>
                  {activeTab === 'raw' && (
                      <td className="px-6 py-4 text-right text-slate-600">
                          {item.costPerUnit ? `฿${item.costPerUnit.toFixed(2)}` : '-'}
                      </td>
                  )}
                  <td className="px-6 py-4 text-center">
                     {(item.quantity || 0) <= 0 ? (
                         <span className="inline-flex px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">{t('inv.outOfStock')}</span>
                     ) : (item.quantity || 0) < 100 ? (
                         <span className="inline-flex px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">{t('inv.lowStock')}</span>
                     ) : (
                         <span className="inline-flex px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">{t('inv.inStock')}</span>
                     )}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'raw' ? 5 : 4} className="px-6 py-12 text-center text-slate-500">
                    {t('orders.noFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
