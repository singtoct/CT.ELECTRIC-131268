
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFactoryData, useFactoryActions, useApiKey } from '../App';
import { useTranslation } from '../services/i18n';
import { useLocation } from 'react-router-dom';
import { 
    ShoppingCart, Plus, Search, Filter, 
    FileText, CheckCircle2, AlertCircle, Trash2, 
    DollarSign, TrendingDown, Package, Sparkles, 
    Loader2, MapPin, Phone, Mail, X, Save,
    Truck, BarChart3, ArrowRight, Upload, ScanLine, FileType, FileImage
} from 'lucide-react';
import { FactoryPurchaseOrder, FactoryQuotation, FactorySupplier, InventoryItem } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import { GoogleGenAI, Type } from "@google/genai";

const generateId = () => Math.random().toString(36).substr(2, 9);

const Purchasing: React.FC = () => {
    const data = useFactoryData();
    const { 
        factory_purchase_orders = [], 
        factory_quotations = [],
        factory_suppliers = [],
        packing_raw_materials = []
    } = data;
    const { updateData } = useFactoryActions();
    const { t } = useTranslation();
    const { apiKey } = useApiKey();
    const location = useLocation();

    const [activeTab, setActiveTab] = useState<'po' | 'rfq' | 'restock'>('po');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [isPOModalOpen, setIsPOModalOpen] = useState(false);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    
    // Forms
    const [currentPO, setCurrentPO] = useState<Partial<FactoryPurchaseOrder>>({});
    const [currentQuote, setCurrentQuote] = useState<Partial<FactoryQuotation>>({});

    // Smart Supplier Lookup State
    const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
    const [isLookupLoading, setIsLookupLoading] = useState(false);
    const [tempSupplier, setTempSupplier] = useState<Partial<FactorySupplier> | null>(null);

    // Document Scanner State
    const [isScanLoading, setIsScanLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Load: Handle Navigation State (from ProductionDocs)
    useEffect(() => {
        if (location.state && location.state.shortageItems) {
            const { shortageItems, fromDoc } = location.state;
            setCurrentPO({
                id: generateId(),
                poNumber: `PO-${new Date().getFullYear()}${String(factory_purchase_orders.length + 1).padStart(3, '0')}`,
                orderDate: new Date().toISOString().split('T')[0],
                status: 'Pending',
                items: shortageItems.map((item: any) => ({
                    rawMaterialId: item.id,
                    quantity: item.missingQty,
                    unitPrice: 0
                })),
                linkedProductionDocId: fromDoc
            });
            setIsPOModalOpen(true);
            setActiveTab('po');
            // Clear state history
            window.history.replaceState({}, document.title);
        }
    }, [location.state, factory_purchase_orders.length]);

    // --- Helpers ---
    const supplierOptions = useMemo(() => 
        factory_suppliers.map(s => ({ value: s.id, label: s.name, subLabel: s.phone }))
    , [factory_suppliers]);

    const materialOptions = useMemo(() => 
        packing_raw_materials.map(m => ({ value: m.id, label: m.name, subLabel: `Stock: ${m.quantity} ${m.unit}` }))
    , [packing_raw_materials]);

    // --- Actions ---

    // 1. File Scanner (OCR) - Supports PDF & Images
    const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!apiKey) {
            alert("กรุณาตั้งค่า API Key ในหน้า Settings ก่อนใช้งานฟีเจอร์สแกน");
            return;
        }

        setIsScanLoading(true);
        try {
            // Convert file to Base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const mimeType = file.type;

                const ai = new GoogleGenAI({ apiKey });
                const prompt = `
                    Analyze this quotation/invoice document (Image or PDF).
                    Extract the following details (Thai/English supported):
                    1. Supplier Name (Company Name)
                    2. Product Details: Find the main raw material or item listed.
                    3. Price Per Unit: Extract the numeric value.
                    4. Unit: e.g., kg, pcs, set.
                    
                    Return JSON:
                    {
                        "supplierName": string,
                        "productName": string,
                        "pricePerUnit": number,
                        "unit": string
                    }
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        { inlineData: { mimeType: mimeType, data: base64Data } },
                        { text: prompt }
                    ],
                    config: {
                        responseMimeType: "application/json"
                    }
                });

                if (response.text) {
                    const result = JSON.parse(response.text);
                    console.log("Scan Result:", result);
                    
                    // Auto-fill Logic
                    let updates: any = {};
                    
                    // 1. Price & Unit
                    if (result.pricePerUnit) updates.pricePerUnit = result.pricePerUnit;
                    if (result.unit) updates.unit = result.unit;

                    // 2. Try to match Supplier
                    if (result.supplierName) {
                        const existingSup = factory_suppliers.find(s => 
                            s.name.toLowerCase().includes(result.supplierName.toLowerCase())
                        );
                        if (existingSup) {
                            updates.supplierId = existingSup.id;
                        } else {
                            // Prepare for smart lookup if new
                            setSupplierSearchTerm(result.supplierName);
                        }
                    }

                    // 3. Try to match Material
                    if (result.productName) {
                        const existingMat = packing_raw_materials.find(m => 
                            m.name.toLowerCase().includes(result.productName.toLowerCase())
                        );
                        if (existingMat) {
                            updates.rawMaterialId = existingMat.id;
                        }
                    }

                    setCurrentQuote(prev => ({ ...prev, ...updates }));
                }
            };
        } catch (error) {
            console.error("Scan Error", error);
            alert("ไม่สามารถสแกนเอกสารได้ กรุณาลองใหม่อีกครั้ง หรือตรวจสอบไฟล์");
        } finally {
            setIsScanLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // 2. Business Entity Lookup
    const handleSmartSupplierLookup = async (manualTerm?: string) => {
        const term = manualTerm || supplierSearchTerm;
        if (!term || !apiKey) {
            if (!apiKey) alert("Please set API Key in Settings first.");
            return;
        }
        setIsLookupLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Find business details for a supplier company named "${term}" in Thailand. 
            Return a JSON object with: name (string), address (string), phone (string), taxId (string).
            If exact details not found, try to infer plausible data or return generic placeholders but in valid format.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            address: { type: Type.STRING },
                            phone: { type: Type.STRING },
                            taxId: { type: Type.STRING }
                        }
                    }
                }
            });

            if (response.text) {
                const result = JSON.parse(response.text);
                setTempSupplier(result);
            }
        } catch (error) {
            console.error("AI Lookup Error", error);
            alert("Failed to lookup supplier. Check network or API key.");
        } finally {
            setIsLookupLoading(false);
        }
    };

    const handleConfirmSupplier = async () => {
        if (!tempSupplier) return;
        
        // Add to factory_suppliers
        const newSupplier: FactorySupplier = {
            id: generateId(),
            name: tempSupplier.name || supplierSearchTerm,
            address: tempSupplier.address || '',
            phone: tempSupplier.phone || '',
            taxId: tempSupplier.taxId,
            contactPerson: 'General Contact'
        };

        const updatedSuppliers = [...factory_suppliers, newSupplier];
        await updateData({ ...data, factory_suppliers: updatedSuppliers });
        
        // Auto-select in current form
        if (isQuoteModalOpen) {
            setCurrentQuote(prev => ({ ...prev, supplierId: newSupplier.id }));
        } else if (isPOModalOpen) {
            setCurrentPO(prev => ({ ...prev, supplierId: newSupplier.id }));
        }

        setTempSupplier(null);
        setSupplierSearchTerm('');
    };

    const handleSaveQuote = async () => {
        if (!currentQuote.rawMaterialId || !currentQuote.supplierId || !currentQuote.pricePerUnit) {
            alert("Please fill all required fields.");
            return;
        }
        
        const payload: FactoryQuotation = {
            id: currentQuote.id || generateId(),
            rawMaterialId: currentQuote.rawMaterialId,
            supplierId: currentQuote.supplierId,
            pricePerUnit: currentQuote.pricePerUnit,
            moq: currentQuote.moq || 0,
            unit: currentQuote.unit || 'unit',
            leadTimeDays: currentQuote.leadTimeDays || 0,
            paymentTerm: currentQuote.paymentTerm || 'Cash',
            quotationDate: currentQuote.quotationDate || new Date().toISOString().split('T')[0],
            validUntil: currentQuote.validUntil || new Date().toISOString().split('T')[0],
            note: currentQuote.note
        };

        const updatedQuotes = currentQuote.id 
            ? factory_quotations.map(q => q.id === payload.id ? payload : q)
            : [...factory_quotations, payload];

        await updateData({ ...data, factory_quotations: updatedQuotes });
        setIsQuoteModalOpen(false);
        setCurrentQuote({});
    };

    const handleSavePO = async () => {
        if (!currentPO.poNumber || !currentPO.supplierId || !currentPO.items?.length) {
            alert("Please fill required PO fields and add at least one item.");
            return;
        }

        const payload: FactoryPurchaseOrder = {
            id: currentPO.id || generateId(),
            poNumber: currentPO.poNumber,
            status: currentPO.status || 'Pending',
            orderDate: currentPO.orderDate || new Date().toISOString().split('T')[0],
            expectedDate: currentPO.expectedDate || '',
            supplierId: currentPO.supplierId,
            items: currentPO.items,
            linkedProductionDocId: currentPO.linkedProductionDocId
        };

        const updatedPOs = currentPO.id 
            ? factory_purchase_orders.map(p => p.id === payload.id ? payload : p)
            : [...factory_purchase_orders, payload];

        await updateData({ ...data, factory_purchase_orders: updatedPOs });
        setIsPOModalOpen(false);
        setCurrentPO({});
    };

    const handleDeleteQuote = async (id: string) => {
        if(confirm("Delete this quotation?")) {
            await updateData({ ...data, factory_quotations: factory_quotations.filter(q => q.id !== id) });
        }
    };

    const handleDeletePO = async (id: string) => {
        if(confirm("Delete this PO?")) {
            await updateData({ ...data, factory_purchase_orders: factory_purchase_orders.filter(p => p.id !== id) });
        }
    };

    // --- Filtered Data ---
    const filteredPOs = useMemo(() => 
        factory_purchase_orders.filter(p => p.poNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    , [factory_purchase_orders, searchTerm]);

    const filteredQuotes = useMemo(() => 
        factory_quotations.filter(q => {
            const mat = packing_raw_materials.find(m => m.id === q.rawMaterialId)?.name || '';
            const sup = factory_suppliers.find(s => s.id === q.supplierId)?.name || '';
            return mat.toLowerCase().includes(searchTerm.toLowerCase()) || sup.toLowerCase().includes(searchTerm.toLowerCase());
        })
    , [factory_quotations, searchTerm, packing_raw_materials, factory_suppliers]);

    const lowStockMaterials = useMemo(() => 
        packing_raw_materials.filter(m => (m.quantity || 0) < (m.reservedQuantity || 100))
    , [packing_raw_materials]);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('nav.purchasing')}</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Supplier & Order Management</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setActiveTab('po')} className={`px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${activeTab === 'po' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{t('nav.purchasing')}</button>
                    <button onClick={() => setActiveTab('rfq')} className={`px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${activeTab === 'rfq' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{t('pur.rfq')}</button>
                    <button onClick={() => setActiveTab('restock')} className={`px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'restock' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                        {lowStockMaterials.length > 0 && <AlertCircle size={14} className="text-white"/>} {t('pur.smartRestock')}
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input 
                        type="text" 
                        placeholder={t('common.search')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {activeTab === 'po' && (
                    <button onClick={() => { setCurrentPO({ poNumber: `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`, orderDate: new Date().toISOString().split('T')[0], items: [] }); setIsPOModalOpen(true); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
                        <Plus size={18}/> Create PO
                    </button>
                )}
                {activeTab === 'rfq' && (
                    <button onClick={() => { setCurrentQuote({}); setIsQuoteModalOpen(true); }} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2">
                        <Plus size={18}/> {t('pur.addQuote')}
                    </button>
                )}
            </div>

            {/* --- PO LIST --- */}
            {activeTab === 'po' && (
                <div className="grid grid-cols-1 gap-4">
                    {filteredPOs.map(po => {
                        const supplierName = factory_suppliers.find(s => s.id === po.supplierId)?.name || 'Unknown Supplier';
                        const total = po.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
                        return (
                            <div key={po.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all group cursor-pointer" onClick={() => { setCurrentPO(po); setIsPOModalOpen(true); }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600"><FileText size={20}/></div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg">{po.poNumber}</h3>
                                            <p className="text-xs text-slate-500 font-bold">{po.orderDate} • {supplierName}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${po.status === 'Received' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{po.status}</span>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
                                    <div className="text-xs text-slate-500 font-bold">{po.items.length} Items</div>
                                    <div className="text-lg font-black text-slate-800">฿{total.toLocaleString()}</div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredPOs.length === 0 && <div className="text-center py-20 text-slate-400 font-bold">No Purchase Orders found.</div>}
                </div>
            )}

            {/* --- RFQ LIST --- */}
            {activeTab === 'rfq' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuotes.map(quote => {
                        const mat = packing_raw_materials.find(m => m.id === quote.rawMaterialId);
                        const sup = factory_suppliers.find(s => s.id === quote.supplierId);
                        return (
                            <div key={quote.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative group">
                                <button onClick={() => handleDeleteQuote(quote.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                <div className="mb-4">
                                    <h4 className="font-black text-slate-800">{mat?.name || 'Unknown Material'}</h4>
                                    <p className="text-xs text-slate-500 font-bold mt-1 flex items-center gap-1"><Truck size={12}/> {sup?.name}</p>
                                </div>
                                <div className="flex justify-between items-end border-t border-slate-100 pt-4">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Price / Unit</p>
                                        <p className="text-xl font-black text-emerald-600">฿{quote.pricePerUnit.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">MOQ</p>
                                        <p className="text-sm font-bold text-slate-700">{quote.moq} {quote.unit}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- RESTOCK LIST --- */}
            {activeTab === 'restock' && (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-red-50 text-red-700 font-black text-[10px] uppercase tracking-widest border-b border-red-100">
                            <tr>
                                <th className="px-6 py-4">Item Name</th>
                                <th className="px-6 py-4 text-right">Current Stock</th>
                                <th className="px-6 py-4 text-right">Min Level</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lowStockMaterials.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-800">{m.name}</td>
                                    <td className="px-6 py-4 text-right font-mono text-red-600 font-black">{m.quantity} {m.unit}</td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-500">{m.reservedQuantity || 100}</td>
                                    <td className="px-6 py-4 text-center"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-black uppercase">Low Stock</span></td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => {
                                                setCurrentPO({
                                                    poNumber: `PO-AUTO-${Date.now().toString().slice(-6)}`,
                                                    orderDate: new Date().toISOString().split('T')[0],
                                                    items: [{ rawMaterialId: m.id, quantity: (m.reservedQuantity || 100) * 2, unitPrice: m.costPerUnit || 0 }]
                                                });
                                                setIsPOModalOpen(true);
                                                setActiveTab('po');
                                            }}
                                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 shadow-md transition-all active:scale-95"
                                        >
                                            Order Now
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {lowStockMaterials.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-bold">All stock levels are healthy.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- CREATE QUOTE MODAL --- */}
            {isQuoteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Add Quotation</h3>
                            <button onClick={() => setIsQuoteModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-full"><X size={24}/></button>
                        </div>
                        <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                            
                            {/* --- FILE SCANNER UI (Enhanced) --- */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 mb-2 relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="absolute top-0 right-0 p-3 opacity-10"><ScanLine size={100}/></div>
                                <div className="relative z-10">
                                    <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <FileType size={16}/> สแกนเอกสาร (AI OCR)
                                    </h4>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isScanLoading}
                                            className="flex-1 bg-white border border-blue-200 text-blue-700 px-4 py-4 rounded-xl font-bold text-xs shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-3"
                                        >
                                            {isScanLoading ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18}/>}
                                            {isScanLoading ? "กำลังวิเคราะห์ข้อมูล..." : "อัปโหลดใบเสนอราคา (PDF / รูปภาพ)"}
                                        </button>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*,application/pdf"
                                        onChange={handleScanFile}
                                    />
                                    <div className="flex items-center gap-2 mt-2">
                                        <p className="text-[10px] text-blue-400 font-medium">* รองรับไฟล์ PDF, JPG, PNG ระบบจะดึงชื่อและราคาให้อัตโนมัติ</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Raw Material</label>
                                <SearchableSelect options={materialOptions} value={currentQuote.rawMaterialId} onChange={val => setCurrentQuote({...currentQuote, rawMaterialId: val})} placeholder="Select Material..."/>
                            </div>

                            {/* Supplier Section */}
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Supplier</label>
                                <SearchableSelect 
                                    options={supplierOptions}
                                    value={currentQuote.supplierId}
                                    onChange={(val) => setCurrentQuote({...currentQuote, supplierId: val})}
                                    placeholder="Choose existing supplier..."
                                />

                                {/* Smart Search UI */}
                                <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                            <Sparkles size={12} className="text-amber-500"/> Or Find New Supplier (AI Smart Search)
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={supplierSearchTerm}
                                            onChange={(e) => setSupplierSearchTerm(e.target.value)}
                                            placeholder="Type company name..."
                                            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                                            onKeyDown={(e) => e.key === 'Enter' && handleSmartSupplierLookup()}
                                        />
                                        <button 
                                            onClick={() => handleSmartSupplierLookup()}
                                            disabled={isLookupLoading}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm"
                                        >
                                            {isLookupLoading ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>}
                                            Search
                                        </button>
                                    </div>

                                    {/* AI Result Card */}
                                    {tempSupplier && (
                                        <div className="mt-3 bg-white p-4 rounded-xl border-2 border-green-100 shadow-sm animate-in fade-in zoom-in slide-in-from-top-2 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-2">
                                                     <div>
                                                         <div className="text-[10px] text-green-600 font-bold uppercase mb-0.5">Found Result</div>
                                                         <h4 className="font-black text-slate-800 text-sm">{tempSupplier.name}</h4>
                                                     </div>
                                                     <button 
                                                        onClick={handleConfirmSupplier}
                                                        className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-green-600 shadow-md flex items-center gap-1 transition-transform active:scale-95"
                                                    >
                                                        <CheckCircle2 size={12}/> Use This
                                                    </button>
                                                </div>
                                                
                                                <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                                                    <div className="flex items-start gap-2">
                                                        <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400"/>
                                                        <span>{tempSupplier.address || '-'}</span>
                                                    </div>
                                                    {tempSupplier.taxId && (
                                                        <div className="flex items-center gap-2 font-mono text-slate-600">
                                                            <FileText size={12} className="shrink-0 text-slate-400"/>
                                                            <span>Tax ID: {tempSupplier.taxId}</span>
                                                        </div>
                                                    )}
                                                    {tempSupplier.phone && (
                                                        <div className="flex items-center gap-2">
                                                            <Phone size={12} className="shrink-0 text-slate-400"/>
                                                            <span>{tempSupplier.phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</label><input type="number" value={currentQuote.pricePerUnit} onChange={e => setCurrentQuote({...currentQuote, pricePerUnit: parseFloat(e.target.value)})} className="w-full px-4 py-2 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"/></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit</label><input type="text" value={currentQuote.unit} onChange={e => setCurrentQuote({...currentQuote, unit: e.target.value})} className="w-full px-4 py-2 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"/></div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={handleSaveQuote} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-black transition-all">Save Quote</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE PO MODAL --- */}
            {isPOModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Create Purchase Order</h3>
                            <button onClick={() => setIsPOModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-full"><X size={24}/></button>
                        </div>
                        
                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            {/* Left: General Info */}
                            <div className="w-full lg:w-1/3 border-r border-slate-100 p-8 space-y-6 overflow-y-auto custom-scrollbar bg-slate-50/50">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PO Number</label><input type="text" value={currentPO.poNumber} onChange={e => setCurrentPO({...currentPO, poNumber: e.target.value})} className="w-full px-4 py-2 border rounded-xl font-bold outline-none bg-white"/></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label><input type="date" value={currentPO.orderDate} onChange={e => setCurrentPO({...currentPO, orderDate: e.target.value})} className="w-full px-4 py-2 border rounded-xl font-bold outline-none bg-white"/></div>
                                
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Supplier</label>
                                    <SearchableSelect options={supplierOptions} value={currentPO.supplierId} onChange={val => setCurrentPO({...currentPO, supplierId: val})} placeholder="Select Supplier..." className="bg-white"/>
                                </div>
                            </div>

                            {/* Right: Items */}
                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-black text-slate-800">Order Items</h4>
                                    <button onClick={() => setCurrentPO({...currentPO, items: [...(currentPO.items || []), { rawMaterialId: '', quantity: 0, unitPrice: 0 }]})} className="text-blue-600 font-bold text-xs hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all">+ Add Item</button>
                                </div>
                                <div className="space-y-3">
                                    {currentPO.items?.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex-1">
                                                <SearchableSelect options={materialOptions} value={item.rawMaterialId} onChange={val => {
                                                    const newItems = [...currentPO.items!];
                                                    const mat = packing_raw_materials.find(m => m.id === val);
                                                    newItems[idx].rawMaterialId = val;
                                                    newItems[idx].unitPrice = mat?.costPerUnit || 0;
                                                    setCurrentPO({...currentPO, items: newItems});
                                                }} className="border-0 bg-transparent p-0 shadow-none"/>
                                            </div>
                                            <input type="number" value={item.quantity} onChange={e => {
                                                const newItems = [...currentPO.items!];
                                                newItems[idx].quantity = parseFloat(e.target.value);
                                                setCurrentPO({...currentPO, items: newItems});
                                            }} className="w-20 text-center bg-white border border-slate-200 rounded-lg p-2 font-bold outline-none" placeholder="Qty"/>
                                            <input type="number" value={item.unitPrice} onChange={e => {
                                                const newItems = [...currentPO.items!];
                                                newItems[idx].unitPrice = parseFloat(e.target.value);
                                                setCurrentPO({...currentPO, items: newItems});
                                            }} className="w-24 text-right bg-white border border-slate-200 rounded-lg p-2 font-mono outline-none" placeholder="Price"/>
                                            <button onClick={() => setCurrentPO({...currentPO, items: currentPO.items?.filter((_, i) => i !== idx)})} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                                        </div>
                                    ))}
                                    {(!currentPO.items || currentPO.items.length === 0) && <div className="text-center py-10 text-slate-300 font-bold uppercase text-xs border-2 border-dashed border-slate-100 rounded-xl">No items added</div>}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={handleSavePO} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all">Confirm Order</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Purchasing;
