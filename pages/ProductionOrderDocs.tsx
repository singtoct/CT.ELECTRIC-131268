
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../services/i18n';
import { 
    Plus, Printer, Search, Trash2, Save, 
    ChevronRight, PenTool, CheckCircle2, AlertTriangle, PackageSearch,
    Upload, FileText, ShoppingCart, ArrowRight, X, AlertOctagon, ScanLine,
    Box, Calculator, Calendar
} from 'lucide-react';
import { ProductionDocument, ProductionDocumentItem, MoldingLog, InventoryItem, FactoryPurchaseOrder } from '../types';
import SearchableSelect from '../components/SearchableSelect';

const generateId = () => Math.random().toString(36).substr(2, 9);

const ProductionOrderDocs: React.FC = () => {
    const data = useFactoryData();
    const { 
        production_documents = [], 
        factory_products = [], 
        packing_raw_materials = [],
        factory_purchase_orders = [],
        factory_suppliers = []
    } = data;
    const { updateData } = useFactoryActions();
    const { t } = useTranslation();
    const location = useLocation();

    const [view, setView] = useState<'list' | 'create' | 'view'>('list');
    const [search, setSearch] = useState('');
    const [currentDoc, setCurrentDoc] = useState<ProductionDocument | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect to handle navigation state (Pre-fill from Orders Page)
    useEffect(() => {
        if (location.state && location.state.prefillProduct) {
            const { prefillProduct, prefillQuantity } = location.state;
            const newDocId = generateId();
            setCurrentDoc({
                id: newDocId,
                docNumber: `PO-${new Date().getFullYear()}${String(production_documents.length + 1).padStart(3, '0')}`,
                date: new Date().toISOString().split('T')[0],
                customerName: '',
                status: 'Draft',
                items: [{ 
                    id: generateId(), 
                    productId: '', 
                    productName: prefillProduct, 
                    quantity: prefillQuantity || 0, 
                    unit: 'pcs', 
                    dueDate: new Date().toISOString().split('T')[0], 
                    note: 'Generated from MRP Plan' 
                }],
                createdBy: 'System (MRP)'
            });
            setView('create');
            // Clear state to prevent loop if user navigates back (optional, but good practice)
            window.history.replaceState({}, document.title);
        }
    }, [location.state, production_documents.length]);

    // Pre-calculate Product Options for Select
    const productOptions = useMemo(() => 
        factory_products.map(p => ({ value: p.name, label: p.name }))
    , [factory_products]);

    // --- LOGIC: Real-time BOM Check ---
    const checkMaterialsAndBOM = (doc: ProductionDocument) => {
        const requirements: Record<string, { 
            id: string, name: string, needed: number, current: number, unit: string, shortage: number 
        }> = {};
        
        let hasShortage = false;

        doc.items.forEach(item => {
            if (!item.productName || item.quantity <= 0) return;

            const product = factory_products.find(p => p.name === item.productName);
            if (product && product.bom) {
                product.bom.forEach(bom => {
                    const totalNeeded = bom.quantityPerUnit * item.quantity;
                    
                    if (!requirements[bom.materialId]) {
                        const mat = packing_raw_materials.find(m => m.id === bom.materialId);
                        requirements[bom.materialId] = {
                            id: bom.materialId,
                            name: bom.materialName,
                            needed: 0,
                            current: mat?.quantity || 0,
                            unit: mat?.unit || 'kg',
                            shortage: 0
                        };
                    }
                    requirements[bom.materialId].needed += totalNeeded;
                });
            }
        });

        // Calculate shortages
        Object.values(requirements).forEach(req => {
            if (req.needed > req.current) {
                req.shortage = req.needed - req.current;
                hasShortage = true;
            }
        });

        return { hasShortage, requirements };
    };

    // --- ACTIONS ---

    const handleApprove = async (doc: ProductionDocument) => {
        const { hasShortage } = checkMaterialsAndBOM(doc);
        
        const updatedDoc: ProductionDocument = { 
            ...doc, 
            status: hasShortage ? 'Material Checking' : 'Approved',
            materialShortage: hasShortage 
        };

        let newLogs: MoldingLog[] = [];
        if (!hasShortage) {
            newLogs = doc.items.map(item => ({
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
        }

        await updateData({ 
            ...data, 
            production_documents: production_documents.map(d => d.id === doc.id ? updatedDoc : d),
            molding_logs: [...(data.molding_logs || []), ...newLogs]
        });
        
        setCurrentDoc(updatedDoc);
        if (hasShortage) alert("แจ้งเตือน: วัตถุดิบไม่พอสำหรับการผลิต สถานะเปลี่ยนเป็น 'Material Checking'");
        else alert("อนุมัติสำเร็จ! ส่งข้อมูลไปยังฝ่ายผลิตแล้ว");
    };

    const handleSave = async () => {
        if (!currentDoc) return;
        const { hasShortage } = checkMaterialsAndBOM(currentDoc);
        const docToSave = { ...currentDoc, materialShortage: hasShortage };

        let newDocs = [...production_documents];
        const idx = newDocs.findIndex(d => d.id === docToSave.id);
        if (idx >= 0) newDocs[idx] = docToSave;
        else newDocs.push(docToSave);
        
        await updateData({ ...data, production_documents: newDocs });
        setView('list');
    };

    const handleCreatePurchaseRequest = async (materialId: string, shortageQty: number) => {
        if (!confirm(`ยืนยันการสร้างใบขอซื้อสำหรับวัตถุดิบนี้ (จำนวน ${shortageQty}) ?`)) return;

        const mat = packing_raw_materials.find(m => m.id === materialId);
        const newPO: FactoryPurchaseOrder = {
            id: generateId(),
            poNumber: `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
            status: 'Pending',
            orderDate: new Date().toISOString().split('T')[0],
            expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            supplierId: mat?.defaultSupplierId || factory_suppliers[0]?.id || '',
            items: [{ rawMaterialId: materialId, quantity: Math.ceil(shortageQty * 1.1), unitPrice: mat?.costPerUnit || 0 }], // Add 10% buffer
            linkedProductionDocId: currentDoc?.id
        };

        const updatedDocs = production_documents.map(d => 
            d.id === currentDoc?.id ? { ...d, purchaseRequestId: newPO.id } : d
        );

        await updateData({
            ...data,
            factory_purchase_orders: [...factory_purchase_orders, newPO],
            production_documents: updatedDocs
        });

        if (currentDoc) setCurrentDoc({ ...currentDoc, purchaseRequestId: newPO.id });
        alert("สร้างใบขอซื้อ (PR) เรียบร้อยแล้ว ข้อมูลส่งไปยังฝ่ายจัดซื้อ");
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentDoc) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            const updatedDoc = { ...currentDoc, signedImageUrl: base64String };
            
            await updateData({
                ...data,
                production_documents: production_documents.map(d => d.id === currentDoc.id ? updatedDoc : d)
            });
            setCurrentDoc(updatedDoc);
            alert("บันทึกเอกสารที่มีลายเซ็นเรียบร้อยแล้ว");
        };
        reader.readAsDataURL(file);
    };

    const updateItem = (index: number, field: keyof ProductionDocumentItem, value: any) => {
        if (!currentDoc) return;
        const newItems = currentDoc.items.map((item, i) => i === index ? { ...item, [field]: value } : item);
        setCurrentDoc({ ...currentDoc, items: newItems });
    };

    // --- VIEWS ---

    if (view === 'list') {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">{t('po.title')}</h2>
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
                          items: [{ id: generateId(), productId: '', productName: '', quantity: 0, unit: 'pcs', dueDate: new Date().toISOString().split('T')[0], note: '' }],
                          createdBy: 'Admin'
                        });
                        setView('create');
                      }} 
                      className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg transition-all active:scale-95"
                    >
                        <Plus size={20} /> สร้างใบสั่งผลิตใหม่
                    </button>
                </div>

                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="ค้นหาเลขที่เอกสาร หรือ ชื่อลูกค้า..." className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-50 bg-white text-slate-900 font-bold" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-200">
                              <tr>
                                  <th className="px-6 py-5">เลขที่เอกสาร</th>
                                  <th className="px-6 py-5">วันที่สั่งผลิต</th>
                                  <th className="px-6 py-5">ลูกค้า</th>
                                  <th className="px-6 py-5 text-center">สถานะ</th>
                                  <th className="px-6 py-5 text-center">เอกสาร</th>
                                  <th className="px-6 py-5 text-right">จัดการ</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {production_documents.filter(d => d.docNumber.includes(search)).map(doc => (
                                  <tr key={doc.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setCurrentDoc(doc); setView('view'); }}>
                                      <td className="px-6 py-4 font-mono font-black text-slate-700">{doc.docNumber}</td>
                                      <td className="px-6 py-4">{doc.date}</td>
                                      <td className="px-6 py-4 font-bold text-slate-800">{doc.customerName || '-'}</td>
                                      <td className="px-6 py-4 text-center">
                                          <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase inline-flex items-center gap-1
                                              ${doc.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                doc.status === 'Material Checking' ? 'bg-red-50 text-red-700 border-red-200' : 
                                                'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                              {doc.status === 'Material Checking' && <AlertTriangle size={10}/>}
                                              {doc.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          {doc.signedImageUrl ? (
                                              <span className="text-green-600 flex items-center justify-center gap-1 text-xs font-bold"><CheckCircle2 size={14}/> Signed</span>
                                          ) : (
                                              <span className="text-slate-300 text-xs font-bold">Pending</span>
                                          )}
                                      </td>
                                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                          <div className="flex items-center justify-end gap-2">
                                              <button onClick={() => { setCurrentDoc(doc); setView('create'); }} className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"><PenTool size={18} /></button>
                                              <button onClick={() => { if(confirm('ต้องการลบเอกสารนี้?')) updateData({...data, production_documents: production_documents.filter(d => d.id !== doc.id)})}} className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={18} /></button>
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
        const { hasShortage, requirements } = checkMaterialsAndBOM(currentDoc);
        
        return (
            <div className="fixed inset-0 z-50 bg-slate-100 flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in duration-200">
                <div className="bg-white w-full max-w-7xl h-full md:h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
                    
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">แก้ไขใบสั่งผลิต</h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Production Order Editor</p>
                        </div>
                        <button onClick={() => setView('list')} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                            <X size={28} />
                        </button>
                    </div>

                    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                        {/* LEFT COLUMN: FORM */}
                        <div className="flex-1 flex flex-col border-r border-slate-100 overflow-y-auto custom-scrollbar bg-slate-50/30">
                            <div className="p-8 space-y-8">
                                {/* Top Row Inputs */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Calendar size={14}/> วันครบกำหนด
                                        </label>
                                        <input 
                                            type="date" 
                                            value={currentDoc.date} 
                                            onChange={e => setCurrentDoc({...currentDoc, date: e.target.value})} 
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <FileText size={14}/> ออเดอร์ Lot (PO No.)
                                        </label>
                                        <input 
                                            type="text" 
                                            value={currentDoc.docNumber} 
                                            onChange={e => setCurrentDoc({...currentDoc, docNumber: e.target.value})} 
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl font-black text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm bg-slate-50" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ลูกค้า</label>
                                    <input 
                                        type="text" 
                                        value={currentDoc.customerName} 
                                        onChange={e => setCurrentDoc({...currentDoc, customerName: e.target.value})} 
                                        placeholder="ระบุชื่อลูกค้า..."
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" 
                                    />
                                </div>

                                {/* Items List */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">รายการสินค้า</label>
                                    <div className="space-y-3">
                                        {currentDoc.items.map((item, idx) => (
                                            <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-end gap-3 group hover:border-blue-400 transition-all">
                                                <div className="flex-1">
                                                    <label className="block text-[9px] font-bold text-slate-400 mb-1">สินค้า</label>
                                                    <SearchableSelect 
                                                        options={productOptions}
                                                        value={item.productName}
                                                        onChange={(val) => updateItem(idx, 'productName', val)}
                                                        placeholder="เลือกสินค้า..."
                                                        className="border-0 p-0"
                                                    />
                                                </div>
                                                <div className="w-28">
                                                    <label className="block text-[9px] font-bold text-slate-400 mb-1">จำนวน</label>
                                                    <input 
                                                        type="number" 
                                                        value={item.quantity || ''} 
                                                        onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} 
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-right font-black text-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                                    />
                                                </div>
                                                <button onClick={() => setCurrentDoc({...currentDoc, items: currentDoc.items.filter((_, i) => i !== idx)})} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl mb-0.5">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => setCurrentDoc({...currentDoc, items: [...currentDoc.items, { id: generateId(), productId: '', productName: '', quantity: 0, unit: 'pcs', dueDate: currentDoc.date, note: '' }]})} 
                                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={20} /> เพิ่มรายการสินค้า
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: MATERIAL CHECK (Reference Style) */}
                        <div className="w-full lg:w-[450px] bg-slate-50 flex flex-col border-l border-slate-100">
                            <div className="p-6 border-b border-slate-200 bg-white">
                                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                                    <Box size={20} className="text-slate-400"/> ตรวจสอบวัตถุดิบ (Check)
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">ระบบคำนวณอัตโนมัติตามสูตรผลิต</p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                {Object.values(requirements).length > 0 ? Object.values(requirements).map((req, idx) => (
                                    <div key={idx} className={`p-5 rounded-2xl border-2 transition-all ${req.shortage > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                                        <h4 className={`font-black text-sm mb-3 ${req.shortage > 0 ? 'text-red-700' : 'text-slate-700'}`}>{req.name}</h4>
                                        
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-bold">ต้องใช้:</span>
                                                <span className="font-mono font-bold text-slate-800">{req.needed.toLocaleString()} {req.unit}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs border-b border-slate-200/50 pb-2">
                                                <span className="text-slate-500 font-bold">มีในสต็อก:</span>
                                                <span className="font-mono font-bold text-slate-600">{req.current.toLocaleString()} {req.unit}</span>
                                            </div>
                                            
                                            {req.shortage > 0 ? (
                                                <div className="pt-1">
                                                    <div className="flex justify-between items-center text-red-600 font-black text-sm mb-3">
                                                        <span className="flex items-center gap-1"><AlertOctagon size={14}/> ขาด (Shortage)</span>
                                                        <span>-{req.shortage.toLocaleString()} {req.unit}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleCreatePurchaseRequest(req.id, req.shortage)}
                                                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-200 transition-all active:scale-95"
                                                    >
                                                        <ShoppingCart size={14}/> เปิดใบขอซื้อ (Create PR)
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="pt-1 flex items-center gap-2 text-green-600 font-black text-xs">
                                                    <CheckCircle2 size={16}/> เพียงพอ (Available)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 text-slate-400">
                                        <PackageSearch size={48} className="mx-auto mb-2 opacity-20"/>
                                        <p className="text-xs font-bold uppercase tracking-wide">ยังไม่มีข้อมูลวัตถุดิบ</p>
                                    </div>
                                )}
                            </div>

                            {/* Sticky Footer Actions */}
                            <div className="p-6 bg-white border-t border-slate-200 flex items-center justify-between gap-4">
                                <button onClick={() => setView('list')} className="px-6 py-3.5 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">
                                    ยกเลิก
                                </button>
                                <button 
                                    onClick={handleSave} 
                                    className={`flex-1 py-3.5 rounded-xl font-black text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95
                                        ${hasShortage ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}
                                >
                                    <Save size={20}/> {hasShortage ? "บันทึก (สถานะ: รอของ)" : "บันทึกใบสั่งผลิต"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'view' && currentDoc) {
        const { hasShortage, requirements } = checkMaterialsAndBOM(currentDoc);
        
        return (
            <div className="space-y-6">
                <style type="text/css" media="print">{`
                  @page { size: A4; margin: 0mm; }
                  body { background: white; }
                  .print-hidden { display: none !important; }
                  .print-container { padding: 20mm; width: 100%; max-width: 210mm; margin: 0 auto; min-height: 297mm; }
                  .no-break { break-inside: avoid; }
                `}</style>

                <div className="flex items-center justify-between print-hidden">
                    <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-sm"><ChevronRight className="rotate-180" size={16} /> กลับหน้ารายการ</button>
                    <div className="flex gap-3">
                        {/* Signature Upload Button */}
                        <div className="relative">
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                className={`px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all text-sm
                                    ${currentDoc.signedImageUrl ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                                <ScanLine size={18}/> {currentDoc.signedImageUrl ? "อัปโหลดใหม่ (มีเอกสารแล้ว)" : "สแกน/อัปโหลด เอกสารที่เซ็นแล้ว"}
                            </button>
                        </div>

                        {currentDoc.status === 'Draft' || currentDoc.status === 'Material Checking' ? (
                            <button onClick={() => handleApprove(currentDoc)} className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black flex items-center gap-2 text-sm">
                                <CheckCircle2 size={18}/> {hasShortage ? "ยืนยัน (รอวัตถุดิบ)" : "อนุมัติการผลิต"}
                            </button>
                        ) : (
                             <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold border border-green-200 flex items-center gap-2 text-sm cursor-default">
                                <CheckCircle2 size={18}/> อนุมัติแล้ว
                             </div>
                        )}
                        <button onClick={() => window.print()} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 text-sm shadow-lg shadow-blue-200">
                            <Printer size={18} /> พิมพ์เอกสาร
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* DOCUMENT PREVIEW (Printable Area) */}
                    <div className="lg:col-span-2 bg-white shadow-2xl p-0 md:p-8 rounded-none md:rounded-[2rem] overflow-hidden print-container">
                        {/* Print Header */}
                        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-900">
                             <div className="flex items-start gap-4">
                                {data.factory_settings.companyInfo.logoUrl && <img src={data.factory_settings.companyInfo.logoUrl} className="h-16 w-32 object-contain shrink-0"/>}
                                <div>
                                    <h1 className="text-xl font-black uppercase tracking-tight">{data.factory_settings.companyInfo.name}</h1>
                                    <p className="text-xs text-slate-500 mt-1">{data.factory_settings.companyInfo.address}<br/>Tax ID: {data.factory_settings.companyInfo.taxId}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-black uppercase text-slate-900">ใบสั่งผลิต</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[4px] mb-2">Production Order</p>
                                <p className="text-sm font-bold">เลขที่: <span className="font-mono text-lg">{currentDoc.docNumber}</span></p>
                                <p className="text-sm text-slate-600">วันที่: {currentDoc.date}</p>
                            </div>
                        </div>

                        <div className="flex bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 gap-8">
                            <div className="flex-1">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ลูกค้า (Customer)</span>
                                <span className="text-lg font-bold text-slate-800">{currentDoc.customerName}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ผู้ทำรายการ</span>
                                <span className="text-sm font-bold text-slate-700">{currentDoc.createdBy}</span>
                            </div>
                        </div>

                        <table className="w-full text-sm border-collapse mb-8">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="p-3 w-12 text-center rounded-tl-lg">#</th>
                                    <th className="p-3 text-left">รายการสินค้า (Product Description)</th>
                                    <th className="p-3 w-32 text-center">กำหนดส่ง</th>
                                    <th className="p-3 w-32 text-right">จำนวน</th>
                                    <th className="p-3 w-20 text-center rounded-tr-lg">หน่วย</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentDoc.items.map((item, idx) => (
                                    <tr key={item.id} className="border-b border-slate-200">
                                        <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                                        <td className="p-4 font-bold text-slate-800 text-base">{item.productName}</td>
                                        <td className="p-4 text-center text-slate-600">{item.dueDate}</td>
                                        <td className="p-4 text-right font-black font-mono text-lg">{item.quantity.toLocaleString()}</td>
                                        <td className="p-4 text-center text-slate-500 font-bold">{item.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Signature Section */}
                        <div className="grid grid-cols-2 gap-20 mt-20 no-break">
                            <div className="text-center">
                                <div className="border-b-2 border-dashed border-slate-300 h-16 mb-4"></div>
                                <p className="font-bold text-sm">ผู้สั่งผลิต / ผู้จัดเตรียม</p>
                                <p className="text-xs text-slate-400 mt-1">วันที่: ____/____/____</p>
                            </div>
                            <div className="text-center relative">
                                {currentDoc.signedImageUrl && (
                                    // Simulated overlay of the signed image for digital viewing
                                    <div className="absolute -top-16 left-0 right-0 h-32 flex justify-center opacity-80 pointer-events-none mix-blend-multiply">
                                        <img src={currentDoc.signedImageUrl} className="h-full object-contain" alt="Signature"/>
                                    </div>
                                )}
                                <div className="border-b-2 border-slate-900 h-16 mb-4"></div>
                                <p className="font-bold text-sm">ผู้อนุมัติ (Manager / Owner)</p>
                                <p className="text-xs text-slate-400 mt-1">วันที่: ____/____/____</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDEBAR: DIGITAL ATTACHMENTS & STATUS */}
                    <div className="space-y-6 print-hidden">
                        {/* Attached Signed Document */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="text-blue-500"/> ไฟล์แนบ (Signed Document)</h3>
                            {currentDoc.signedImageUrl ? (
                                <div className="border-2 border-slate-100 rounded-xl overflow-hidden cursor-pointer group relative" onClick={() => {
                                    const w = window.open("");
                                    w?.document.write(`<img src="${currentDoc.signedImageUrl}" style="width:100%"/>`);
                                }}>
                                    <img src={currentDoc.signedImageUrl} className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"/>
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                                        <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">คลิกเพื่อดูภาพขยาย</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-40 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                    <ScanLine size={32} className="mb-2 opacity-50"/>
                                    <p className="text-xs font-bold">ยังไม่มีเอกสารแนบ</p>
                                </div>
                            )}
                        </div>

                        {/* BOM Status Summary */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><PackageSearch className="text-amber-500"/> สถานะวัตถุดิบ</h3>
                            <div className="space-y-3">
                                {Object.values(requirements).map((req, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                                        <span className="text-slate-600 font-medium">{req.name}</span>
                                        {req.shortage > 0 ? (
                                            <span className="text-red-500 font-black flex items-center gap-1"><AlertOctagon size={12}/> ขาด {req.shortage.toLocaleString()}</span>
                                        ) : (
                                            <span className="text-green-500 font-black flex items-center gap-1"><CheckCircle2 size={12}/> พอ</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {currentDoc.purchaseRequestId && (
                                <div className="mt-4 bg-blue-50 text-blue-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                                    <ShoppingCart size={14}/> มีการเปิด PR แล้ว (Ref: {factory_purchase_orders.find(p=>p.id===currentDoc.purchaseRequestId)?.poNumber})
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default ProductionOrderDocs;
