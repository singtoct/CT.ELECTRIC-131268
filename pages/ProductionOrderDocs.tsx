import React, { useState, useRef } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    FileText, Plus, Printer, Search, Trash2, X, Save, 
    Calendar, User, ChevronRight, PenTool, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { ProductionDocument, ProductionDocumentItem, MoldingLog } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const ProductionOrderDocs: React.FC = () => {
    const data = useFactoryData();
    const { production_documents = [], factory_products = [], packing_raw_materials = [] } = data;
    const { updateData } = useFactoryActions();
    const { t } = useTranslation();

    const [view, setView] = useState<'list' | 'create' | 'view'>('list');
    const [search, setSearch] = useState('');
    const [currentDoc, setCurrentDoc] = useState<ProductionDocument | null>(null);

    const checkMaterials = (doc: ProductionDocument) => {
        let shortage = false;
        const requirements: Record<string, number> = {};
        doc.items.forEach(item => {
            const product = factory_products.find(p => p.id === item.productId || p.name === item.productName);
            if (product && product.bom) {
                product.bom.forEach(bom => {
                    requirements[bom.materialId] = (requirements[bom.materialId] || 0) + (bom.quantityPerUnit * item.quantity);
                });
            }
        });
        Object.entries(requirements).forEach(([id, req]) => {
            const mat = packing_raw_materials.find(m => m.id === id);
            if (!mat || mat.quantity < req) shortage = true;
        });
        return { shortage, requirements };
    };

    const handleApprove = async (doc: ProductionDocument) => {
        const { shortage } = checkMaterials(doc);
        const updatedDoc: ProductionDocument = { 
            ...doc, 
            status: shortage ? 'Material Checking' : 'Approved',
            materialShortage: shortage 
        };
        const newLogs: MoldingLog[] = shortage ? [] : doc.items.map(item => ({
            id: generateId(),
            jobId: `JOB-${doc.docNumber}-${generateId().substring(0,3).toUpperCase()}`,
            orderId: doc.id,
            productName: item.productName,
            productId: item.productId,
            lotNumber: doc.docNumber,
            date: new Date().toISOString().split('T')[0],
            status: 'รอฉีด',
            machine: 'ยังไม่ระบุ',
            quantityProduced: 0,
            quantityRejected: 0,
            operatorName: '---รอการมอบหมาย---',
            shift: 'เช้า',
            targetQuantity: item.quantity
        }));
        await updateData({ 
            ...data, 
            production_documents: production_documents.map(d => d.id === doc.id ? updatedDoc : d),
            molding_logs: [...(data.molding_logs || []), ...newLogs]
        });
        setCurrentDoc(updatedDoc);
    };

    const handleSave = async () => {
        if (!currentDoc) return;
        let newDocs = [...production_documents];
        const idx = newDocs.findIndex(d => d.id === currentDoc.id);
        if (idx >= 0) newDocs[idx] = currentDoc;
        else newDocs.push(currentDoc);
        await updateData({ ...data, production_documents: newDocs });
        setView('list');
    };

    const updateItem = (index: number, field: keyof ProductionDocumentItem, value: any) => {
        if (!currentDoc) return;
        const newItems = currentDoc.items.map((item, i) => i === index ? { ...item, [field]: value } : item);
        setCurrentDoc({ ...currentDoc, items: newItems });
    };

    const getPrintTextSize = (text: string) => {
        if (!text) return 'text-sm';
        const len = text.length;
        if (len > 55) return 'text-[9px] leading-tight tracking-tight'; 
        if (len > 45) return 'text-[10px] leading-tight tracking-tight'; 
        if (len > 35) return 'text-[11px] leading-tight'; 
        return 'text-sm';
    };

    if (view === 'list') {
        return (
            <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800">{t('po.title')}</h2>
                        <p className="text-sm text-slate-500">{t('po.subtitle')}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setCurrentDoc({
                          id: generateId(),
                          docNumber: `PO-${new Date().getFullYear()}${String(production_documents.length+1).padStart(3,'0')}`,
                          date: new Date().toISOString().split('T')[0],
                          customerName: '',
                          status: 'Draft',
                          items: [{ id: generateId(), productId: '', productName: '', quantity: 0, unit: 'pcs', dueDate: '', note: '' }],
                          createdBy: 'Admin'
                        });
                        setView('create');
                      }} 
                      className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-primary-700 shadow-sm transition-all"
                    >
                        <Plus size={18} /> {t('po.create')}
                    </button>
                </div>

                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder={t('orders.search')} className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full bg-white text-slate-900" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 whitespace-nowrap">
                              <tr>
                                  <th className="px-6 py-4">{t('po.docNo')}</th>
                                  <th className="px-6 py-4">{t('po.date')}</th>
                                  <th className="px-6 py-4">{t('po.customer')}</th>
                                  <th className="px-6 py-4 text-center">{t('orders.status')}</th>
                                  <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {production_documents.filter(d => d.docNumber.includes(search)).map(doc => (
                                  <tr key={doc.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setCurrentDoc(doc); setView('view'); }}>
                                      <td className="px-6 py-4 font-mono font-bold text-primary-600">{doc.docNumber}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">{doc.date}</td>
                                      <td className="px-6 py-4 font-medium truncate max-w-[150px]">{doc.customerName}</td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold border flex items-center justify-center gap-1 mx-auto whitespace-nowrap
                                              ${doc.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                doc.status === 'Material Checking' ? 'bg-red-50 text-red-700 border-red-200' : 
                                                'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                              {doc.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                          <div className="flex items-center justify-end gap-2">
                                              <button onClick={() => { setCurrentDoc(doc); setView('create'); }} className="p-1.5 text-slate-400 hover:text-primary-600 rounded hover:bg-primary-50"><PenTool size={16} /></button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'create' && currentDoc) {
        return (
            <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium">
                        <ChevronRight className="rotate-180" size={16} /> {t('mach.cancel')}
                    </button>
                    <h2 className="text-lg font-bold text-slate-800">{t('po.formTitle')}</h2>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 space-y-4 md:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{t('po.docNo')}</label>
                            <input type="text" value={currentDoc.docNumber} onChange={e => setCurrentDoc({...currentDoc, docNumber: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{t('po.date')}</label>
                            <input type="date" value={currentDoc.date} onChange={e => setCurrentDoc({...currentDoc, date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{t('po.customer')}</label>
                            <input type="text" value={currentDoc.customerName} onChange={e => setCurrentDoc({...currentDoc, customerName: e.target.value})} placeholder="Customer Name..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {currentDoc.items.map((item, idx) => (
                            <div key={item.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3 md:space-y-0 md:flex md:items-center md:gap-3 transition-all">
                                <div className="hidden md:flex w-6 justify-center text-slate-300 font-bold text-xs">{idx + 1}</div>
                                <div className="flex-1">
                                    <label className="md:hidden block text-[10px] font-bold text-slate-400 mb-1 uppercase">{t('inv.itemName')}</label>
                                    <input type="text" placeholder="Product Description..." value={item.productName} onChange={e => updateItem(idx, 'productName', e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 md:flex md:w-auto gap-3">
                                    <div className="md:w-24">
                                        <label className="md:hidden block text-[10px] font-bold text-slate-400 mb-1 uppercase">{t('orders.quantity')}</label>
                                        <input type="number" placeholder="Qty" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm text-right font-mono" />
                                    </div>
                                    <div className="md:w-20">
                                        <label className="md:hidden block text-[10px] font-bold text-slate-400 mb-1 uppercase">{t('inv.unit')}</label>
                                        <input type="text" placeholder="Unit" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm text-center" />
                                    </div>
                                </div>
                                <div className="md:w-32">
                                    <label className="md:hidden block text-[10px] font-bold text-slate-400 mb-1 uppercase">{t('orders.dueDate')}</label>
                                    <input type="date" value={item.dueDate} onChange={e => updateItem(idx, 'dueDate', e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-xs" />
                                </div>
                                <button onClick={() => setCurrentDoc({...currentDoc, items: currentDoc.items.filter((_, i) => i !== idx)})} className="w-full md:w-auto p-2 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2 md:block border md:border-none border-red-100">
                                    <Trash2 size={16} /> <span className="md:hidden text-xs font-bold">Remove Item</span>
                                </button>
                            </div>
                        ))}
                        <button onClick={() => setCurrentDoc({...currentDoc, items: [...currentDoc.items, { id: generateId(), productId: '', productName: '', quantity: 0, unit: 'pcs', dueDate: '', note: '' }]})} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all text-sm font-bold flex justify-center items-center gap-2">
                            <Plus size={18} /> {t('po.addItem')}
                        </button>
                    </div>

                    <div className="flex justify-end pt-4 md:pt-6 border-t border-slate-100">
                        <button onClick={handleSave} className="w-full md:w-auto bg-green-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center justify-center gap-2">
                            <Save size={20} /> {t('set.saveAll')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'view' && currentDoc) {
        return (
            <div className="space-y-6">
                <style type="text/css" media="print">{`
                  @page { size: auto; margin: 0mm; }
                  .print-hidden { display: none !important; }
                  .print-container { position: absolute; top: 0; left: 0; width: 210mm; min-height: 297mm; padding: 15mm 20mm; background: white; }
                  table { border-collapse: collapse; width: 100%; }
                  th, td { border: 1px solid #000; color: #000; }
                `}</style>
                <div className="flex items-center justify-between print-hidden">
                    <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"><ChevronRight className="rotate-180" size={16} /> {t('mach.cancel')}</button>
                    <div className="flex gap-2 md:gap-3">
                        {currentDoc.status === 'Draft' && (
                            <button onClick={() => handleApprove(currentDoc)} className="p-2 md:px-4 md:py-2 bg-green-600 text-white rounded-lg font-bold shadow-lg hover:bg-green-700 flex items-center gap-2">
                                <CheckCircle2 size={18}/> <span className="hidden sm:inline">Approve</span>
                            </button>
                        )}
                        <button onClick={() => window.print()} className="p-2 md:px-5 md:py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 flex items-center gap-2">
                            <Printer size={18} /> <span className="hidden sm:inline">{t('po.print')}</span>
                        </button>
                    </div>
                </div>
                <div className="bg-white shadow-xl mx-auto print-container p-4 md:p-10 border md:border-none" style={{ width: '100%', maxWidth: '210mm' }}>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pb-4 border-b-2 border-slate-900">
                        <div className="flex items-start gap-4">
                            {data.factory_settings.companyInfo.logoUrl && <img src={data.factory_settings.companyInfo.logoUrl} className="h-12 w-24 md:h-16 md:w-32 object-contain shrink-0"/>}
                            <div>
                                <h1 className="text-sm md:text-xl font-bold uppercase">{data.factory_settings.companyInfo.name}</h1>
                                <p className="text-[10px] md:text-xs text-slate-500">{data.factory_settings.companyInfo.address}<br/>Tax ID: {data.factory_settings.companyInfo.taxId}</p>
                            </div>
                        </div>
                        <div className="text-right w-full sm:w-auto">
                            <h2 className="text-xl md:text-3xl font-bold uppercase">{t('po.docHeader')}</h2>
                            <p className="text-xs md:text-sm font-bold mt-2">{t('po.docNo')}: <span className="font-mono">{currentDoc.docNumber}</span></p>
                            <p className="text-xs md:text-sm">{t('po.date')}: {currentDoc.date}</p>
                        </div>
                    </div>
                    <div className="mb-6 p-4 border border-slate-300 bg-slate-50">
                        <span className="font-bold uppercase text-[10px] block mb-1">{t('po.customer')}</span>
                        <span className="text-sm md:text-lg font-bold">{currentDoc.customerName}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs md:text-sm border-collapse table-fixed min-w-[600px] md:min-w-0">
                          <thead>
                              <tr className="bg-slate-100">
                                  <th className="border border-slate-300 p-2 w-10 text-center">#</th>
                                  <th className="border border-slate-300 p-2 text-left">{t('inv.itemName')}</th>
                                  <th className="border border-slate-300 p-2 w-20 text-center">{t('orders.dueDate')}</th>
                                  <th className="border border-slate-300 p-2 w-24 text-right">{t('orders.quantity')}</th>
                                  <th className="border border-slate-300 p-2 w-16 text-center">{t('inv.unit')}</th>
                                  <th className="border border-slate-300 p-2 w-24 text-left">{t('po.note')}</th>
                              </tr>
                          </thead>
                          <tbody>
                              {currentDoc.items.map((item, idx) => (
                                  <tr key={item.id} className="h-9">
                                      <td className="border border-slate-300 p-2 text-center text-[10px]">{idx + 1}</td>
                                      <td className={`border border-slate-300 p-2 font-bold whitespace-nowrap overflow-hidden text-ellipsis align-middle ${getPrintTextSize(item.productName)}`}>{item.productName}</td>
                                      <td className="border border-slate-300 p-2 text-center text-[10px]">{item.dueDate}</td>
                                      <td className="border border-slate-300 p-2 text-right font-bold font-mono">{item.quantity.toLocaleString()}</td>
                                      <td className="border border-slate-300 p-2 text-center text-[10px]">{item.unit}</td>
                                      <td className="border border-slate-300 p-2 text-[10px] italic">{item.note}</td>
                                  </tr>
                              ))}
                              {Array.from({ length: Math.max(0, 10 - currentDoc.items.length) }).map((_, i) => <tr key={i} className="h-9"><td className="border border-slate-300"/><td className="border border-slate-300"/><td className="border border-slate-300"/><td className="border border-slate-300"/><td className="border border-slate-300"/><td className="border border-slate-300"/></tr>)}
                          </tbody>
                      </table>
                    </div>
                    <div className="mt-8 grid grid-cols-3 gap-2 md:gap-8">
                        {['ordered', 'approved', 'received'].map(role => (
                            <div key={role} className="text-center">
                                <div className="h-12 md:h-20 border border-slate-300 mb-2 bg-slate-50/30"></div>
                                <p className="text-[9px] md:text-xs font-bold uppercase">{t(`po.sign.${role}`)}</p>
                                <div className="mt-1 text-[8px] md:text-[10px] border-t border-slate-400 pt-1">Date: ___/___/___</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default ProductionOrderDocs;