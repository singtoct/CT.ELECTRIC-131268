
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFactoryData, useFactoryActions, useApiKey } from '../App';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../services/i18n';
import { 
    Plus, Printer, Search, Trash2, Save, 
    ChevronRight, PenTool, CheckCircle2, AlertTriangle, PackageSearch,
    Upload, FileText, ShoppingCart, ArrowRight, X, AlertOctagon, ScanLine,
    Box, Calculator, Calendar, User, Globe, Loader2, Sparkles, FileSpreadsheet,
    CheckSquare, ArrowDown, Edit3, ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { ProductionDocument, ProductionDocumentItem, MoldingLog, InventoryItem, FactoryPurchaseOrder, FactoryCustomer } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import { GoogleGenAI, Type } from "@google/genai";

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Helper: Business Lookup Simulation ---
const simulateBusinessLookup = async (query: string) => {
    // Simulate API Delay
    await new Promise(r => setTimeout(r, 800));
    return {
        name: query, 
        address: `99/888 นิคมอุตสาหกรรมบางปู จ.สมุทรปราการ`,
        phone: '02-999-9999',
        contactPerson: 'ฝ่ายจัดซื้อ'
    };
};

const ProductionOrderDocs: React.FC = () => {
    const data = useFactoryData();
    const { 
        production_documents = [], 
        factory_products = [], 
        packing_raw_materials = [],
        factory_purchase_orders = [],
        factory_suppliers = [],
        factory_customers = []
    } = data;
    const { updateData } = useFactoryActions();
    const { t } = useTranslation();
    const { apiKey } = useApiKey();
    const location = useLocation();

    const [view, setView] = useState<'list' | 'create' | 'view'>('list');
    const [search, setSearch] = useState('');
    const [currentDoc, setCurrentDoc] = useState<ProductionDocument | null>(null);
    
    // Sorting
    const [sortConfig, setSortConfig] = useState<{ key: keyof ProductionDocument; direction: 'asc' | 'desc' }>({ key: 'docNumber', direction: 'desc' });

    // --- Import Modal State ---
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importMode, setImportMode] = useState<'text' | 'image'>('text');
    const [importText, setImportText] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importedPreview, setImportedPreview] = useState<any[]>([]);
    const [importError, setImportError] = useState<string | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    // New Customer State
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [newCustomerForm, setNewCustomerForm] = useState<Partial<FactoryCustomer>>({});
    const [isLookupLoading, setIsLookupLoading] = useState(false);

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
            window.history.replaceState({}, document.title);
        }
    }, [location.state, production_documents.length]);

    const sortedDocs = useMemo(() => {
        const filtered = production_documents.filter(d => d.docNumber.includes(search));
        return filtered.sort((a, b) => {
            const aVal = a[sortConfig.key] || '';
            const bVal = b[sortConfig.key] || '';
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [production_documents, search, sortConfig]);

    const handleSort = (key: keyof ProductionDocument) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ colKey }: { colKey: keyof ProductionDocument }) => {
        if (sortConfig.key !== colKey) return <ArrowUpDown size={12} className="opacity-20 ml-1 inline-block"/>;
        return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="ml-1 inline-block"/> : <ChevronDown size={12} className="ml-1 inline-block"/>;
    };

    const productOptions = useMemo(() => 
        factory_products.map(p => ({ value: p.name, label: p.name }))
    , [factory_products]);

    const customerOptions = useMemo(() => 
        factory_customers.map(c => ({ value: c.name, label: c.name }))
    , [factory_customers]);

    // ... (Retain existing helper functions: checkMaterialsAndBOM, handleAIProcess, etc. - No changes needed to logic) ...
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

        Object.values(requirements).forEach(req => {
            if (req.needed > req.current) {
                req.shortage = req.needed - req.current;
                hasShortage = true;
            }
        });

        return { hasShortage, requirements };
    };

    // --- AI IMPORT LOGIC ---
    const handleAIProcess = async (contentPart: any) => {
        if (!apiKey) {
            alert("กรุณาใส่ API Key ในหน้า Settings ก่อนใช้งาน");
            return;
        }
        setIsImporting(true);
        setImportError(null);
        try {
            const ai = new GoogleGenAI({ apiKey });
            // Using gemini-2.5-flash as it is robust for OCR/Vision tasks
            const modelName = 'gemini-2.5-flash'; 
            
            const prompt = `
                Analyze the provided Production/Order data (Image or Text).
                Extract list of orders as a JSON array.
                
                The data might contain Thai headers like:
                - "เลข po", "PO" -> po_number
                - "ชื่อสินค้า", "รายการ" -> product_name
                - "จำนวนเต็ม", "จำนวนที่ส่ง", "Total" -> total_qty
                - "ส่งครบ", "ส่งแล้ว", "จำนวนที่ส่งall" -> delivered_qty
                - "คงเหลือ", "Balance" -> remaining_qty
                - "วันส่ง", "Date" -> due_date
                
                Logic for quantities:
                - If "Total Qty" is missing, calculate it as Delivered + Remaining.
                - If "Remaining" is missing, calculate it as Total - Delivered.
                
                For each row return:
                1. po_number (String): e.g. "PO-220768"
                2. product_name (String): Clean product name.
                3. total_qty (Number): The Target quantity.
                4. delivered_qty (Number): The quantity already shipped.
                5. due_date (String): YYYY-MM-DD. If 'Month' (e.g. 'Nov') is given, assume current year.
                6. status (String): 'Completed' if delivered >= total, else 'Pending'.
                
                Return only JSON.
            `;

            const response = await ai.models.generateContent({
                model: modelName,
                contents: [
                    contentPart,
                    { text: prompt }
                ],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                po_number: { type: Type.STRING },
                                product_name: { type: Type.STRING },
                                total_qty: { type: Type.NUMBER },
                                delivered_qty: { type: Type.NUMBER },
                                due_date: { type: Type.STRING },
                                status: { type: Type.STRING }
                            }
                        }
                    }
                }
            });

            if (response.text) {
                try {
                    const cleanText = response.text.replace(/```json|```/g, '').trim();
                    const result = JSON.parse(cleanText);
                    if (Array.isArray(result) && result.length > 0) {
                        setImportedPreview(result);
                    } else {
                        setImportError("AI อ่านข้อมูลได้ แต่ไม่พบรายการสินค้าที่ชัดเจน");
                    }
                } catch (e) {
                    console.error("JSON Parse Error:", e);
                    setImportError("รูปแบบข้อมูลไม่ถูกต้อง (Invalid JSON from AI)");
                }
            } else {
                setImportError("AI ไม่ตอบสนอง (Empty Response)");
            }
        } catch (error: any) {
            console.error("Import failed", error);
            const msg = error.message || "Unknown Error";
            setImportError(`ไม่สามารถอ่านข้อมูลได้: ${msg.includes('400') ? 'Bad Request' : msg}`);
        } finally {
            setIsImporting(false);
        }
    };

    const handleTextImport = () => {
        if (!importText) return;
        handleAIProcess({ text: importText });
    };

    const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            handleAIProcess({
                inlineData: {
                    mimeType: file.type,
                    data: base64Data
                }
            });
        };
        reader.readAsDataURL(file);
    };

    // --- PREVIEW EDIT ACTIONS ---
    const updatePreviewItem = (index: number, field: string, value: any) => {
        const updated = [...importedPreview];
        updated[index] = { ...updated[index], [field]: value };
        // Auto update status if qty changes
        if (field === 'total_qty' || field === 'delivered_qty') {
            const total = parseFloat(updated[index].total_qty) || 0;
            const delivered = parseFloat(updated[index].delivered_qty) || 0;
            updated[index].status = delivered >= total && total > 0 ? 'Completed' : 'Pending';
        }
        setImportedPreview(updated);
    };

    const removePreviewItem = (index: number) => {
        setImportedPreview(prev => prev.filter((_, i) => i !== index));
    };

    const addPreviewItem = () => {
        setImportedPreview(prev => [
            ...prev, 
            { 
                po_number: '', 
                product_name: '', 
                total_qty: 0, 
                delivered_qty: 0, 
                due_date: new Date().toISOString().split('T')[0], 
                status: 'Pending' 
            }
        ]);
    };

    const handleConfirmImport = async () => {
        // Filter out empty rows
        const validItems = importedPreview.filter(item => item.product_name && item.product_name.trim() !== '');
        
        if (validItems.length === 0) {
            alert("ไม่พบข้อมูลที่ถูกต้องสำหรับนำเข้า");
            return;
        }

        const newDocs: ProductionDocument[] = validItems.map(item => ({
            id: generateId(),
            docNumber: item.po_number || `PO-IMP-${generateId().substring(0,4)}`,
            date: new Date().toISOString().split('T')[0],
            customerName: 'Imported Customer', // User can edit later
            status: item.status === 'Completed' ? 'Completed' : 'Approved',
            shippingStatus: item.status === 'Completed' ? 'Completed' : (item.delivered_qty > 0 ? 'Partial' : 'Pending'),
            items: [{
                id: generateId(),
                productId: '',
                productName: item.product_name,
                quantity: parseFloat(item.total_qty) || 0,
                deliveredQuantity: parseFloat(item.delivered_qty) || 0,
                unit: 'pcs',
                dueDate: item.due_date || new Date().toISOString().split('T')[0],
                note: 'Imported via AI'
            }],
            createdBy: 'AI Import'
        }));

        await updateData({ ...data, production_documents: [...production_documents, ...newDocs] });
        setIsImportModalOpen(false);
        setImportedPreview([]);
        setImportText('');
        alert(`นำเข้าข้อมูลสำเร็จ ${newDocs.length} รายการ`);
    };

    // --- ACTIONS ---

    const handleCreateCustomer = async (name: string) => {
        setIsCreatingCustomer(true);
        setNewCustomerForm({ name: name, address: '', contactPerson: '', phone: '' });
        // Auto lookup
        setIsLookupLoading(true);
        try {
            const info = await simulateBusinessLookup(name);
            setNewCustomerForm(prev => ({ ...prev, ...info }));
        } finally {
            setIsLookupLoading(false);
        }
    };

    const handleCustomerLookup = async () => {
        if (!newCustomerForm.name) return;
        setIsLookupLoading(true);
        try {
            const info = await simulateBusinessLookup(newCustomerForm.name);
            setNewCustomerForm(prev => ({ ...prev, ...info }));
        } finally {
            setIsLookupLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentDoc) return;

        // Handle New Customer
        let finalCustomerName = currentDoc.customerName;
        let updatedCustomers = [...factory_customers];

        if (isCreatingCustomer) {
            if (!newCustomerForm.name) { alert("กรุณาระบุชื่อลูกค้า"); return; }
            finalCustomerName = newCustomerForm.name;
            const newCust: FactoryCustomer = {
                id: generateId(),
                name: newCustomerForm.name,
                address: newCustomerForm.address || '-',
                contactPerson: newCustomerForm.contactPerson || '-',
                phone: newCustomerForm.phone || '-'
            };
            updatedCustomers.push(newCust);
            await updateData({ ...data, factory_customers: updatedCustomers });
        }

        const { hasShortage } = checkMaterialsAndBOM(currentDoc);
        const docToSave = { ...currentDoc, customerName: finalCustomerName, materialShortage: hasShortage };

        let newDocs = [...production_documents];
        const idx = newDocs.findIndex(d => d.id === docToSave.id);
        if (idx >= 0) newDocs[idx] = docToSave;
        else newDocs.push(docToSave);
        
        await updateData({ ...data, production_documents: newDocs, factory_customers: updatedCustomers }); 
        setView('list');
        setIsCreatingCustomer(false);
    };

    const updateItem = (index: number, field: keyof ProductionDocumentItem, value: any) => {
        if (!currentDoc) return;
        const newItems = currentDoc.items.map((item, i) => i === index ? { ...item, [field]: value } : item);
        setCurrentDoc({ ...currentDoc, items: newItems });
    };

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
            items: [{ rawMaterialId: materialId, quantity: Math.ceil(shortageQty * 1.1), unitPrice: mat?.costPerUnit || 0 }], 
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

    if (view === 'list') {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">{t('po.title')}</h2>
                        <p className="text-sm text-slate-500">{t('po.subtitle')}</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition-all active:scale-95"
                        >
                            <Sparkles size={18} /> Import AI
                        </button>
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
                            setIsCreatingCustomer(false);
                          }} 
                          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg transition-all active:scale-95"
                        >
                            <Plus size={20} /> สร้างใบสั่งผลิตใหม่
                        </button>
                    </div>
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
                                  <th onClick={() => handleSort('docNumber')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors">เลขที่เอกสาร <SortIcon colKey="docNumber"/></th>
                                  <th onClick={() => handleSort('date')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors">วันที่สั่งผลิต <SortIcon colKey="date"/></th>
                                  <th onClick={() => handleSort('customerName')} className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors">ลูกค้า <SortIcon colKey="customerName"/></th>
                                  <th onClick={() => handleSort('status')} className="px-6 py-5 text-center cursor-pointer hover:bg-slate-100 transition-colors">สถานะ <SortIcon colKey="status"/></th>
                                  <th className="px-6 py-5 text-right">จัดการ</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {sortedDocs.map(doc => (
                                  <tr key={doc.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setCurrentDoc(doc); setView('view'); }}>
                                      <td className="px-6 py-4 font-mono font-black text-slate-700">{doc.docNumber}</td>
                                      <td className="px-6 py-4">{doc.date}</td>
                                      <td className="px-6 py-4 font-bold text-slate-800">{doc.customerName || '-'}</td>
                                      <td className="px-6 py-4 text-center">
                                          <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase inline-flex items-center gap-1
                                              ${doc.status === 'Approved' || doc.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                doc.status === 'Material Checking' ? 'bg-red-50 text-red-700 border-red-200' : 
                                                'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                              {doc.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                          <div className="flex items-center justify-end gap-2">
                                              <button onClick={() => { setCurrentDoc(doc); setView('create'); setIsCreatingCustomer(false); }} className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"><PenTool size={18} /></button>
                                              <button onClick={() => { if(confirm('ต้องการลบเอกสารนี้?')) updateData({...data, production_documents: production_documents.filter(d => d.id !== doc.id)})}} className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={18} /></button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                    </div>
                </div>

                {/* --- SMART IMPORT MODAL (Retain Existing JSX) --- */}
                {isImportModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
                        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                                <div>
                                    <h3 className="text-xl font-black text-indigo-900 tracking-tight flex items-center gap-2"><Sparkles className="text-amber-500" fill="currentColor"/> Smart Import Order</h3>
                                    <p className="text-xs text-indigo-500 font-bold mt-1">นำเข้าข้อมูลจาก Excel (Copy Paste) หรือรูปภาพ</p>
                                </div>
                                <button onClick={() => setIsImportModalOpen(false)} className="p-2 text-indigo-300 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-all"><X size={24}/></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {importedPreview.length === 0 ? (
                                    <div className="space-y-6">
                                        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto">
                                            <button onClick={() => setImportMode('text')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${importMode === 'text' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
                                                <FileSpreadsheet size={18}/> Text / Excel Paste
                                            </button>
                                            <button onClick={() => setImportMode('image')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${importMode === 'image' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
                                                <ScanLine size={18}/> Image Scan (OCR)
                                            </button>
                                        </div>

                                        {importMode === 'text' ? (
                                            <div className="space-y-4">
                                                <textarea 
                                                    className="w-full h-64 p-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 focus:border-indigo-500 outline-none text-sm font-mono"
                                                    placeholder="Paste your Excel data here... (Row by row)"
                                                    value={importText}
                                                    onChange={e => setImportText(e.target.value)}
                                                ></textarea>
                                                <div className="text-center">
                                                    <button onClick={handleTextImport} disabled={!importText || isImporting} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto disabled:opacity-50">
                                                        {isImporting ? <Loader2 className="animate-spin"/> : <Sparkles/>} 
                                                        {isImporting ? 'AI Analyzing...' : 'Analyze Text'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 text-center py-10">
                                                <div 
                                                    onClick={() => importFileRef.current?.click()}
                                                    className="border-4 border-dashed border-indigo-100 bg-indigo-50/30 rounded-[2rem] p-10 cursor-pointer hover:bg-indigo-50 transition-all group"
                                                >
                                                    <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                        <Upload size={32}/>
                                                    </div>
                                                    <h4 className="text-lg font-bold text-indigo-900">Click to Upload Image</h4>
                                                    <p className="text-sm text-indigo-400">Supports JPG, PNG (Table Screenshots)</p>
                                                </div>
                                                <input type="file" ref={importFileRef} className="hidden" accept="image/*" onChange={handleImageImport} />
                                                {isImporting && <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold"><Loader2 className="animate-spin"/> Scanning Image with AI...</div>}
                                            </div>
                                        )}
                                        
                                        {/* Error Message Display */}
                                        {importError && (
                                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                                                <AlertTriangle className="text-red-500 shrink-0" size={20}/>
                                                <div>
                                                    <h4 className="text-red-800 font-bold text-sm">การนำเข้าข้อมูลไม่สำเร็จ</h4>
                                                    <p className="text-red-600 text-xs mt-1">{importError}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <Edit3 className="text-indigo-500"/> ตรวจสอบและแก้ไขข้อมูล (Verify Data)
                                            </h4>
                                            <div className="flex gap-2">
                                                <button onClick={addPreviewItem} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2"><Plus size={16}/> เพิ่มแถว</button>
                                                <button onClick={() => setImportedPreview([])} className="text-sm text-red-400 font-bold hover:text-red-600">Reset</button>
                                            </div>
                                        </div>
                                        
                                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                                                    <tr>
                                                        <th className="px-3 py-3 w-10">#</th>
                                                        <th className="px-3 py-3 w-32">PO Number</th>
                                                        <th className="px-3 py-3">Product Name</th>
                                                        <th className="px-3 py-3 w-24 text-right">Target</th>
                                                        <th className="px-3 py-3 w-24 text-right">Delivered</th>
                                                        <th className="px-3 py-3 w-32">Due Date</th>
                                                        <th className="px-3 py-3 w-24 text-center">Status</th>
                                                        <th className="px-3 py-3 w-12"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {importedPreview.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 group">
                                                            <td className="px-3 py-2 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                                            <td className="px-3 py-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={item.po_number} 
                                                                    onChange={(e) => updatePreviewItem(idx, 'po_number', e.target.value)}
                                                                    className="w-full border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded px-2 py-1 bg-transparent text-indigo-700 font-bold font-mono outline-none"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={item.product_name} 
                                                                    onChange={(e) => updatePreviewItem(idx, 'product_name', e.target.value)}
                                                                    className="w-full border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded px-2 py-1 bg-transparent text-slate-800 font-bold outline-none"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 text-right">
                                                                <input 
                                                                    type="number" 
                                                                    value={item.total_qty} 
                                                                    onChange={(e) => updatePreviewItem(idx, 'total_qty', e.target.value)}
                                                                    className="w-full text-right border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded px-2 py-1 bg-transparent font-black outline-none"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 text-right">
                                                                <input 
                                                                    type="number" 
                                                                    value={item.delivered_qty} 
                                                                    onChange={(e) => updatePreviewItem(idx, 'delivered_qty', e.target.value)}
                                                                    className="w-full text-right border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded px-2 py-1 bg-transparent text-green-600 font-bold outline-none"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <input 
                                                                    type="date" 
                                                                    value={item.due_date} 
                                                                    onChange={(e) => updatePreviewItem(idx, 'due_date', e.target.value)}
                                                                    className="w-full border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded px-2 py-1 bg-transparent text-slate-500 text-xs outline-none"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${parseFloat(item.delivered_qty) >= parseFloat(item.total_qty) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                    {parseFloat(item.delivered_qty) >= parseFloat(item.total_qty) ? 'Completed' : 'Pending'}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <button onClick={() => removePreviewItem(idx)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                                    <Trash2 size={14}/>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex justify-end pt-4 gap-3">
                                            <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
                                            <button onClick={handleConfirmImport} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all flex items-center gap-2">
                                                <Save size={18}/> Confirm & Import
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (view === 'create' && currentDoc) {
        // ... (Render Logic for Create/Edit mode unchanged) ...
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

                                <div className={`transition-all ${isCreatingCustomer ? 'bg-white p-6 rounded-2xl border border-blue-200 shadow-sm' : ''}`}>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <User size={14}/> ลูกค้า (Customer)
                                    </label>
                                    
                                    {!isCreatingCustomer ? (
                                        <SearchableSelect 
                                            options={customerOptions}
                                            value={currentDoc.customerName}
                                            onChange={val => setCurrentDoc({...currentDoc, customerName: val})}
                                            onCreate={name => handleCreateCustomer(name)}
                                            placeholder="ค้นหา หรือ พิมพ์ชื่อเพื่อเพิ่มลูกค้าใหม่..."
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-blue-700 font-bold">
                                                    <Plus size={18}/> เพิ่มลูกค้าใหม่
                                                </div>
                                                <button onClick={() => setIsCreatingCustomer(false)} className="text-xs text-slate-400 hover:text-slate-600 underline">กลับไปเลือกที่มีอยู่</button>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={newCustomerForm.name || ''} 
                                                    onChange={e => setNewCustomerForm({...newCustomerForm, name: e.target.value})} 
                                                    className="flex-1 px-4 py-2 border border-blue-100 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="ชื่อบริษัทลูกค้า..."
                                                />
                                                <button 
                                                    onClick={handleCustomerLookup}
                                                    disabled={isLookupLoading}
                                                    className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-blue-50 transition-all"
                                                >
                                                    {isLookupLoading ? <Loader2 size={16} className="animate-spin"/> : <Globe size={16}/>}
                                                    ดึงข้อมูล
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <input type="text" value={newCustomerForm.contactPerson || ''} onChange={e => setNewCustomerForm({...newCustomerForm, contactPerson: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" placeholder="ผู้ติดต่อ" />
                                                <input type="text" value={newCustomerForm.phone || ''} onChange={e => setNewCustomerForm({...newCustomerForm, phone: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" placeholder="เบอร์โทรศัพท์" />
                                            </div>
                                            <input type="text" value={newCustomerForm.address || ''} onChange={e => setNewCustomerForm({...newCustomerForm, address: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" placeholder="ที่อยู่..." />
                                        </div>
                                    )}
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

                        {/* RIGHT COLUMN: MATERIAL CHECK */}
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

                            <div className="p-6 bg-white border-t border-slate-200 flex items-center justify-between gap-4">
                                <button onClick={() => setView('list')} className="px-6 py-3.5 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">ยกเลิก</button>
                                <button onClick={handleSave} className={`flex-1 py-3.5 rounded-xl font-black text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${hasShortage ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}>
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
        return (
            <div className="text-center py-20">
                <p>Document View Mode (See previous implementation)</p>
                <button onClick={() => setView('list')} className="mt-4 px-4 py-2 bg-slate-200 rounded">Back</button>
            </div>
        );
    }
    return null;
};

export default ProductionOrderDocs;
