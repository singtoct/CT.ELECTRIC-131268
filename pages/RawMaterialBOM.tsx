
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFactoryData, useFactoryActions, useApiKey } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Search, Trash2, Save, Plus, Copy, Sparkles, AlertCircle, Loader2,
    Database, FileSpreadsheet, Download, Upload, Filter, RefreshCw, FileJson, CheckCircle,
    Wrench, MoreHorizontal, ArrowRightLeft, PenTool, ChevronDown
} from 'lucide-react';
import { Product, BOMItem, InventoryItem } from '../types';
import { GoogleGenAI } from "@google/genai";
import SearchableSelect from '../components/SearchableSelect';

const RawMaterialBOM: React.FC = () => {
    const data = useFactoryData();
    const { factory_products = [], packing_raw_materials = [] } = data;
    const { updateData } = useFactoryActions();
    const { apiKey } = useApiKey();
    const { t } = useTranslation();

    // Default to 'bom' tab as per user focus on BOM management UI
    const [activeTab, setActiveTab] = useState<'inventory' | 'bom'>('bom');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(factory_products[0]?.id || null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Inline Editing State ---
    const [localMaterials, setLocalMaterials] = useState<InventoryItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        setLocalMaterials(packing_raw_materials);
    }, [packing_raw_materials]);

    const [newItemData, setNewItemData] = useState<Partial<InventoryItem>>({
        name: '', quantity: 0, unit: 'kg', costPerUnit: 0
    });

    const filteredMaterials = useMemo(() => {
        return localMaterials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [localMaterials, searchTerm]);

    const filteredProducts = useMemo(() => {
        return factory_products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [factory_products, searchTerm]);

    const selectedProduct = useMemo(() => 
        factory_products.find(p => p.id === selectedProductId) || null
    , [selectedProductId, factory_products]);

    // Pre-calculate options for Select
    const materialOptions = useMemo(() => 
        packing_raw_materials.map(m => ({ 
            value: m.id, 
            label: m.name,
            subLabel: `Stock: ${m.quantity} ${m.unit} | Cost: ฿${m.costPerUnit}`
        }))
    , [packing_raw_materials]);

    // --- Handlers ---

    const handleLocalChange = (id: string, field: keyof InventoryItem, value: any) => {
        setLocalMaterials(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const saveChanges = async () => {
        await updateData({ ...data, packing_raw_materials: localMaterials });
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur(); 
        }
    };

    const handleAddItem = async () => {
        if (!newItemData.name) return alert("กรุณาระบุชื่อวัตถุดิบ");
        const newItem: InventoryItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: newItemData.name,
            quantity: newItemData.quantity || 0,
            unit: newItemData.unit || 'kg',
            costPerUnit: newItemData.costPerUnit || 0,
            category: 'Material',
            source: 'Purchased'
        };
        const newMaterials = [...packing_raw_materials, newItem];
        await updateData({ ...data, packing_raw_materials: newMaterials });
        setNewItemData({ name: '', quantity: 0, unit: 'kg', costPerUnit: 0 });
    };

    const handleDelete = async (ids: string[]) => {
        if (ids.length === 0) return;
        if (!confirm(`ยืนยันการลบ ${ids.length} รายการ?`)) return;
        const newMaterials = packing_raw_materials.filter(m => !ids.includes(m.id));
        await updateData({ ...data, packing_raw_materials: newMaterials });
        setSelectedIds([]);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleExportCSV = () => {
        const headers = ["ID", "Name", "Quantity", "Unit", "Cost/Unit"];
        const rows = packing_raw_materials.map(m => [m.id, m.name, m.quantity, m.unit, m.costPerUnit]);
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "raw_materials.csv");
        document.body.appendChild(link);
        link.click();
    };

    const handleCopyBOM = () => {
        if (!selectedProduct) return;
        const bomText = JSON.stringify(selectedProduct.bom, null, 2);
        navigator.clipboard.writeText(bomText);
        alert("Copied BOM to clipboard!");
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] space-y-6">
            {/* Header Tabs - Matches style */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">จัดการวัตถุดิบ</h2>
                <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <button 
                        onClick={() => setActiveTab('inventory')}
                        className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'inventory' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        คลังวัตถุดิบ
                    </button>
                    <button 
                        onClick={() => setActiveTab('bom')}
                        className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'bom' ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        สูตรการผลิต (BOM)
                    </button>
                </div>
            </div>

            {activeTab === 'inventory' ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-20">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อวัตถุดิบ</label>
                                <input type="text" value={newItemData.name} onChange={e => setNewItemData({...newItemData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="ระบุชื่อ..." />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">จำนวน</label>
                                <input type="number" value={newItemData.quantity} onChange={e => setNewItemData({...newItemData, quantity: parseFloat(e.target.value)})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">หน่วย</label>
                                <input type="text" value={newItemData.unit} onChange={e => setNewItemData({...newItemData, unit: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center" placeholder="kg" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">ต้นทุน/หน่วย</label>
                                <input type="number" value={newItemData.costPerUnit} onChange={e => setNewItemData({...newItemData, costPerUnit: parseFloat(e.target.value)})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center" placeholder="0.00" />
                            </div>
                            <div className="md:col-span-2">
                                <button onClick={handleAddItem} className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-all text-sm flex items-center justify-center gap-2"><Plus size={16}/> เพิ่ม</button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                             <div className="relative w-full max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input type="text" placeholder="ค้นหาวัตถุดิบ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500" />
                             </div>
                             <div className="flex gap-2">
                                {selectedIds.length > 0 && (
                                    <button onClick={() => handleDelete(selectedIds)} className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 flex items-center gap-2"><Trash2 size={14}/> ลบ ({selectedIds.length})</button>
                                )}
                                <button onClick={handleExportCSV} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-2"><Download size={14}/> Export</button>
                             </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 w-10"><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? filteredMaterials.map(m => m.id) : [])} checked={selectedIds.length === filteredMaterials.length && filteredMaterials.length > 0} className="rounded border-slate-300 text-green-600 focus:ring-green-500" /></th>
                                        <th className="px-6 py-4">ชื่อวัตถุดิบ</th>
                                        <th className="px-6 py-4 w-32 text-center">คงเหลือ</th>
                                        <th className="px-6 py-4 w-24 text-center">หน่วย</th>
                                        <th className="px-6 py-4 w-32 text-center">ต้นทุน (บาท)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredMaterials.map(m => (
                                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleSelect(m.id)} className="rounded border-slate-300 text-green-600 focus:ring-green-500" /></td>
                                            <td className="px-6 py-2"><input type="text" value={m.name} onChange={(e) => handleLocalChange(m.id, 'name', e.target.value)} onBlur={saveChanges} className="w-full bg-transparent font-medium text-slate-800 outline-none" /></td>
                                            <td className="px-6 py-2 text-center"><input type="number" value={m.quantity} onChange={(e) => handleLocalChange(m.id, 'quantity', parseFloat(e.target.value))} onBlur={saveChanges} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-bold outline-none" /></td>
                                            <td className="px-6 py-2 text-center"><input type="text" value={m.unit} onChange={(e) => handleLocalChange(m.id, 'unit', e.target.value)} onBlur={saveChanges} className="w-full bg-transparent text-center text-slate-500 text-xs outline-none" /></td>
                                            <td className="px-6 py-2 text-center"><input type="number" value={m.costPerUnit} onChange={(e) => handleLocalChange(m.id, 'costPerUnit', parseFloat(e.target.value))} onBlur={saveChanges} className="w-full bg-transparent text-center text-slate-700 font-mono outline-none" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex gap-6 overflow-hidden animate-in fade-in duration-300">
                    <div className="w-80 flex flex-col gap-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-slate-800">เลือกสินค้า</h3>
                            <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">A-Z</div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="ค้นหาสินค้า..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 shadow-sm" />
                        </div>
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {filteredProducts.map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => setSelectedProductId(p.id)}
                                    className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between text-sm ${selectedProductId === p.id ? 'bg-green-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-100'}`}
                                >
                                    <span className="font-bold truncate">{p.name}</span>
                                    {p.bom && p.bom.length > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${selectedProductId === p.id ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'}`}>มี BOM</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        {selectedProduct ? (
                            <>
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="text-xl font-bold text-green-700 mb-1">{selectedProduct.name}</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Production Recipe (BOM)</p>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                    {selectedProduct.bom && selectedProduct.bom.length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 text-slate-500 font-bold text-xs">
                                                <tr>
                                                    <th className="py-3 px-4 text-left rounded-l-lg">วัตถุดิบ</th>
                                                    <th className="py-3 px-4 text-center">จำนวน</th>
                                                    <th className="py-3 px-4 text-center">หน่วย</th>
                                                    <th className="py-3 px-4 text-right">ต้นทุน/หน่วย</th>
                                                    <th className="py-3 px-4 text-right rounded-r-lg">ต้นทุนรวม</th>
                                                    <th className="w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {selectedProduct.bom.map((item, idx) => {
                                                    const mat = packing_raw_materials.find(m => m.id === item.materialId);
                                                    const cost = mat?.costPerUnit || 0;
                                                    const total = (item.quantityPerUnit || 0) * cost;
                                                    return (
                                                        <tr key={idx} className="group">
                                                            <td className="py-3 px-4">
                                                                <SearchableSelect 
                                                                    options={materialOptions}
                                                                    value={item.materialId}
                                                                    onChange={(val) => {
                                                                        const newBOM = [...selectedProduct.bom!];
                                                                        const m = packing_raw_materials.find(x => x.id === val);
                                                                        newBOM[idx] = { ...newBOM[idx], materialId: val, materialName: m?.name || '' };
                                                                        updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: newBOM} : p)});
                                                                    }}
                                                                    placeholder="-- เลือกวัตถุดิบ --"
                                                                    className="w-full"
                                                                />
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <input type="number" step="any" value={item.quantityPerUnit || ''} onChange={e => {
                                                                    const newBOM = [...selectedProduct.bom!];
                                                                    newBOM[idx].quantityPerUnit = parseFloat(e.target.value) || 0;
                                                                    updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: newBOM} : p)});
                                                                }} className="w-full p-2 border border-slate-200 rounded-lg text-center outline-none focus:border-green-500" />
                                                            </td>
                                                            <td className="py-3 px-4 text-center text-slate-500 text-xs">{mat?.unit || 'ชิ้น'}</td>
                                                            <td className="py-3 px-4 text-right text-slate-500 text-xs">฿{cost.toFixed(2)}</td>
                                                            <td className="py-3 px-4 text-right font-bold text-slate-800">฿{total.toFixed(2)}</td>
                                                            <td className="py-3 text-center">
                                                                <button onClick={() => updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: selectedProduct.bom?.filter((_, i) => i !== idx)} : p)})} className="text-red-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                            <p className="font-bold text-sm">ยังไม่มีรายการ BOM สำหรับสินค้านี้</p>
                                            <p className="text-xs italic mt-1">กดปุ่มด้านล่างเพื่อเพิ่มส่วนประกอบ</p>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-6 bg-slate-50 border-t border-slate-100">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="font-bold text-slate-600 text-sm">ต้นทุนวัตถุดิบรวม</span>
                                        <span className="text-2xl font-black text-slate-800">฿{selectedProduct.bom?.reduce((acc, i) => acc + (i.quantityPerUnit * (packing_raw_materials.find(m => m.id === i.materialId)?.costPerUnit || 0)), 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: [...(selectedProduct.bom || []), { materialId: '', materialName: '', quantityPerUnit: 0 }]} : p)})} className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-600 text-sm hover:bg-slate-50">เพิ่มส่วนประกอบ</button>
                                        <button onClick={() => alert("บันทึก BOM เรียบร้อยแล้ว")} className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-green-200 hover:bg-green-700">บันทึก BOM</button>
                                        <button onClick={handleCopyBOM} className="px-4 py-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-100"><Copy size={16}/> คัดลอก BOM</button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-300">
                                <p>กรุณาเลือกสินค้าจากด้านซ้าย</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RawMaterialBOM;
