
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

const RawMaterialBOM: React.FC = () => {
    const data = useFactoryData();
    const { factory_products = [], packing_raw_materials = [] } = data;
    const { updateData } = useFactoryActions();
    const { apiKey } = useApiKey();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<'inventory' | 'bom'>('inventory');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(factory_products[0]?.id || null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Inline Editing State ---
    // We keep a local copy to allow smooth typing without re-rendering the whole app on every keystroke
    const [localMaterials, setLocalMaterials] = useState<InventoryItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Sync global data to local state when it changes (and we are not actively typing/editing strictly)
    useEffect(() => {
        setLocalMaterials(packing_raw_materials);
    }, [packing_raw_materials]);

    // --- Form State (For adding NEW items only) ---
    const [newItemData, setNewItemData] = useState<Partial<InventoryItem>>({
        name: '', quantity: 0, unit: 'kg', costPerUnit: 0
    });

    // --- Computed Data ---
    const filteredMaterials = useMemo(() => {
        return localMaterials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [localMaterials, searchTerm]);

    const filteredProducts = useMemo(() => {
        return factory_products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [factory_products, searchTerm]);

    const selectedProduct = useMemo(() => 
        factory_products.find(p => p.id === selectedProductId) || null
    , [selectedProductId, factory_products]);

    // --- Handlers: Inline Editing ---

    const handleLocalChange = (id: string, field: keyof InventoryItem, value: any) => {
        setLocalMaterials(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const saveChanges = async () => {
        // Commit local state to global state
        // We find the difference or just save the whole array for simplicity in this context
        await updateData({ ...data, packing_raw_materials: localMaterials });
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur(); // Trigger onBlur to save
        }
    };

    // --- Handlers: Inventory CRUD ---

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

    // --- Handlers: Tools ---

    const handleMergeDuplicates = async () => {
        const nameMap: Record<string, InventoryItem[]> = {};
        packing_raw_materials.forEach(item => {
            const name = item.name.trim().toLowerCase();
            if (!nameMap[name]) nameMap[name] = [];
            nameMap[name].push(item);
        });

        let mergedCount = 0;
        let newMaterials = [...packing_raw_materials];

        Object.values(nameMap).forEach(group => {
            if (group.length > 1) {
                const primary = group[0];
                const totalQty = group.reduce((sum, i) => sum + (i.quantity || 0), 0);
                newMaterials = newMaterials.filter(m => !group.map(g => g.id).includes(m.id));
                newMaterials.push({ ...primary, quantity: totalQty });
                mergedCount++;
            }
        });

        if (mergedCount > 0) {
            await updateData({ ...data, packing_raw_materials: newMaterials });
            alert(`รวมรายการที่ชื่อซ้ำกันสำเร็จ ${mergedCount} รายการ`);
        } else {
            alert("ไม่พบรายการที่ชื่อซ้ำกัน");
        }
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

    // --- BOM AI Handlers ---
    const handleAiAutoFix = async () => {
        if (!selectedProduct || !selectedProduct.bom) return;
        if (!apiKey) {
            alert("กรุณาใส่ API Key ก่อนใช้งานฟีเจอร์นี้");
            return;
        }
        setIsAiLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: apiKey });
            const prompt = `Map materials to IDs. Stock: ${JSON.stringify(packing_raw_materials.map(m => ({id: m.id, name: m.name})))}. Items: ${selectedProduct.bom.filter(i => !i.materialId).map(i => i.materialName).join(', ')}. Return JSON [{"originalName": "...", "matchedId": "..."}]`;
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" } });
            const results = JSON.parse(response.text);
            const newBOM = [...selectedProduct.bom].map(item => {
                const res = results.find((r: any) => r.originalName === item.materialName);
                if (res && res.matchedId) {
                    const mat = packing_raw_materials.find(m => m.id === res.matchedId);
                    return mat ? { ...item, materialId: mat.id, materialName: mat.name } : item;
                }
                return item;
            });
            await updateData({ ...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? { ...selectedProduct, bom: newBOM } : p) });
            alert("AI จับคู่ข้อมูลสำเร็จ!");
        } catch (error) { alert("AI ไม่พร้อมใช้งาน: " + error); }
        finally { setIsAiLoading(false); }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] space-y-4">
            {/* Header Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">จัดการวัตถุดิบ & สูตร (BOM)</h2>
                    <p className="text-xs text-slate-400 font-bold">Material Resource Planning</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('inventory')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'inventory' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        คลังวัตถุดิบ
                    </button>
                    <button 
                        onClick={() => setActiveTab('bom')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'bom' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        สูตรการผลิต (BOM)
                    </button>
                </div>
            </div>

            {activeTab === 'inventory' ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-20">
                    
                    {/* 1. Add New Item Section (Quick Add) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-sm">
                            <Plus size={18} className="text-primary-500"/> เพิ่มวัตถุดิบใหม่ (Quick Add)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-4">
                                <input 
                                    type="text" 
                                    value={newItemData.name} 
                                    onChange={e => setNewItemData({...newItemData, name: e.target.value})} 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                    placeholder="ชื่อวัตถุดิบ..."
                                />
                            </div>
                            <div className="md:col-span-2">
                                <input 
                                    type="number" 
                                    value={newItemData.quantity} 
                                    onChange={e => setNewItemData({...newItemData, quantity: parseFloat(e.target.value)})} 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-center"
                                    placeholder="จำนวน"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <input 
                                    type="text" 
                                    value={newItemData.unit} 
                                    onChange={e => setNewItemData({...newItemData, unit: e.target.value})} 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-center"
                                    placeholder="หน่วย (kg)"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <input 
                                    type="number" 
                                    value={newItemData.costPerUnit} 
                                    onChange={e => setNewItemData({...newItemData, costPerUnit: parseFloat(e.target.value)})} 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-center"
                                    placeholder="ทุน/หน่วย"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <button 
                                    onClick={handleAddItem}
                                    className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <Plus size={16}/> เพิ่ม
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 2. Helper Tools Banner */}
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Wrench size={16}/></div>
                                <div>
                                    <h4 className="font-bold text-amber-800 text-xs">เครื่องมือแก้ไขข้อมูล</h4>
                                    <p className="text-[10px] text-amber-600">รวมยอดสต็อกและแก้ไข BOM ที่เกี่ยวข้อง</p>
                                </div>
                            </div>
                            <button onClick={handleMergeDuplicates} className="px-3 py-1.5 bg-amber-600 text-white text-[10px] font-bold rounded-lg hover:bg-amber-700 shadow-sm">
                                รวมชื่อซ้ำ
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 flex items-center gap-2"><Upload size={14}/> นำเข้า</button>
                            <button onClick={handleExportCSV} className="px-3 py-2 bg-green-50 text-green-600 border border-green-200 rounded-xl text-xs font-bold hover:bg-green-100 flex items-center gap-2"><Download size={14}/> ส่งออก</button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" />
                        </div>
                    </div>

                    {/* 3. Data Table (Editable) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                             <div className="relative w-full max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="พิมพ์เพื่อค้นหา..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500" 
                                />
                             </div>
                             <div className="flex gap-2">
                                {selectedIds.length > 0 && (
                                    <button 
                                        onClick={() => handleDelete(selectedIds)}
                                        className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 flex items-center gap-2 animate-in fade-in"
                                    >
                                        <Trash2 size={14}/> ลบ ({selectedIds.length})
                                    </button>
                                )}
                             </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 w-10">
                                            <input 
                                                type="checkbox" 
                                                onChange={(e) => setSelectedIds(e.target.checked ? filteredMaterials.map(m => m.id) : [])}
                                                checked={selectedIds.length === filteredMaterials.length && filteredMaterials.length > 0}
                                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                            />
                                        </th>
                                        <th className="px-6 py-4 w-1/3">ชื่อวัตถุดิบ (แก้ไขได้)</th>
                                        <th className="px-6 py-4 w-32 text-center">จำนวนในสต็อก</th>
                                        <th className="px-6 py-4 w-24 text-center">หน่วย</th>
                                        <th className="px-6 py-4 w-32 text-center">ต้นทุน/หน่วย (บาท)</th>
                                        <th className="px-6 py-4 text-right w-20"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredMaterials.map(m => (
                                        <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.includes(m.id)}
                                                    onChange={() => toggleSelect(m.id)}
                                                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                />
                                            </td>
                                            <td className="px-6 py-2">
                                                <input 
                                                    type="text" 
                                                    value={m.name}
                                                    onChange={(e) => handleLocalChange(m.id, 'name', e.target.value)}
                                                    onBlur={saveChanges}
                                                    onKeyDown={(e) => handleKeyDown(e, m.id)}
                                                    className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-primary-500 focus:bg-white rounded px-2 py-1.5 font-bold text-slate-800 outline-none transition-all"
                                                />
                                            </td>
                                            <td className="px-6 py-2">
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        value={m.quantity}
                                                        onChange={(e) => handleLocalChange(m.id, 'quantity', parseFloat(e.target.value))}
                                                        onBlur={saveChanges}
                                                        onKeyDown={(e) => handleKeyDown(e, m.id)}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-mono font-bold focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-2">
                                                <input 
                                                    type="text" 
                                                    value={m.unit}
                                                    onChange={(e) => handleLocalChange(m.id, 'unit', e.target.value)}
                                                    onBlur={saveChanges}
                                                    onKeyDown={(e) => handleKeyDown(e, m.id)}
                                                    className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-primary-500 focus:bg-white rounded px-2 py-1.5 text-center text-slate-500 text-xs outline-none transition-all"
                                                />
                                            </td>
                                            <td className="px-6 py-2">
                                                <div className="relative">
                                                     <input 
                                                        type="number" 
                                                        value={m.costPerUnit}
                                                        onChange={(e) => handleLocalChange(m.id, 'costPerUnit', parseFloat(e.target.value))}
                                                        onBlur={saveChanges}
                                                        onKeyDown={(e) => handleKeyDown(e, m.id)}
                                                        className={`w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-primary-500 focus:bg-white rounded px-2 py-1.5 text-center font-mono text-xs outline-none transition-all ${!m.costPerUnit ? 'text-slate-300' : 'text-slate-700'}`}
                                                        placeholder="N/A"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleDelete([m.id])} 
                                                    className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex gap-6 overflow-hidden animate-in fade-in duration-500">
                    <div className="w-80 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input type="text" placeholder="ค้นหาชื่อสินค้า..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:bg-white transition-all font-bold" />
                             </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 bg-slate-50/30">
                            {filteredProducts.map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => setSelectedProductId(p.id)}
                                    className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${selectedProductId === p.id ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/30' : 'hover:bg-white text-slate-700 hover:shadow-sm'}`}
                                >
                                    <span className="font-black text-xs truncate pr-2">{p.name}</span>
                                    {p.bom && p.bom.length > 0 && (
                                        <CheckCircle className={`shrink-0 ${selectedProductId === p.id ? 'text-white' : 'text-primary-500'}`} size={14} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        {selectedProduct ? (
                            <>
                                <div className="p-8 border-b border-slate-100 bg-slate-50/20 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-2xl font-black text-primary-700 tracking-tight">{selectedProduct.name}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Production Recipe (BOM)</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedProduct.bom?.some(i => !i.materialId) && (
                                            <button onClick={handleAiAutoFix} disabled={isAiLoading} className="flex items-center gap-2 bg-gradient-to-br from-primary-600 to-primary-900 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-lg hover:opacity-90 transition-all hover:scale-105 active:scale-95">
                                                {isAiLoading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16} />} AI ช่วยจับคู่ ID
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                    {selectedProduct.bom && selectedProduct.bom.length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead className="text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-100 pb-4">
                                                <tr>
                                                    <th className="pb-4 text-left">วัตถุดิบ (อิงชื่อจากคลังปัจจุบัน)</th>
                                                    <th className="pb-4 text-center w-32">จำนวน/ชิ้น</th>
                                                    <th className="pb-4 text-center">หน่วย</th>
                                                    <th className="pb-4 text-right">ต้นทุน/หน่วย</th>
                                                    <th className="pb-4 text-right">ต้นทุนรวม</th>
                                                    <th className="pb-4 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {selectedProduct.bom.map((item, idx) => {
                                                    const mat = packing_raw_materials.find(m => m.id === item.materialId);
                                                    const cost = mat?.costPerUnit || 0;
                                                    const total = (item.quantityPerUnit || 0) * cost;
                                                    return (
                                                        <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-5">
                                                                <select 
                                                                    value={item.materialId}
                                                                    onChange={(e) => {
                                                                        const newBOM = [...selectedProduct.bom];
                                                                        const m = packing_raw_materials.find(x => x.id === e.target.value);
                                                                        newBOM[idx] = { ...newBOM[idx], materialId: e.target.value, materialName: m?.name || '' };
                                                                        updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: newBOM} : p)});
                                                                    }}
                                                                    className={`w-full p-3 border rounded-2xl font-black bg-white text-sm transition-all focus:ring-2 focus:ring-primary-500 outline-none ${!item.materialId ? 'border-red-200 text-red-500 shadow-inner bg-red-50/30' : 'border-slate-200 text-slate-800'}`}
                                                                >
                                                                    <option value="">-- {item.materialName || 'กรุณาเลือกวัตถุดิบ'} --</option>
                                                                    {packing_raw_materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                                </select>
                                                                {!item.materialId && (
                                                                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-500 font-black px-1 animate-pulse">
                                                                        <AlertCircle size={12}/> ไม่พบชื่อนี้ในคลัง (โปรดกดปุ่ม AI หรือเลือกเองจากรายการ)
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-5 px-4">
                                                                <input type="number" step="any" value={item.quantityPerUnit || ''} onChange={e => {
                                                                    const newBOM = [...selectedProduct.bom];
                                                                    newBOM[idx].quantityPerUnit = parseFloat(e.target.value) || 0;
                                                                    updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: newBOM} : p)});
                                                                }} className="w-full p-3 border border-slate-200 rounded-2xl font-black text-primary-600 text-center bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500" />
                                                            </td>
                                                            <td className="py-5 text-center font-black text-slate-400">{mat?.unit || '-'}</td>
                                                            <td className="py-5 text-right font-mono text-slate-500 font-bold">฿{cost.toFixed(2)}</td>
                                                            <td className="py-5 text-right font-black font-mono text-slate-900 text-lg">฿{total.toFixed(4)}</td>
                                                            <td className="py-5 text-right">
                                                                <button onClick={() => updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: selectedProduct.bom.filter((_, i) => i !== idx)} : p)})} className="p-2 text-slate-200 hover:text-red-500 transition-all hover:bg-red-50 rounded-xl"><Trash2 size={20}/></button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300">
                                            <FileSpreadsheet size={64} className="mb-4 opacity-20" />
                                            <p className="font-black tracking-widest uppercase text-sm">ยังไม่มีรายการ BOM สำหรับสินค้านี้</p>
                                            <p className="text-xs mt-2 font-bold italic">ใช้ปุ่ม "นำเข้า BOM (JSON)" เพื่อโหลดสูตรอัตโนมัติ</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-12">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ต้นทุนวัตถุดิบรวมต่อชิ้น</span>
                                            <span className="text-4xl font-black text-primary-700 font-mono tracking-tighter">฿{selectedProduct.bom?.reduce((acc, i) => acc + (i.quantityPerUnit * (packing_raw_materials.find(m => m.id === i.materialId)?.costPerUnit || 0)), 0).toFixed(4)}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: [...(selectedProduct.bom || []), { materialId: '', materialName: '', quantityPerUnit: 0 }]} : p)})} className="px-8 py-4 bg-white border border-slate-200 rounded-3xl font-black text-sm shadow-sm hover:bg-slate-50 transition-all hover:scale-105 active:scale-95">เพิ่มส่วนประกอบ</button>
                                        <button onClick={() => alert("บันทึก BOM เรียบร้อยแล้ว")} className="px-12 py-4 bg-primary-600 text-white rounded-3xl font-black text-sm shadow-2xl shadow-primary-600/30 hover:bg-primary-700 transition-all hover:scale-105 active:scale-95">บันทึก BOM</button>
                                        <button className="p-4 bg-slate-200 text-slate-600 rounded-3xl hover:bg-slate-300 transition-all"><Copy size={24}/></button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 opacity-50 space-y-4">
                                <div className="p-8 bg-slate-50 rounded-full">
                                    <Database size={80} className="text-slate-200" />
                                </div>
                                <p className="font-black tracking-widest uppercase text-lg">กรุณาเลือกสินค้าจากแถบซ้ายมือ</p>
                                <p className="text-sm font-bold">เพื่อเริ่มต้นจัดการสูตรการผลิต (BOM)</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RawMaterialBOM;
