
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Search, Plus, Printer, Edit2, Trash2, ChevronDown, 
    ChevronUp, Save, X, CheckCircle2, AlertTriangle, FileText, Package,
    Database, Droplet, ChevronLeft, ChevronRight
} from 'lucide-react';
import { ProductionDocument, ProductionDocumentItem, MoldingLog, Product } from '../types';
import SearchableSelect from '../components/SearchableSelect';

const generateId = () => Math.random().toString(36).substr(2, 9);
const ITEMS_PER_PAGE = 10;

const Orders: React.FC = () => {
  const data = useFactoryData();
  const { production_documents = [], factory_products = [], packing_raw_materials = [] } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<ProductionDocument | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const productOptions = useMemo(() => 
    factory_products.map(p => ({ value: p.name, label: p.name }))
  , [factory_products]);

  const calculateBOMRequirements = (doc: ProductionDocument) => {
    const requirements: Record<string, { name: string, needed: number, current: number, unit: string }> = {};
    doc.items.forEach(item => {
        const product = factory_products.find(p => p.name === item.productName || p.id === item.productId);
        if (product && product.bom) {
            product.bom.forEach(bom => {
                const totalNeeded = bom.quantityPerUnit * item.quantity;
                if (!requirements[bom.materialId]) {
                    const mat = packing_raw_materials.find(m => m.id === bom.materialId);
                    requirements[bom.materialId] = { name: bom.materialName, needed: 0, current: mat?.quantity || 0, unit: mat?.unit || 'kg' };
                }
                requirements[bom.materialId].needed += totalNeeded;
            });
        }
    });
    return requirements;
  };

  const toggleExpand = (id: string) => {
    setExpandedDocs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredDocs = useMemo(() => {
    return production_documents.filter(doc => 
        doc.docNumber.toLowerCase().includes(search.toLowerCase()) || 
        doc.customerName.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [production_documents, search]);

  const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE);
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDocs, currentPage]);

  const handleSaveDoc = async () => {
    if (!currentDoc) return;
    let updatedDocs = [...production_documents];
    const idx = updatedDocs.findIndex(d => d.id === currentDoc.id);
    if (idx >= 0) updatedDocs[idx] = currentDoc;
    else updatedDocs.push(currentDoc);

    await updateData({ ...data, production_documents: updatedDocs });
    setIsEditModalOpen(false);
    setCurrentDoc(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">แผนการผลิต (Sales Orders)</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[4px] mt-1">Planning & Order Tracking</p>
        </div>
        <button onClick={() => { setCurrentDoc({ id: generateId(), docNumber: `PO-${new Date().getFullYear()}${String(production_documents.length + 1).padStart(3, '0')}`, date: new Date().toISOString().split('T')[0], customerName: '', status: 'Draft', items: [{ id: generateId(), productId: '', productName: '', quantity: 0, unit: 'pcs', dueDate: '', note: '' }], createdBy: 'Admin' }); setIsEditModalOpen(true); }} className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-slate-800 transition-all active:scale-95"><Plus size={20} /> สร้างใบสั่งผลิตใหม่</button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="ค้นหาเลขที่ PO หรือลูกค้า..." className="w-full pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary-50 transition-all outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronLeft size={20}/></button>
                <span className="text-sm font-black text-slate-600">หน้า {currentPage} จาก {totalPages || 1}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronRight size={20}/></button>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 w-12"></th>
                <th className="px-6 py-5">PO Number</th>
                <th className="px-6 py-5">Customer</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDocs.map((doc) => {
                const bomReqs = calculateBOMRequirements(doc);
                const hasShortage = Object.values(bomReqs).some(r => r.needed > r.current);
                return (
                  <React.Fragment key={doc.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4"><button onClick={() => toggleExpand(doc.id)} className="text-slate-400">{expandedDocs.includes(doc.id) ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button></td>
                      <td className="px-6 py-4 font-black text-primary-600 font-mono">{doc.docNumber}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{doc.customerName}</td>
                      <td className="px-6 py-4 text-slate-500">{doc.date}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase flex items-center justify-center gap-1 w-fit mx-auto ${doc.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : hasShortage ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {hasShortage ? <AlertTriangle size={10}/> : null} {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button onClick={() => { setCurrentDoc({...doc}); setIsEditModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                           <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"><Printer size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isEditModalOpen && currentDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
                  <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">รายละเอียดใบสั่งผลิต</h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><X size={28}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-10 py-8 space-y-6 max-h-[70vh]">
                      <div className="grid grid-cols-2 gap-6">
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">ชื่อลูกค้า</label><input type="text" value={currentDoc.customerName} onChange={e => setCurrentDoc({...currentDoc, customerName: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold" /></div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">วันที่สั่งผลิต</label><input type="date" value={currentDoc.date} onChange={e => setCurrentDoc({...currentDoc, date: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold" /></div>
                      </div>
                      <div className="space-y-4 pt-4">
                          <div className="flex items-center justify-between"><h4 className="font-black text-slate-700 uppercase text-xs tracking-widest">รายการสินค้า</h4><button onClick={() => setCurrentDoc({...currentDoc, items: [...currentDoc.items, { id: generateId(), productId: '', productName: '', quantity: 0, unit: 'pcs', dueDate: currentDoc.date, note: '' }]})} className="text-primary-600 text-xs font-black hover:underline">+ เพิ่มรายการ</button></div>
                          {currentDoc.items.map((item, idx) => (
                              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-end gap-4">
                                  <div className="flex-1"><SearchableSelect options={productOptions} value={item.productName} onChange={val => { const newItems = [...currentDoc.items]; newItems[idx].productName = val; setCurrentDoc({...currentDoc, items: newItems}); }} /></div>
                                  <div className="w-24"><input type="number" value={item.quantity || ''} onChange={e => { const newItems = [...currentDoc.items]; newItems[idx].quantity = parseFloat(e.target.value) || 0; setCurrentDoc({...currentDoc, items: newItems}); }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-black text-right" /></div>
                                  <button onClick={() => setCurrentDoc({...currentDoc, items: currentDoc.items.filter((_, i) => i !== idx)})} className="p-2 text-rose-300 hover:text-rose-500"><Trash2 size={20}/></button>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                      <button onClick={() => setIsEditModalOpen(false)} className="px-8 py-4 text-slate-500 font-black hover:bg-slate-200 rounded-2xl transition-all">ยกเลิก</button>
                      <button onClick={handleSaveDoc} className="px-12 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95">บันทึกข้อมูล</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Orders;
