
import React, { useState, useMemo, useEffect } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Search, Trash2, Plus, Copy, Database, 
    FileSpreadsheet, CheckCircle, ChevronDown, Printer, X, QrCode, Tag
} from 'lucide-react';
import { InventoryItem, Product, BOMItem } from '../types';
import SearchableSelect from '../components/SearchableSelect';

const RawMaterialBOM: React.FC = () => {
    const data = useFactoryData();
    const { factory_products = [], packing_raw_materials = [], factory_settings } = data;
    const { updateData } = useFactoryActions();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<'inventory' | 'bom'>('inventory');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(factory_products[0]?.id || null);
    
    const [localMaterials, setLocalMaterials] = useState<InventoryItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Sticker / Label State
    const [labelItem, setLabelItem] = useState<InventoryItem | null>(null);

    useEffect(() => {
        setLocalMaterials(packing_raw_materials);
    }, [packing_raw_materials]);

    const filteredMaterials = useMemo(() => {
        return localMaterials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [localMaterials, searchTerm]);

    const filteredProducts = useMemo(() => {
        return factory_products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [factory_products, searchTerm]);

    const selectedProduct = useMemo(() => 
        factory_products.find(p => p.id === selectedProductId) || null
    , [selectedProductId, factory_products]);

    const materialOptions = useMemo(() => 
        packing_raw_materials.map(m => ({ 
            value: m.id, 
            label: m.name,
            subLabel: `Stock: ${m.quantity} ${m.unit}`
        }))
    , [packing_raw_materials]);

    const handleLocalChange = (id: string, field: keyof InventoryItem, value: any) => {
        setLocalMaterials(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const saveChanges = async () => {
        await updateData({ ...data, packing_raw_materials: localMaterials });
    };

    const handleCopyBOM = () => {
        if (!selectedProduct || !selectedProduct.bom) return;
        const text = selectedProduct.bom.map(i => `${i.materialName}: ${i.quantityPerUnit}`).join('\n');
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard");
    };

    const inputBase = "w-full !bg-white !text-slate-900 border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 outline-none shadow-sm transition-all";
    const tableInput = "w-full !bg-white !text-slate-900 border border-slate-300 rounded-lg px-2 py-1.5 text-center font-bold focus:ring-2 focus:ring-primary-500 outline-none shadow-inner";

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] space-y-6">
            {/* Global Print Styles */}
            <style type="text/css" media="print">{`
                @page { size: auto; margin: 0mm; }
                body * { visibility: hidden; }
                .print-label-container, .print-label-container * { visibility: visible; }
                .print-label-container {
                    position: fixed;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    width: 100mm;
                    height: 70mm;
                    border: 2px solid black;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 5mm;
                    background: white;
                }
                .no-print { display: none !important; }
            `}</style>

            <div className="flex items-center justify-between no-print">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">จัดการคลังและสูตรผลิต</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Raw Material & BOM Control</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setActiveTab('inventory')} className={`px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${activeTab === 'inventory' ? 'bg-slate-100 text-slate-800 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}>คลังวัตถุดิบ</button>
                    <button onClick={() => setActiveTab('bom')} className={`px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${activeTab === 'bom' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>สูตรการผลิต (BOM)</button>
                </div>
            </div>

            {activeTab === 'inventory' ? (
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-in fade-in duration-300 no-print">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                         <div className="relative w-full max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="ค้นหาวัตถุดิบในคลัง..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={inputBase.replace('px-4 py-2.5', 'pl-12 pr-6 py-3')} />
                         </div>
                         <button className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-900 transition-all"><Plus size={18}/> เพิ่มรายการใหม่</button>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-[2px] border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 w-10"></th>
                                    <th className="px-6 py-5">ชื่อวัตถุดิบ (Raw Material)</th>
                                    <th className="px-6 py-5 w-40 text-center">จำนวนคงเหลือ</th>
                                    <th className="px-6 py-5 w-24 text-center">หน่วย</th>
                                    <th className="px-8 py-5 w-40 text-right">ต้นทุน/หน่วย</th>
                                    <th className="px-6 py-5 text-center">Sticker</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredMaterials.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-4"><input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => setSelectedIds(prev => prev.includes(m.id) ? prev.filter(i=>i!==m.id) : [...prev, m.id])} className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" /></td>
                                        <td className="px-6 py-4 font-black text-slate-700 text-base">
                                            {m.name}
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 font-normal">{m.id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center"><input type="number" value={m.quantity} onChange={(e) => handleLocalChange(m.id, 'quantity', parseFloat(e.target.value))} onBlur={saveChanges} className={tableInput} /></td>
                                        <td className="px-6 py-4 text-center font-black text-slate-400">{m.unit}</td>
                                        <td className="px-8 py-4 text-right font-mono font-black text-slate-800 text-lg">฿{(m.costPerUnit || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => setLabelItem(m)}
                                                className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-800 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="Print Sticker"
                                            >
                                                <Printer size={18}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex gap-6 overflow-hidden animate-in fade-in duration-300 no-print">
                    {/* Product Selector Sidebar */}
                    <div className="w-96 flex flex-col gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" placeholder="ค้นหาชื่อสินค้า..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={inputBase} />
                        </div>
                        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-y-auto custom-scrollbar p-3 space-y-2">
                            {filteredProducts.map(p => (
                                <button key={p.id} onClick={() => setSelectedProductId(p.id)} className={`w-full text-left p-5 rounded-2xl transition-all flex items-center justify-between group ${selectedProductId === p.id ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/20' : 'hover:bg-slate-50 text-slate-700 border border-transparent'}`}>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm">{p.name}</span>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${selectedProductId === p.id ? 'text-primary-100' : 'text-slate-400'}`}>Color: {p.color}</span>
                                    </div>
                                    {p.bom && p.bom.length > 0 && <CheckCircle size={16} className={selectedProductId === p.id ? 'text-white' : 'text-primary-500'}/>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* BOM Detail Pane */}
                    <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                        {selectedProduct ? (
                            <>
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedProduct.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-primary-600 font-black uppercase tracking-[2px]">Recipe Control</span>
                                            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                            <span className="text-[10px] text-slate-400 font-bold italic">Source: Internal MES Data</span>
                                        </div>
                                    </div>
                                    <button onClick={handleCopyBOM} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"><Copy size={14}/> คัดลอกสูตร</button>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                    {selectedProduct.bom && selectedProduct.bom.length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead className="text-slate-400 font-black text-[10px] uppercase tracking-[3px] border-b border-slate-100">
                                                <tr>
                                                    <th className="pb-6 px-4 text-left">วัตถุดิบประกอบ</th>
                                                    <th className="pb-6 px-4 text-center w-40">จำนวนใช้งาน (Usage)</th>
                                                    <th className="pb-6 px-4 text-center">หน่วย</th>
                                                    <th className="pb-6 px-4 text-right">ทุนปัจจุบัน</th>
                                                    <th className="pb-6 px-4 text-right">รวมต้นทุน</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {selectedProduct.bom.map((item, idx) => {
                                                    const mat = packing_raw_materials.find(m => m.id === item.materialId);
                                                    const cost = mat?.costPerUnit || 0;
                                                    const total = (item.quantityPerUnit || 0) * cost;
                                                    return (
                                                        <tr key={idx} className="group">
                                                            <td className="py-5 px-4">
                                                                <SearchableSelect 
                                                                    options={materialOptions}
                                                                    value={item.materialId}
                                                                    onChange={(val) => {
                                                                        const newBOM = [...selectedProduct.bom!];
                                                                        const m = packing_raw_materials.find(x => x.id === val);
                                                                        newBOM[idx] = { ...newBOM[idx], materialId: val, materialName: m?.name || '' };
                                                                        updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: newBOM} : p)});
                                                                    }}
                                                                    placeholder="ระบุวัตถุดิบ..."
                                                                />
                                                            </td>
                                                            <td className="py-5 px-4">
                                                                <input type="number" step="any" value={item.quantityPerUnit || ''} onChange={e => {
                                                                    const newBOM = [...selectedProduct.bom!];
                                                                    newBOM[idx].quantityPerUnit = parseFloat(e.target.value) || 0;
                                                                    updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: newBOM} : p)});
                                                                }} className={tableInput + " text-lg py-2.5"} />
                                                            </td>
                                                            <td className="py-5 px-4 text-center font-black text-slate-400">{mat?.unit || 'kg'}</td>
                                                            <td className="py-5 px-4 text-right font-mono text-slate-400">฿{cost.toFixed(2)}</td>
                                                            <td className="py-5 px-4 text-right font-black text-slate-800 text-lg">฿{total.toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                                            <Database size={64} className="mb-4 opacity-10"/>
                                            <p className="font-black uppercase tracking-widest text-xs">No Recipe Set for this Product</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-primary-500"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[4px]">Total Material Cost / Unit</span>
                                        <span className="text-4xl font-black text-slate-800 font-mono tracking-tighter">฿{selectedProduct.bom?.reduce((acc, i) => acc + (i.quantityPerUnit * (packing_raw_materials.find(m => m.id === i.materialId)?.costPerUnit || 0)), 0).toFixed(4)}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: [...(selectedProduct.bom || []), { materialId: '', materialName: '', quantityPerUnit: 0 }]} : p)})} className="px-8 py-4 bg-white border border-slate-300 rounded-2xl font-black text-sm text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">เพิ่มวัตถุดิบ</button>
                                        <button onClick={() => alert("BOM Updated in System Memory")} className="px-10 py-4 bg-primary-600 text-white rounded-2xl font-black shadow-2xl shadow-primary-600/30 hover:bg-primary-700 transition-all active:scale-95 flex items-center gap-2">บันทึกสูตรผลิต</button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/50">
                                <FileSpreadsheet size={80} className="mb-6 opacity-5"/>
                                <p className="font-black uppercase tracking-[5px] text-slate-400">Select Item</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sticker Print Modal */}
            {labelItem && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in no-print">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-slate-800 flex items-center gap-2"><Tag size={20}/> Print Preview</h3>
                            <button onClick={() => setLabelItem(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"><X size={24}/></button>
                        </div>
                        
                        <div className="p-8 bg-slate-100 flex justify-center">
                            {/* Visual representation of the label for the UI */}
                            <div className="bg-white border-2 border-black w-[400px] h-[250px] p-6 flex flex-col justify-between shadow-xl relative">
                                <div className="absolute top-2 right-2 border-2 border-black p-1">
                                    <QrCode size={48} className="text-black"/>
                                </div>
                                <div>
                                    <h4 className="font-black text-black text-xl uppercase border-b-2 border-black pb-1 mb-2 inline-block">RAW MATERIAL</h4>
                                    <h2 className="text-3xl font-black text-black leading-tight line-clamp-2">{labelItem.name}</h2>
                                    <p className="font-mono text-sm font-bold mt-1">ID: {labelItem.id.substring(0,12)}...</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-4">
                                    <div>
                                        <span className="block text-[10px] font-bold uppercase">Date Received</span>
                                        <span className="font-bold text-lg">{labelItem.receivedDate || new Date().toISOString().split('T')[0]}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] font-bold uppercase">Lot Number</span>
                                        <span className="font-black text-xl">{labelItem.lotNumber || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hidden Printable Area (Used by @media print) */}
                        <div className="print-label-container">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-black text-lg uppercase border-b-2 border-black inline-block mb-2">RAW MATERIAL</h4>
                                    <h1 className="text-4xl font-black text-black leading-none mb-2">{labelItem.name}</h1>
                                    <p className="font-mono text-xs font-bold">ID: {labelItem.id}</p>
                                </div>
                                <div className="border-4 border-black p-2">
                                    {/* Using a placeholder for QR code in print view to avoid external dependencies, visual representation only */}
                                    <div className="w-16 h-16 bg-black flex items-center justify-center text-white font-bold text-[8px] text-center p-1">
                                        SCAN ME
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t-4 border-black pt-2 mt-2 grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-xs font-bold uppercase">RECEIVED DATE</span>
                                    <span className="font-bold text-2xl">{labelItem.receivedDate || new Date().toISOString().split('T')[0]}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs font-bold uppercase">LOT NUMBER</span>
                                    <span className="font-black text-3xl">{labelItem.lotNumber || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="text-center text-[10px] font-bold mt-2 pt-1 border-t border-black">
                                {factory_settings?.companyInfo?.name || 'FACTORY OS INTERNAL TAG'}
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setLabelItem(null)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                            <button onClick={() => window.print()} className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-black transition-all flex items-center gap-2">
                                <Printer size={20}/> Print Label
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RawMaterialBOM;
