import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Search, Filter, Plus, Printer, Edit2, Trash2, ChevronDown, 
    ChevronUp, Save, X, CheckCircle2, AlertTriangle, FileText, Package,
    Database, Droplet
} from 'lucide-react';
import { ProductionDocument, ProductionDocumentItem, MoldingLog, Product } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const Orders: React.FC = () => {
  const data = useFactoryData();
  const { production_documents = [], factory_products = [], packing_raw_materials = [] } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<ProductionDocument | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<string[]>([]);

  // Function to calculate Material Requirements for a specific PO
  const calculateBOMRequirements = (doc: ProductionDocument) => {
    const requirements: Record<string, { name: string, needed: number, current: number, unit: string }> = {};
    
    doc.items.forEach(item => {
        // Find product to get its BOM
        const product = factory_products.find(p => p.name === item.productName || p.id === item.productId);
        if (product && product.bom) {
            product.bom.forEach(bom => {
                const totalNeeded = bom.quantityPerUnit * item.quantity;
                if (!requirements[bom.materialId]) {
                    const mat = packing_raw_materials.find(m => m.id === bom.materialId);
                    requirements[bom.materialId] = {
                        name: bom.materialName,
                        needed: 0,
                        current: mat?.quantity || 0,
                        unit: mat?.unit || 'kg'
                    };
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

  const handleSaveDoc = async () => {
    if (!currentDoc) return;
    let updatedDocs = [...production_documents];
    const idx = updatedDocs.findIndex(d => d.id === currentDoc.id);
    let updatedLogs = [...(data.molding_logs || [])];
    
    if (idx >= 0) {
        updatedDocs[idx] = currentDoc;
        currentDoc.items.forEach(item => {
            updatedLogs = updatedLogs.map(log => {
                if (log.orderId === currentDoc.id && log.productName === item.productName && log.status === 'รอฉีด') {
                    return { ...log, targetQuantity: item.quantity };
                }
                return log;
            });
        });
    } else {
        updatedDocs.push(currentDoc);
    }

    await updateData({ ...data, production_documents: updatedDocs, molding_logs: updatedLogs });
    setIsEditModalOpen(false);
    setCurrentDoc(null);
  };

  const handleCreateNew = () => {
      setCurrentDoc({
          id: generateId(),
          docNumber: `PO-${new Date().getFullYear()}${String(production_documents.length + 1).padStart(3, '0')}`,
          date: new Date().toISOString().split('T')[0],
          customerName: '',
          status: 'Draft',
          items: [{ id: generateId(), productId: '', productName: '', quantity: 0, unit: 'pcs', dueDate: '', note: '' }],
          createdBy: 'Admin'
      });
      setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('orders.title')}</h2>
          <p className="text-slate-500">จัดการแผนการผลิตและตรวจสอบวัตถุดิบ (BOM)</p>
        </div>
        <button onClick={handleCreateNew} className="flex items-center justify-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95"><Plus size={20} /> {t('po.create')}</button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="ค้นหาเลขที่ PO หรือชื่อลูกค้า..." className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 outline-none shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-4 w-12"></th>
                <th className="px-6 py-4">{t('po.docNo')}</th>
                <th className="px-6 py-4">{t('po.customer')}</th>
                <th className="px-6 py-4">{t('po.date')}</th>
                <th className="px-6 py-4 text-center">{t('orders.status')}</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => {
                const bomReqs = calculateBOMRequirements(doc);
                const hasShortage = Object.values(bomReqs).some(r => r.needed > r.current);
                
                return (
                  <React.Fragment key={doc.id}>
                    <tr className="hover:bg-slate-50 group transition-colors">
                      <td className="px-6 py-4">
                        <button onClick={() => toggleExpand(doc.id)} className="text-slate-400 hover:text-primary-600">
                          {expandedDocs.includes(doc.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-primary-600">{doc.docNumber}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{doc.customerName}</td>
                      <td className="px-6 py-4 text-slate-500">{doc.date}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase flex items-center justify-center gap-1 w-fit mx-auto
                          ${doc.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                            hasShortage ? 'bg-red-50 text-red-700 border-red-200' : 
                            'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {hasShortage ? <AlertTriangle size={10}/> : null}
                          {hasShortage ? 'Material Checking' : doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setCurrentDoc(doc); setIsPrintViewOpen(true); setTimeout(() => { window.print(); setIsPrintViewOpen(false); }, 500); }} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"><Printer size={18} /></button>
                          <button onClick={() => { setCurrentDoc({ ...doc, items: doc.items.map(i => ({ ...i })) }); setIsEditModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={18} /></button>
                          <button onClick={async () => { if(confirm("Delete PO?")) await updateData({...data, production_documents: production_documents.filter(d => d.id !== doc.id)}); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                    {expandedDocs.includes(doc.id) && (
                      <tr>
                        <td colSpan={6} className="px-6 py-6 bg-slate-50/50 border-y border-slate-100">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Items List */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                <Package size={16} className="text-primary-600"/>
                                <span className="text-xs font-bold text-slate-700 uppercase">รายการสินค้าใน PO</span>
                              </div>
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left">Item Name</th>
                                    <th className="px-4 py-2 text-right">Quantity</th>
                                    <th className="px-4 py-2 text-center">Unit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {doc.items.map((item, i) => (
                                    <tr key={i}>
                                      <td className="px-4 py-3 font-medium text-slate-700">{item.productName}</td>
                                      <td className="px-4 py-3 text-right font-mono font-bold">{item.quantity.toLocaleString()}</td>
                                      <td className="px-4 py-3 text-center text-slate-400">{item.unit}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* BOM Check */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                <Droplet size={16} className="text-blue-600"/>
                                <span className="text-xs font-bold text-slate-700 uppercase">การตรวจสอบวัตถุดิบ (BOM Analysis)</span>
                              </div>
                              <div className="p-4 space-y-4">
                                {Object.keys(bomReqs).length > 0 ? Object.entries(bomReqs).map(([id, req]) => {
                                    const shortage = req.needed > req.current;
                                    return (
                                        <div key={id} className="space-y-1">
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-slate-600">{req.name}</span>
                                                <span className={shortage ? 'text-red-600' : 'text-green-600'}>
                                                    {shortage ? 'สต็อกไม่พอ' : 'สต็อกเพียงพอ'}
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${shortage ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((req.current / req.needed) * 100, 100)}%` }}></div>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                                <span>ต้องการ: {req.needed.toLocaleString()} {req.unit}</span>
                                                <span>คงเหลือ: {req.current.toLocaleString()} {req.unit}</span>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-6 text-slate-400 italic text-xs">ไม่พบสูตรการผลิตสำหรับสินค้ากลุ่มนี้</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal & Print (Keep as previous) */}
      {isEditModalOpen && currentDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-200">
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                          <h3 className="text-xl font-black text-slate-800">{currentDoc.id ? 'แก้ไขใบสั่งผลิต' : 'สร้างใบสั่งผลิตใหม่'}</h3>
                          <p className="text-xs text-slate-500 font-mono mt-1">{currentDoc.docNumber}</p>
                      </div>
                      <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                      {/* Form Inputs (Same as before) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">ชื่อลูกค้า / แผนก</label>
                              <input type="text" value={currentDoc.customerName} onChange={e => setCurrentDoc({...currentDoc, customerName: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-slate-50 focus:bg-white transition-all" placeholder="ระบุชื่อลูกค้า..." />
                          </div>
                          <div>
                              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">วันที่สั่งผลิต</label>
                              <input type="date" value={currentDoc.date} onChange={e => setCurrentDoc({...currentDoc, date: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-slate-50" />
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                               <h4 className="font-bold text-slate-700 flex items-center gap-2"><Package size={18} className="text-primary-600"/> รายการสินค้า</h4>
                               <button onClick={() => setCurrentDoc({...currentDoc, items: [...currentDoc.items, { id: generateId(), productId: '', productName: '', quantity: 0, unit: 'pcs', dueDate: currentDoc.date, note: '' }]})} className="text-primary-600 text-sm font-bold hover:underline flex items-center gap-1"><Plus size={16}/> เพิ่มสินค้า</button>
                          </div>
                          <div className="space-y-3">
                              {currentDoc.items.map((item, idx) => (
                                  <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end group">
                                      <div className="md:col-span-5">
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">ชื่อสินค้า (จะนำไปเช็ค BOM อัตโนมัติ)</label>
                                          <input type="text" list="product-list" value={item.productName} onChange={e => { const newItems = [...currentDoc.items]; newItems[idx].productName = e.target.value; setCurrentDoc({...currentDoc, items: newItems}); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" placeholder="ระบุชื่อสินค้า..." />
                                          <datalist id="product-list">
                                              {factory_products.map(p => <option key={p.id} value={p.name} />)}
                                          </datalist>
                                      </div>
                                      <div className="md:col-span-2">
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">จำนวน</label>
                                          <input type="number" value={item.quantity || ''} onChange={e => { const newItems = [...currentDoc.items]; newItems[idx].quantity = parseFloat(e.target.value) || 0; setCurrentDoc({...currentDoc, items: newItems}); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-right font-mono font-bold" />
                                      </div>
                                      <div className="md:col-span-2">
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">หน่วย</label>
                                          <input type="text" value={item.unit} onChange={e => { const newItems = [...currentDoc.items]; newItems[idx].unit = e.target.value; setCurrentDoc({...currentDoc, items: newItems}); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-center" />
                                      </div>
                                      <div className="md:col-span-2">
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">กำหนดส่ง</label>
                                          <input type="date" value={item.dueDate} onChange={e => { const newItems = [...currentDoc.items]; newItems[idx].dueDate = e.target.value; setCurrentDoc({...currentDoc, items: newItems}); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" />
                                      </div>
                                      <div className="md:col-span-1 text-right">
                                          <button onClick={() => setCurrentDoc({...currentDoc, items: currentDoc.items.filter((_, i) => i !== idx)})} className="p-2 text-red-300 hover:text-red-600 transition-colors"><Trash2 size={18}/></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl">ยกเลิก</button>
                      <button onClick={handleSaveDoc} className="px-8 py-3 bg-primary-600 text-white font-black rounded-xl shadow-lg hover:bg-primary-700 transition-all active:scale-95">บันทึกใบสั่งผลิต</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Orders;