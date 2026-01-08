
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { Archive, Layers, Search, Edit3, Save, X, GitMerge, Factory } from 'lucide-react';
import { InventoryItem } from '../types';

const Inventory: React.FC = () => {
  const data = useFactoryData();
  const { packing_inventory = [], packing_raw_materials = [] } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<'finished' | 'raw' | 'component'>('finished');
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const currentData = activeTab === 'finished' ? packing_inventory : (activeTab === 'raw' ? packing_raw_materials.filter(i => i.category !== 'Component') : packing_raw_materials.filter(i => i.category === 'Component'));
  const filteredData = currentData.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  const handleUpdateStock = async () => {
    if (!editingItem) return;
    let newData = { ...data };
    if (activeTab === 'finished') {
        newData.packing_inventory = packing_inventory.map(i => i.id === editingItem.id ? editingItem : i);
    } else {
        newData.packing_raw_materials = packing_raw_materials.map(i => i.id === editingItem.id ? editingItem : i);
    }
    await updateData(newData);
    setEditingItem(null);
  };

  const inputClasses = "w-full !bg-white !text-slate-900 border border-slate-300 rounded-xl px-4 py-3 font-black text-lg focus:ring-4 focus:ring-primary-50 focus:border-primary-500 outline-none shadow-sm transition-all";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('inv.title')}</h2>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{t('inv.subtitle')}</p>
      </div>

      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <button onClick={() => setActiveTab('finished')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'finished' ? 'bg-slate-100 text-slate-800 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}>
          <Archive size={16} /> {t('inv.tabFinished')}
        </button>
        <button onClick={() => setActiveTab('component')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'component' ? 'bg-slate-100 text-slate-800 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}>
          <GitMerge size={16} /> {t('inv.tabComponent')}
        </button>
        <button onClick={() => setActiveTab('raw')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'raw' ? 'bg-slate-100 text-slate-800 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}>
          <Layers size={16} /> {t('inv.tabRaw')}
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center">
            <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder={t('inv.search')} className="pl-12 pr-6 py-3.5 border border-slate-200 rounded-2xl w-full !bg-white !text-slate-900 font-bold focus:ring-4 focus:ring-primary-50 transition-all outline-none shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-400 font-black border-b border-slate-200 uppercase tracking-[2px] text-[10px]">
            <tr>
              <th className="px-8 py-5">{t('inv.itemName')}</th>
              <th className="px-6 py-5 text-right">{t('inv.inStock')}</th>
              <th className="px-6 py-5 text-center">{t('inv.unit')}</th>
              <th className="px-8 py-5 text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-8 py-4 font-black text-slate-800 text-base">{item.name}</td>
                <td className="px-6 py-4 text-right font-mono font-black text-primary-600 text-xl">{(item.quantity || 0).toLocaleString()}</td>
                <td className="px-6 py-4 text-center text-slate-400 font-black">{item.unit || 'pcs'}</td>
                <td className="px-8 py-4 text-right">
                  <button onClick={() => setEditingItem(item)} className="p-3 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-2xl transition-all"><Edit3 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t('inv.updateStock')}</h3>
                    <button onClick={() => setEditingItem(null)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><X size={24}/></button>
                </div>
                <div className="p-10 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-2">{t('inv.itemName')}</label>
                        <div className="text-xl font-black text-slate-800">{editingItem.name}</div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-2">New Quantity ({editingItem.unit})</label>
                        <input type="number" value={editingItem.quantity || ''} onChange={e => setEditingItem({...editingItem, quantity: parseFloat(e.target.value) || 0})} className={inputClasses} />
                    </div>
                </div>
                <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button onClick={() => setEditingItem(null)} className="flex-1 py-4 text-slate-500 font-black hover:bg-slate-200 rounded-2xl transition-all">{t('product.cancel')}</button>
                    <button onClick={handleUpdateStock} className="flex-1 py-4 bg-primary-600 text-white font-black rounded-2xl shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center justify-center gap-2"><Save size={20}/> {t('inv.save')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
