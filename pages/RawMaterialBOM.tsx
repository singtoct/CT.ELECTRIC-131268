
import React, { useState, useMemo, useRef } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Search, Trash2, Save, Plus, Copy, Sparkles, AlertCircle, Loader2,
    Database, FileSpreadsheet, Download, Upload, Filter, RefreshCw, FileJson, CheckCircle
} from 'lucide-react';
import { Product, BOMItem, InventoryItem } from '../types';
import { GoogleGenAI } from "@google/genai";

const RawMaterialBOM: React.FC = () => {
    const data = useFactoryData();
    const { factory_products = [], packing_raw_materials = [] } = data;
    const { updateData } = useFactoryActions();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<'inventory' | 'bom'>('bom');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(factory_products[0]?.id || null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New Material State
    const [newMaterial, setNewMaterial] = useState<Partial<InventoryItem>>({
        name: '', quantity: 0, unit: 'kg', costPerUnit: 0
    });

    const filteredProducts = useMemo(() => {
        return factory_products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [factory_products, searchTerm]);

    const filteredMaterials = useMemo(() => {
        return packing_raw_materials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [packing_raw_materials, searchTerm]);

    const selectedProduct = useMemo(() => 
        factory_products.find(p => p.id === selectedProductId) || null
    , [selectedProductId, factory_products]);

    // --- Core Import Logic: Follow User's instruction for ID/Name lookup ---
    const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target?.result as string);
                
                // 1. Get raw material reference list from the JSON (The instructions said look here)
                const jsonRawMaterials = Array.isArray(importedData.raw_materials) 
                    ? importedData.raw_materials 
                    : (importedData.packing_raw_materials || []);
                
                // 2. Get product list from the JSON
                const jsonProducts = Array.isArray(importedData) 
                    ? importedData 
                    : (importedData.factory_products || importedData.products || []);

                let updatedCount = 0;
                let autoMatchedMaterials = 0;

                const newFactoryProducts = factory_products.map(localProd => {
                    // Match Product by ID or Name (Name is more reliable per user)
                    const importMatch = jsonProducts.find((p: any) => 
                        p.id === localProd.id || 
                        p.name?.trim().toLowerCase() === localProd.name?.trim().toLowerCase()
                    );

                    if (!importMatch || !importMatch.bom) return localProd;

                    const newBOM: BOMItem[] = importMatch.bom.map((impItem: any) => {
                        const impId = impItem.rawMaterialId || impItem.materialId || impItem.id;
                        let impName = impItem.materialName || impItem.name;

                        // LOGIC: If ID exists but Name is missing, find Name in the JSON's own raw_materials list
                        if (!impName && impId) {
                            const refMat = jsonRawMaterials.find((rm: any) => rm.id === impId);
                            if (refMat) impName = refMat.name;
                        }

                        // MATCH: Now find this material in our current LOCAL database by name
                        const localMat = packing_raw_materials.find(m => 
                            m.name.trim().toLowerCase() === (impName || '').trim().toLowerCase()
                        );

                        if (localMat) autoMatchedMaterials++;

                        return {
                            materialId: localMat?.id || '',
                            materialName: localMat?.name || impName || 'Unknown Material',
                            quantityPerUnit: parseFloat(impItem.quantityPerUnit || impItem.quantity || 0)
                        };
                    });

                    updatedCount++;
                    return { ...localProd, bom: newBOM };
                });

                await updateData({ ...data, factory_products: newFactoryProducts });
                alert(`นำเข้า BOM สำเร็จ!\n- อัปเดตสินค้า: ${updatedCount} รายการ\n- จับคู่ชื่อวัตถุดิบเข้าคลังปัจจุบัน: ${autoMatchedMaterials} รายการ`);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } catch (err) {
                console.error(err);
                alert("ไฟล์ JSON ไม่ถูกต้อง กรุณาตรวจสอบรูปแบบข้อมูล");
            }
        };
        reader.readAsText(file);
    };

    const handleAiAutoFix = async () => {
        if (!selectedProduct || !selectedProduct.bom) return;
        setIsAiLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Map materials to IDs. Stock: ${JSON.stringify(packing_raw_materials.map(m => ({id: m.id, name: m.name})))}. Match items: ${selectedProduct.bom.filter(i => !i.materialId).map(i => i.materialName).join(', ')}. Return JSON [{"originalName": "...", "matchedId": "..."}]`;
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
        } catch (error) { alert("AI ไม่พร้อมใช้งาน"); }
        finally { setIsAiLoading(false); }
    };

    const handleAddMaterial = async () => {
        if (!newMaterial.name) return;
        const newItem: InventoryItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: newMaterial.name!,
            quantity: newMaterial.quantity || 0,
            unit: newMaterial.unit || 'kg',
            costPerUnit: newMaterial.costPerUnit || 0,
            category: 'Material',
            source: 'Purchased'
        };
        await updateData({ ...data, packing_raw_materials: [...packing_raw_materials, newItem] });
        setNewMaterial({ name: '', quantity: 0, unit: 'kg', costPerUnit: 0 });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">จัดการวัตถุดิบ & BOM</h2>
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                        <button 
                            onClick={() => setActiveTab('inventory')}
                            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'inventory' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            คลังวัตถุดิบ
                        </button>
                        <button 
                            onClick={() => setActiveTab('bom')}
                            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'bom' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            สูตรการผลิต (BOM)
                        </button>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleJsonImport} accept=".json" className="hidden" />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-xl hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
                    >
                        <FileJson size={18} /> นำเข้า BOM (JSON)
                    </button>
                </div>
            </div>

            {activeTab === 'inventory' ? (
                <div className="flex-1 flex flex-col space-y-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                             <Plus className="text-primary-600" size={20}/> เพิ่ม/แก้ไข วัตถุดิบในคลัง
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อวัตถุดิบ</label>
                                <input type="text" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} className="w-full px-5 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวนคงเหลือ</label>
                                <input type="number" value={newMaterial.quantity} onChange={e => setNewMaterial({...newMaterial, quantity: parseFloat(e.target.value)})} className="w-full px-5 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-bold text-primary-600" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">หน่วย</label>
                                <input type="text" value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})} className="w-full px-5 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ต้นทุนต่อหน่วย (บาท)</label>
                                <input type="number" value={newMaterial.costPerUnit} onChange={e => setNewMaterial({...newMaterial, costPerUnit: parseFloat(e.target.value)})} className="w-full px-5 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-bold" />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-8">
                            <button onClick={handleAddMaterial} className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-primary-600/20 flex items-center gap-2"><Plus size={20}/> เพิ่มเข้าคลัง</button>
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="relative w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" placeholder="ค้นหาวัตถุดิบ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-sm outline-none font-bold" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-[10px] border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5">ชื่อวัตถุดิบ</th>
                                        <th className="px-6 py-5 text-center">จำนวนคงเหลือ</th>
                                        <th className="px-6 py-5 text-center">หน่วย</th>
                                        <th className="px-6 py-5 text-right">ต้นทุน/หน่วย</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredMaterials.map(m => (
                                        <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-8 py-5 font-black text-slate-800">{m.name}</td>
                                            <td className="px-6 py-5 text-center font-mono font-bold text-primary-600">{m.quantity.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-center font-bold text-slate-500">{m.unit}</td>
                                            <td className="px-6 py-5 text-right font-mono font-bold">฿{m.costPerUnit?.toFixed(2)}</td>
                                            <td className="px-8 py-5 text-right">
                                                <button onClick={async () => await updateData({...data, packing_raw_materials: packing_raw_materials.filter(i => i.id !== m.id)})} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex gap-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Split View BOM */}
                    <div className="w-80 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input type="text" placeholder="ค้นหาสินค้า..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:bg-white transition-all font-bold" />
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
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">กำหนดส่วนประกอบ (Bill of Materials)</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedProduct.bom?.some(i => !i.materialId) && (
                                            <button onClick={handleAiAutoFix} disabled={isAiLoading} className="flex items-center gap-2 bg-gradient-to-br from-primary-600 to-primary-900 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-lg hover:opacity-90 transition-all hover:scale-105">
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
                                                    <th className="pb-4 text-left">เลือกวัตถุดิบจากคลัง</th>
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
                                                                        <AlertCircle size={12}/> ID ไม่ตรงกับคลังปัจจุบัน (กรุณาเลือกวัตถุดิบใหม่ หรือใช้ AI ช่วย)
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
                                            <p className="text-xs mt-2 font-bold">คุณสามารถ "นำเข้าจาก JSON" หรือ "เพิ่มส่วนประกอบ" ด้วยตนเองได้</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-12">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ต้นทุนรวมต่อชิ้น</span>
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
                                <p className="font-black tracking-widest uppercase text-lg">กรุณาเลือกสินค้าที่แถบซ้ายมือ</p>
                                <p className="text-sm font-bold">เพื่อเริ่มต้นกำหนดหรือแก้ไขสูตรการผลิต (BOM)</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RawMaterialBOM;
