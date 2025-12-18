
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { Archive, Layers, Search, Edit3, Save, X, Info, GitMerge, Factory } from 'lucide-react';
import { InventoryItem } from '../types';

interface InventoryProps {
    defaultTab?: 'finished' | 'raw' | 'component';
}

const Inventory: React.FC<InventoryProps> = ({ defaultTab = 'finished' }) => {
  const data = useFactoryData();
  const { packing_inventory = [], packing_raw_materials = [], production_documents = [], factory_products = [] } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<'finished' | 'raw' | 'component'>(defaultTab);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Calculate Reserved Quantities
  const reservedQuantities = useMemo(() => {
    const reserved: Record<string, number> = {};
    production_documents
      .filter(doc => ['Approved', 'In Progress', 'Material Checking'].includes(doc.status))
      .forEach(doc => {
        doc.items.forEach(item => {
          const product = factory_products.find(p => p.name === item.productName);
          if (product && product.bom) {
            product.bom.forEach(bom => {
              reserved[bom.materialId] = (reserved[bom.materialId] || 0) + (bom.quantityPerUnit * item.quantity);
            });
          }
        });
      });
    return reserved;
  }, [production_documents, factory_products]);

  // Derived datasets
  const rawMaterials = packing_raw_materials.filter(i => i.category !== 'Component');
  const internalComponents = packing_raw_materials.filter(i => i.category === 'Component');

  const currentData = activeTab === 'finished' ? packing_inventory : (activeTab === 'raw' ? rawMaterials : internalComponents);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('inv.title')}</h2>
          <p className="text-slate-500">จัดการจำนวนสินค้าและแหล่งที่มาของวัตถุดิบ</p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('finished')} className={`py-4 px-1 border-b-2 font-black text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'finished' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <Archive size={18} /> {t('inv.finishedGoods')} ({packing_inventory.length})
          </button>
          <button onClick={() => setActiveTab('component')} className={`py-4 px-1 border-b-2 font-black text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'component' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <GitMerge size={18} /> ชิ้นส่วนประกอบ ({internalComponents.length})
          </button>
          <button onClick={() => setActiveTab('raw')} className={`py-4 px-1 border-b-2 font-black text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'raw' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <Layers size={18} /> วัตถุดิบซื้อมา ({rawMaterials.length})
          </button>
        </nav>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="ค้นหาชื่อรายการ..." className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl w-full bg-white text-slate-900 shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-6 py-4">{t('inv.itemName')}</th>
              <th className="px-6 py-4">แหล่งที่มา</th>
              <th className="px-6 py-4 text-right">จำนวนคงคลัง</th>
              {(activeTab !== 'finished') && <th className="px-6 py-4 text-right text-orange-600">ยอดจอง (BOM)</th>}
              <th className="px-6 py-4 text-center">{t('inv.unit')}</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((item) => {
              const reserved = reservedQuantities[item.id] || 0;
              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                  <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase flex items-center gap-1 w-fit ${item.source === 'Produced' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                          {item.source === 'Produced' ? <Factory size={10}/> : null}
                          {item.source === 'Produced' ? 'ผลิตเอง' : 'จัดซื้อ'}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{(item.quantity || 0).toLocaleString()}</td>
                  {(activeTab !== 'finished') && <td className="px-6 py-4 text-right font-mono text-orange-600">-{reserved.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>}
                  <td className="px-6 py-4 text-center text-slate-500 font-medium">{item.unit || 'pcs'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setEditingItem(item)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"><Edit3 size={18} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-800">ปรับปรุงยอดคงคลัง</h3>
                    <button onClick={() => setEditingItem(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">ชื่อรายการ</label>
                        <div className="font-bold text-slate-800">{editingItem.name}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">จำนวน ({editingItem.unit})</label>
                            <input type="number" value={editingItem.quantity || ''} onChange={e => setEditingItem({...editingItem, quantity: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono font-bold text-primary-600" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">แหล่งที่มา</label>
                            <select value={editingItem.source} onChange={e => setEditingItem({...editingItem, source: e.target.value as any})} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                                <option value="Purchased">จัดซื้อ</option>
                                <option value="Produced">ผลิตเอง</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button onClick={() => setEditingItem(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl">ยกเลิก</button>
                    <button onClick={handleUpdateStock} className="flex-1 py-3 bg-primary-600 text-white font-black rounded-xl shadow-lg hover:bg-primary-700 flex items-center justify-center gap-2"><Save size={18}/> บันทึก</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
