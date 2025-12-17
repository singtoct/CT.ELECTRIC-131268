import React, { useState, useRef } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    FileText, Plus, Printer, Search, Trash2, X, Save, 
    Calendar, User, ChevronRight, PenTool, CheckCircle2
} from 'lucide-react';
import { ProductionDocument, ProductionDocumentItem } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const ProductionOrderDocs: React.FC = () => {
    const { production_documents = [], factory_settings } = useFactoryData();
    const { updateData } = useFactoryActions();
    const { t } = useTranslation();
    const allData = useFactoryData();

    // State
    const [view, setView] = useState<'list' | 'create' | 'view'>('list');
    const [search, setSearch] = useState('');
    const [currentDoc, setCurrentDoc] = useState<ProductionDocument | null>(null);

    // Filtered Docs
    const filteredDocs = (production_documents || []).filter(doc => 
        doc.docNumber.toLowerCase().includes(search.toLowerCase()) || 
        doc.customerName.toLowerCase().includes(search.toLowerCase())
    );

    // Handlers
    const handleCreateNew = () => {
        const newDoc: ProductionDocument = {
            id: generateId(),
            docNumber: `PO-${new Date().getFullYear()}-${String((production_documents?.length || 0) + 1).padStart(3, '0')}`,
            date: new Date().toISOString().split('T')[0],
            customerName: '',
            status: 'Draft',
            items: [{ id: generateId(), productName: '', quantity: 0, unit: 'pcs', dueDate: '', note: '' }],
            createdBy: 'Admin',
        };
        setCurrentDoc(newDoc);
        setView('create');
    };

    const handleEdit = (doc: ProductionDocument) => {
        // Deep copy to prevent mutation of original data until saved
        setCurrentDoc(JSON.parse(JSON.stringify(doc))); 
        setView('create');
    };

    const handleView = (doc: ProductionDocument) => {
        setCurrentDoc(doc);
        setView('view');
    };

    const handleSave = async () => {
        if (!currentDoc) return;
        
        let newDocs = [...(production_documents || [])];
        const existingIndex = newDocs.findIndex(d => d.id === currentDoc.id);
        
        if (existingIndex >= 0) {
            newDocs[existingIndex] = currentDoc;
        } else {
            newDocs.push(currentDoc);
        }

        await updateData({ ...allData, production_documents: newDocs });
        setView('list'); // Return to list after save
    };

    const handleDelete = async (id: string) => {
        if(!confirm('Are you sure you want to delete this document?')) return;
        const newDocs = production_documents.filter(d => d.id !== id);
        await updateData({ ...allData, production_documents: newDocs });
    };

    const handlePrint = () => {
        window.print();
    };

    // Helper for safe item updates (Immutable pattern)
    const updateItem = (index: number, field: keyof ProductionDocumentItem, value: any) => {
        if (!currentDoc) return;
        const newItems = currentDoc.items.map((item, i) => {
            if (i === index) {
                return { ...item, [field]: value };
            }
            return item;
        });
        setCurrentDoc({ ...currentDoc, items: newItems });
    };

    // --- RENDER SECTIONS ---

    // 1. List View
    if (view === 'list') {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{t('po.title')}</h2>
                        <p className="text-slate-500">{t('po.subtitle')}</p>
                    </div>
                    <button 
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm"
                    >
                        <Plus size={18} /> {t('po.create')}
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder={t('orders.search')}
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">{t('po.docNo')}</th>
                                <th className="px-6 py-4">{t('po.date')}</th>
                                <th className="px-6 py-4">{t('po.customer')}</th>
                                <th className="px-6 py-4 text-center">{t('po.items')}</th>
                                <th className="px-6 py-4 text-center">{t('orders.status')}</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredDocs.map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleView(doc)}>
                                    <td className="px-6 py-4 font-mono font-medium text-primary-600">{doc.docNumber}</td>
                                    <td className="px-6 py-4 text-slate-600">{doc.date}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{doc.customerName || '-'}</td>
                                    <td className="px-6 py-4 text-center text-slate-500">{doc.items.length}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border
                                            ${doc.status === 'Draft' ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                                              doc.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleEdit(doc)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded hover:bg-primary-50">
                                                <PenTool size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredDocs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-400 italic">No documents found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // 2. Create/Edit Form
    if (view === 'create' && currentDoc) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium">
                        <ChevronRight className="rotate-180" size={16} /> Back to List
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">{t('po.create')}</h2>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                    {/* Header Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{t('po.docNo')}</label>
                            <input 
                                type="text" 
                                value={currentDoc.docNumber}
                                onChange={e => setCurrentDoc({...currentDoc, docNumber: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{t('po.date')}</label>
                            <input 
                                type="date" 
                                value={currentDoc.date}
                                onChange={e => setCurrentDoc({...currentDoc, date: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{t('po.customer')}</label>
                            <input 
                                type="text" 
                                value={currentDoc.customerName}
                                onChange={e => setCurrentDoc({...currentDoc, customerName: e.target.value})}
                                placeholder="Customer Name or Dept."
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order Items</span>
                        <div className="h-px bg-slate-200 flex-1"></div>
                    </div>

                    {/* Items List */}
                    <div>
                        {/* Header for Items */}
                        <div className="hidden md:flex gap-2 mb-2 px-3">
                            <div className="w-8"></div>
                            <div className="flex-1 text-xs font-bold text-slate-500">Product Name / Detail</div>
                            <div className="w-24 text-right text-xs font-bold text-slate-500">Qty</div>
                            <div className="w-20 text-center text-xs font-bold text-slate-500">Unit</div>
                            <div className="w-32 text-center text-xs font-bold text-slate-500">Due Date</div>
                            <div className="w-8"></div>
                        </div>

                        <div className="space-y-2">
                            {currentDoc.items.map((item, idx) => (
                                <div key={item.id} className="flex flex-col md:flex-row gap-2 items-start md:items-center bg-white p-2 rounded-lg border border-slate-200 hover:border-primary-300 hover:shadow-sm transition-all group">
                                    <div className="w-8 flex justify-center text-slate-400 font-mono text-xs pt-2 md:pt-0">{idx + 1}</div>
                                    <div className="flex-1 w-full">
                                        <input 
                                            type="text" 
                                            placeholder="Item Description..."
                                            value={item.productName}
                                            onChange={e => updateItem(idx, 'productName', e.target.value)}
                                            className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="w-full md:w-24">
                                         <input 
                                            type="number" 
                                            placeholder="0"
                                            value={item.quantity || ''}
                                            onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded px-3 py-2 text-sm text-right font-mono focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                    <div className="w-full md:w-20">
                                         <input 
                                            type="text" 
                                            placeholder="Unit"
                                            value={item.unit}
                                            onChange={e => updateItem(idx, 'unit', e.target.value)}
                                            className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded px-3 py-2 text-sm text-center focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                    <div className="w-full md:w-32">
                                         <input 
                                            type="date" 
                                            value={item.dueDate}
                                            onChange={e => updateItem(idx, 'dueDate', e.target.value)}
                                            className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded px-3 py-2 text-xs text-center focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const newItems = currentDoc.items.filter((_, i) => i !== idx);
                                            setCurrentDoc({...currentDoc, items: newItems});
                                        }}
                                        className="text-slate-300 hover:text-red-500 p-2 md:p-1 self-end md:self-auto"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            <button 
                                onClick={() => {
                                    setCurrentDoc({
                                        ...currentDoc, 
                                        items: [...currentDoc.items, { id: generateId(), productName: '', quantity: 0, unit: 'pcs', dueDate: '', note: '' }]
                                    });
                                }}
                                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-all text-sm font-bold flex justify-center items-center gap-2 mt-2"
                            >
                                <Plus size={18} /> {t('po.addItem')}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-slate-100">
                        <button 
                            onClick={handleSave}
                            className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-green-200 hover:bg-green-700 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Save size={20} /> Save Document
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 3. View & Print Mode
    if (view === 'view' && currentDoc) {
        return (
            <div className="flex flex-col h-full bg-slate-50 md:bg-transparent">
                {/* Toolbar (Hidden when printing) */}
                <div className="flex items-center justify-between mb-6 print:hidden">
                    <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium">
                        <ChevronRight className="rotate-180" size={16} /> Back
                    </button>
                    <div className="flex gap-3">
                        <button onClick={() => handleEdit(currentDoc)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-50 shadow-sm">
                            Edit
                        </button>
                        <button onClick={handlePrint} className="px-5 py-2 bg-primary-600 text-white rounded-lg font-bold text-sm hover:bg-primary-700 shadow-lg shadow-primary-200 flex items-center gap-2">
                            <Printer size={18} /> {t('po.print')}
                        </button>
                    </div>
                </div>

                {/* Print Area - The paper sheet */}
                <div className="bg-white shadow-xl mx-auto print:shadow-none print:w-full print:max-w-none print:m-0 print:absolute print:top-0 print:left-0" style={{ width: '210mm', minHeight: '297mm', padding: '15mm 20mm' }}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-slate-900">
                        <div className="flex items-start gap-4">
                            {/* Logo */}
                            {factory_settings.companyInfo.logoUrl && (
                                <img src={factory_settings.companyInfo.logoUrl} alt="Logo" className="h-16 w-32 object-contain object-left" />
                            )}
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wide leading-tight">{factory_settings.companyInfo.name}</h1>
                                <p className="text-xs text-slate-500 max-w-[300px] leading-relaxed mt-1">
                                    {factory_settings.companyInfo.address}<br/>
                                    <strong>Tax ID:</strong> {factory_settings.companyInfo.taxId} | <strong>Tel:</strong> {factory_settings.companyInfo.phone}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">{t('po.docHeader')}</h2>
                            <div className="text-sm">
                                <span className="font-bold text-slate-600 mr-2">{t('po.docNo')}:</span>
                                <span className="font-mono font-bold text-slate-900 text-lg">{currentDoc.docNumber}</span>
                            </div>
                            <div className="text-sm mt-1">
                                <span className="font-bold text-slate-600 mr-2">{t('po.date')}:</span>
                                <span>{new Date(currentDoc.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})}</span>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info Box */}
                    <div className="mb-6 p-4 rounded-lg border border-slate-200 bg-slate-50 print:bg-white print:border-slate-300">
                        <div className="text-sm">
                            <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">{t('po.customer')}</span>
                            <span className="text-slate-900 text-lg font-medium">
                                {currentDoc.customerName}
                            </span>
                        </div>
                    </div>

                    {/* Items Table - COMPACT FOR PRINT */}
                    <div className="mb-8">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 print:bg-slate-100 print:text-black">
                                    <th className="border border-slate-300 px-2 py-1.5 text-center w-12 text-xs font-bold uppercase tracking-wider">#</th>
                                    <th className="border border-slate-300 px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wider">{t('inv.itemName')}</th>
                                    <th className="border border-slate-300 px-2 py-1.5 text-center w-28 text-xs font-bold uppercase tracking-wider">{t('orders.dueDate')}</th>
                                    <th className="border border-slate-300 px-2 py-1.5 text-right w-24 text-xs font-bold uppercase tracking-wider">{t('orders.quantity')}</th>
                                    <th className="border border-slate-300 px-2 py-1.5 text-center w-20 text-xs font-bold uppercase tracking-wider">{t('inv.unit')}</th>
                                    <th className="border border-slate-300 px-2 py-1.5 text-left w-32 text-xs font-bold uppercase tracking-wider">{t('po.note')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentDoc.items.map((item, idx) => (
                                    <tr key={item.id} className="print:text-black">
                                        <td className="border border-slate-300 px-2 py-2 text-center text-slate-500 text-xs">{idx + 1}</td>
                                        {/* Reduced font size and weight for items: font-medium, print:text-xs */}
                                        <td className="border border-slate-300 px-2 py-2 font-medium text-slate-800 text-sm print:text-xs align-top">{item.productName}</td>
                                        <td className="border border-slate-300 px-2 py-2 text-center text-xs align-top">{item.dueDate}</td>
                                        <td className="border border-slate-300 px-2 py-2 text-right font-bold font-mono text-slate-900 text-sm print:text-xs align-top">{item.quantity.toLocaleString()}</td>
                                        <td className="border border-slate-300 px-2 py-2 text-center text-xs text-slate-600 align-top">{item.unit}</td>
                                        <td className="border border-slate-300 px-2 py-2 text-xs italic text-slate-500 align-top">{item.note}</td>
                                    </tr>
                                ))}
                                {/* Empty Rows for consistency */}
                                {Array.from({ length: Math.max(0, 10 - currentDoc.items.length) }).map((_, idx) => (
                                    <tr key={`empty-${idx}`} className="h-8">
                                        <td className="border border-slate-300"></td>
                                        <td className="border border-slate-300"></td>
                                        <td className="border border-slate-300"></td>
                                        <td className="border border-slate-300"></td>
                                        <td className="border border-slate-300"></td>
                                        <td className="border border-slate-300"></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="mt-auto">
                        <div className="grid grid-cols-3 gap-8 pt-6">
                            {/* Ordered By */}
                            <div className="text-center">
                                <div className="h-20 border border-slate-300 bg-slate-50 mb-2 rounded print:bg-transparent print:border-black flex flex-col justify-end pb-2">
                                     <span className="text-[10px] text-slate-300 print:hidden">Signature</span>
                                </div>
                                <p className="text-xs font-bold text-slate-800 uppercase">{t('po.sign.ordered')}</p>
                                <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-300 inline-block px-4 pt-1">Date: ____/____/____</div>
                            </div>
                            
                            {/* Approved By */}
                            <div className="text-center">
                                <div className="h-20 border border-slate-300 bg-slate-50 mb-2 rounded print:bg-transparent print:border-black flex flex-col justify-end pb-2">
                                </div>
                                <p className="text-xs font-bold text-slate-800 uppercase">{t('po.sign.approved')}</p>
                                <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-300 inline-block px-4 pt-1">Date: ____/____/____</div>
                            </div>

                            {/* Received By */}
                            <div className="text-center">
                                <div className="h-20 border border-slate-300 bg-slate-50 mb-2 rounded print:bg-transparent print:border-black flex flex-col justify-end pb-2">
                                </div>
                                <p className="text-xs font-bold text-slate-800 uppercase">{t('po.sign.received')}</p>
                                <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-300 inline-block px-4 pt-1">Date: ____/____/____</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* System Footer */}
                    <div className="mt-8 pt-2 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between items-center print:text-slate-600 print:border-black">
                        <span>Document ID: {currentDoc.id}</span>
                        <span>Generated by Factory OS • {new Date().toLocaleString('th-TH')}</span>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default ProductionOrderDocs;