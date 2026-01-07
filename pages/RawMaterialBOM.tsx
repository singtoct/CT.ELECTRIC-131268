
import React, { useState, useMemo, useEffect } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Search, Trash2, Plus, Copy, Database, 
    FileSpreadsheet, CheckCircle, ChevronDown, Printer, X, QrCode, Tag,
    Calculator, AlertTriangle, PackageCheck, ArrowRight, DollarSign,
    Edit, Info, Truck, Calendar, Layers, Save, Building2
} from 'lucide-react';
import { InventoryItem, Product, BOMItem } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import { useSortableData } from '../hooks/useSortableData';
import SortableTh from '../components/SortableTh';

const RawMaterialBOM: React.FC = () => {
    const data = useFactoryData();
    const { 
        factory_products = [], 
        packing_raw_materials = [], 
        factory_suppliers = [], // Need suppliers for source tracking
        factory_settings 
    } = data;
    const { updateData } = useFactoryActions();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<'inventory' | 'bom'>('inventory');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(factory_products[0]?.id || null);
    
    // Simulation State
    const [simulationQty, setSimulationQty] = useState<number>(1000); 

    const [localMaterials, setLocalMaterials] = useState<InventoryItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Sticker / Label State
    const [labelItem, setLabelItem] = useState<InventoryItem | null>(null);

    // Edit / Detail Modal State
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [currentMaterial, setCurrentMaterial] = useState<InventoryItem | null>(null);

    useEffect(() => {
        setLocalMaterials(packing_raw_materials);
    }, [packing_raw_materials]);

    const filteredMaterials = useMemo(() => {
        return localMaterials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [localMaterials, searchTerm]);

    // --- SORTING HOOK ---
    const { items: sortedMaterials, requestSort, sortConfig } = useSortableData(filteredMaterials, { key: 'name', direction: 'ascending' });

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

    const supplierOptions = useMemo(() => 
        factory_suppliers.map(s => ({ value: s.id, label: s.name }))
    , [factory_suppliers]);

    // --- BOM Analysis Logic ---
    const bomAnalysis = useMemo(() => {
        if (!selectedProduct?.bom) return { maxProduceable: 0, totalCost: 0 };

        let maxProduceable = Infinity;
        let totalCost = 0;

        selectedProduct.bom.forEach(item => {
            const mat = packing_raw_materials.find(m => m.id === item.materialId) ||
                        packing_raw_materials.find(m => m.name.trim().toLowerCase() === item.materialName.trim().toLowerCase());
            
            const stock = mat?.quantity || 0;
            const usage = item.quantityPerUnit || 0;
            const cost = mat?.costPerUnit || 0;

            totalCost += (usage * cost);

            if (usage > 0) {
                const possible = Math.floor(stock / usage);
                if (possible < maxProduceable) maxProduceable = possible;
            }
        });

        if (maxProduceable === Infinity) maxProduceable = 0;

        return { maxProduceable, totalCost };
    }, [selectedProduct, packing_raw_materials]);


    // --- Actions ---

    const handleOpenEdit = (item: InventoryItem) => {
        setCurrentMaterial({ ...item });
        setIsMaterialModalOpen(true);
    };

    const handleCreateNewMaterial = () => {
        setCurrentMaterial({
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            quantity: 0,
            unit: 'kg',
            costPerUnit: 0,
            category: 'Raw Material',
            source: 'Purchased',
            isoStatus: 'Released',
            receivedDate: new Date().toISOString().split('T')[0]
        });
        setIsMaterialModalOpen(true);
    };

    const handleDeleteMaterial = async (id: string) => {
        if(!confirm("ยืนยันการลบวัตถุดิบนี้? ข้อมูลที่ผูกกับสูตรผลิต (BOM) อาจได้รับผลกระทบ")) return;
        const updated = packing_raw_materials.filter(m => m.id !== id);
        await updateData({ ...data, packing_raw_materials: updated });
    };

    const handleSaveMaterial = async () => {
        if (!currentMaterial || !currentMaterial.name) {
            alert("กรุณาระบุชื่อวัตถุดิบ");
            return;
        }

        let updatedMaterials = [...packing_raw_materials];
        const idx = updatedMaterials.findIndex(m => m.id === currentMaterial.id);
        
        if (idx >= 0) {
            updatedMaterials[idx] = currentMaterial;
        } else {
            updatedMaterials.push(currentMaterial);
        }

        await updateData({ ...data, packing_raw_materials: updatedMaterials });
        setIsMaterialModalOpen(false);
        setCurrentMaterial(null);
    };

    // Keep inline edit for simple quantity adjustments
    const handleInlineChange = (id: string, field: keyof InventoryItem, value: any) => {
        setLocalMaterials(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const saveInlineChanges = async () => {
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
                         <button onClick={handleCreateNewMaterial} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-900 transition-all"><Plus size={18}/> เพิ่มรายการใหม่</button>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-[2px] border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 w-10"></th>
                                    <SortableTh label="ชื่อวัตถุดิบ (Raw Material)" sortKey="name" currentSort={sortConfig} onSort={requestSort} />
                                    <SortableTh label="จำนวนคงเหลือ" sortKey="quantity" currentSort={sortConfig} onSort={requestSort} align="center" />
                                    <SortableTh label="หน่วย" sortKey="unit" currentSort={sortConfig} onSort={requestSort} align="center" />
                                    <SortableTh label="ต้นทุน/หน่วย" sortKey="costPerUnit" currentSort={sortConfig} onSort={requestSort} align="right" />
                                    <th className="px-6 py-5 text-center">จัดการ (Actions)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedMaterials.map(m => {
                                    // Resolve Supplier Name
                                    const supplierName = factory_suppliers.find(s => s.id === m.defaultSupplierId)?.name || 'Unknown Supplier';
                                    
                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-4"><input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => setSelectedIds(prev => prev.includes(m.id) ? prev.filter(i=>i!==m.id) : [...prev, m.id])} className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" /></td>
                                            <td className="px-6 py-4">
                                                <div className="font-black text-slate-800 text-base">{m.name}</div>
                                                {/* Source info preview */}
                                                <div className="flex items-center gap-3 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                        <Truck size={10}/> {supplierName}
                                                    </span>
                                                    {m.lotNumber && (
                                                        <span className="flex items-center gap-1 text-[9px] font-bold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                            <Tag size={10}/> LOT: {m.lotNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <input 
                                                    type="number" 
                                                    value={m.quantity} 
                                                    onChange={(e) => handleInlineChange(m.id, 'quantity', parseFloat(e.target.value))} 
                                                    onBlur={saveInlineChanges} 
                                                    className={tableInput} 
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center font-black text-slate-400">{m.unit}</td>
                                            <td className="px-8 py-4 text-right font-mono font-black text-slate-800 text-lg">฿{(m.costPerUnit || 0).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleOpenEdit(m)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all" title="Edit / Details">
                                                        <Edit size={16}/>
                                                    </button>
                                                    <button onClick={() => setLabelItem(m)} className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-800 hover:text-white rounded-lg transition-all" title="Print Sticker">
                                                        <Printer size={16}/>
                                                    </button>
                                                    <button onClick={() => handleDeleteMaterial(m.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all" title="Delete">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex gap-6 overflow-hidden animate-in fade-in duration-300 no-print">
                    {/* Product Selector Sidebar */}
                    <div className="w-80 flex flex-col gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" placeholder="ค้นหาชื่อสินค้า..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={inputBase} />
                        </div>
                        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-y-auto custom-scrollbar p-3 space-y-2">
                            {filteredProducts.map(p => (
                                <button key={p.id} onClick={() => setSelectedProductId(p.id)} className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${selectedProductId === p.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'hover:bg-slate-50 text-slate-700 border border-transparent'}`}>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm">{p.name}</span>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${selectedProductId === p.id ? 'text-slate-400' : 'text-slate-400'}`}>Color: {p.color}</span>
                                    </div>
                                    {p.bom && p.bom.length > 0 && <CheckCircle size={16} className={selectedProductId === p.id ? 'text-green-400' : 'text-slate-300'}/>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* BOM Detail Pane */}
                    <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                        {selectedProduct ? (
                            <>
                                {/* Header & Summary */}
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedProduct.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded font-black uppercase tracking-wider text-slate-500">Cycle Time: {selectedProduct.cycleTimeSeconds}s</span>
                                                <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded font-black uppercase tracking-wider text-slate-500">Margin: {selectedProduct.profitMargin}%</span>
                                            </div>
                                        </div>
                                        <button onClick={handleCopyBOM} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all"><Copy size={18}/></button>
                                    </div>

                                    {/* Simulation & Analysis Bar */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Calculator size={14} className="text-blue-500"/>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Production Simulator</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    value={simulationQty} 
                                                    onChange={e => setSimulationQty(parseInt(e.target.value) || 0)} 
                                                    className="w-24 text-center border-b-2 border-blue-500 font-black text-lg text-slate-800 focus:outline-none"
                                                />
                                                <span className="text-xs font-bold text-slate-500">Unit Target</span>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                                <PackageCheck size={14} className="text-emerald-500"/>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Possible Production</span>
                                            </div>
                                            <div className="text-2xl font-black text-slate-800">
                                                {bomAnalysis.maxProduceable.toLocaleString()} <span className="text-xs text-slate-400 font-bold">Units</span>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                                <DollarSign size={14} className="text-amber-500"/>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Material Cost / Unit</span>
                                            </div>
                                            <div className="text-2xl font-black text-slate-800 font-mono">
                                                ฿{bomAnalysis.totalCost.toFixed(3)} <span className="text-xs text-slate-400 font-bold"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                    {selectedProduct.bom && selectedProduct.bom.length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead className="text-slate-400 font-black text-[10px] uppercase tracking-[2px] border-b border-slate-100 bg-white sticky top-0 z-10">
                                                <tr>
                                                    <th className="pb-4 pl-2 text-left">Component (Raw Material)</th>
                                                    <th className="pb-4 px-2 text-center w-28">Usage / Unit</th>
                                                    <th className="pb-4 px-2 text-center w-32">Required (Sim)</th>
                                                    <th className="pb-4 px-2 text-center w-32">Current Stock</th>
                                                    <th className="pb-4 px-2 text-center w-28">Status</th>
                                                    <th className="pb-4 pr-2 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {selectedProduct.bom.map((item, idx) => {
                                                    // Ensure we have a valid material match by ID first, then name (robust matching)
                                                    const mat = packing_raw_materials.find(m => m.id === item.materialId) || 
                                                                packing_raw_materials.find(m => m.name.trim().toLowerCase() === item.materialName.trim().toLowerCase());
                                                    
                                                    const requiredAmount = (item.quantityPerUnit || 0) * simulationQty;
                                                    const currentStock = mat?.quantity || 0;
                                                    const shortage = Math.max(0, requiredAmount - currentStock);
                                                    const isShortage = shortage > 0;

                                                    return (
                                                        <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-4 pl-2">
                                                                <SearchableSelect 
                                                                    options={materialOptions}
                                                                    value={mat?.id || item.materialId} // Use resolved ID or fallback
                                                                    onChange={(val) => {
                                                                        const newBOM = [...selectedProduct.bom!];
                                                                        const m = packing_raw_materials.find(x => x.id === val);
                                                                        newBOM[idx] = { ...newBOM[idx], materialId: val, materialName: m?.name || '' };
                                                                        updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: newBOM} : p)});
                                                                    }}
                                                                    placeholder="Select Material..."
                                                                    className="border-0 shadow-none bg-transparent"
                                                                />
                                                            </td>
                                                            <td className="py-4 px-2">
                                                                <div className="flex items-center justify-center">
                                                                    <input 
                                                                        type="number" 
                                                                        step="any" 
                                                                        value={item.quantityPerUnit || ''} 
                                                                        onChange={e => {
                                                                            const newBOM = [...selectedProduct.bom!];
                                                                            newBOM[idx].quantityPerUnit = parseFloat(e.target.value) || 0;
                                                                            updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: newBOM} : p)});
                                                                        }} 
                                                                        className="w-20 text-center border-b border-slate-300 focus:border-blue-500 outline-none bg-transparent font-bold text-slate-800"
                                                                    />
                                                                    <span className="text-xs text-slate-400 ml-1 font-bold">{mat?.unit}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-2 text-center">
                                                                <div className="font-mono font-bold text-slate-600 bg-slate-100 rounded-lg py-1 px-2 inline-block text-xs">
                                                                    {requiredAmount.toLocaleString(undefined, {maximumFractionDigits: 4})} {mat?.unit}
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-2 text-center">
                                                                <div className="font-mono text-sm font-bold text-slate-700">
                                                                    {currentStock.toLocaleString(undefined, {maximumFractionDigits: 2})}
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-2 text-center">
                                                                {isShortage ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 border border-red-100">
                                                                            <AlertTriangle size={10}/> Shortage
                                                                        </span>
                                                                        <span className="text-[9px] text-red-500 font-bold mt-0.5">-{shortage.toFixed(2)} {mat?.unit}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 border border-green-100 w-fit mx-auto">
                                                                        <CheckCircle size={10}/> Available
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-4 pr-2 text-right">
                                                                <button 
                                                                    onClick={() => {
                                                                        const newBOM = selectedProduct.bom!.filter((_, i) => i !== idx);
                                                                        updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: newBOM} : p)});
                                                                    }}
                                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                >
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            </td>
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
                                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center relative">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Components</span>
                                        <span className="text-lg font-black text-slate-800">{selectedProduct.bom?.length || 0} Items</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => updateData({...data, factory_products: factory_products.map(p => p.id === selectedProduct.id ? {...selectedProduct, bom: [...(selectedProduct.bom || []), { materialId: '', materialName: '', quantityPerUnit: 0 }]} : p)})} className="px-6 py-3 bg-white border border-slate-300 rounded-xl font-black text-xs text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                                            <Plus size={14}/> Add Component
                                        </button>
                                        <button onClick={() => alert("BOM Updated in System Memory")} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs shadow-xl shadow-slate-900/20 hover:bg-black transition-all active:scale-95 flex items-center gap-2">
                                            <Database size={14}/> Save Recipe
                                        </button>
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

            {/* Sticker Print Modal (Existing) */}
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

            {/* --- ADD/EDIT MATERIAL MODAL --- */}
            {isMaterialModalOpen && currentMaterial && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200 no-print">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[85vh]">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                    {currentMaterial.id ? 'รายละเอียดวัตถุดิบ (Material Details)' : 'เพิ่มรายการวัตถุดิบใหม่'}
                                </h3>
                                <p className="text-xs text-slate-500 font-bold mt-1">ข้อมูลที่มาและการจัดเก็บ</p>
                            </div>
                            <button onClick={() => setIsMaterialModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"><X size={24}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            {/* General Info */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers size={14}/> ข้อมูลทั่วไป</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ชื่อวัตถุดิบ <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={currentMaterial.name} 
                                        onChange={e => setCurrentMaterial({...currentMaterial, name: e.target.value})} 
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="เช่น เม็ด PC ใส, สีผงขาว..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">หมวดหมู่</label>
                                    <select 
                                        value={currentMaterial.category || 'Raw Material'} 
                                        onChange={e => setCurrentMaterial({...currentMaterial, category: e.target.value})}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 bg-white"
                                    >
                                        <option value="Raw Material">Raw Material (วัตถุดิบหลัก)</option>
                                        <option value="Component">Component (ชิ้นส่วนประกอบ)</option>
                                        <option value="Packaging">Packaging (บรรจุภัณฑ์)</option>
                                    </select>
                                </div>
                            </div>

                            <hr className="border-slate-100"/>

                            {/* Source Tracking */}
                            <div className="space-y-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2"><Truck size={14}/> ที่มาและแหล่งจัดหา (Origin)</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ซัพพลายเออร์หลัก (Default Supplier)</label>
                                    <SearchableSelect 
                                        options={supplierOptions}
                                        value={currentMaterial.defaultSupplierId}
                                        onChange={(val) => setCurrentMaterial({...currentMaterial, defaultSupplierId: val})}
                                        placeholder="ระบุ Supplier..."
                                        className="bg-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Lot Number</label>
                                        <input 
                                            type="text" 
                                            value={currentMaterial.lotNumber || ''} 
                                            onChange={e => setCurrentMaterial({...currentMaterial, lotNumber: e.target.value})} 
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 bg-white"
                                            placeholder="LOT-XXXX"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">วันที่รับของ</label>
                                        <input 
                                            type="date" 
                                            value={currentMaterial.receivedDate || ''} 
                                            onChange={e => setCurrentMaterial({...currentMaterial, receivedDate: e.target.value})} 
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Inventory Data */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Database size={14}/> ข้อมูลคลังและต้นทุน</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">จำนวนคงเหลือ</label>
                                        <input 
                                            type="number" 
                                            value={currentMaterial.quantity} 
                                            onChange={e => setCurrentMaterial({...currentMaterial, quantity: parseFloat(e.target.value) || 0})} 
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl font-black text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">หน่วยนับ</label>
                                        <input 
                                            type="text" 
                                            value={currentMaterial.unit} 
                                            onChange={e => setCurrentMaterial({...currentMaterial, unit: e.target.value})} 
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="kg, pcs, set"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ต้นทุนต่อหน่วย (฿)</label>
                                        <input 
                                            type="number" 
                                            value={currentMaterial.costPerUnit || 0} 
                                            onChange={e => setCurrentMaterial({...currentMaterial, costPerUnit: parseFloat(e.target.value) || 0})} 
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">จุดสั่งซื้อ (Min Level)</label>
                                        <input 
                                            type="number" 
                                            // Assuming reservedQuantity is treated as min level for now or add a new field if needed
                                            value={currentMaterial.reservedQuantity || 0} 
                                            onChange={e => setCurrentMaterial({...currentMaterial, reservedQuantity: parseFloat(e.target.value) || 0})} 
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="แจ้งเตือนเมื่อต่ำกว่า"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ISO Status */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">สถานะคุณภาพ (ISO/QC)</label>
                                <select 
                                    value={currentMaterial.isoStatus || 'Released'} 
                                    onChange={e => setCurrentMaterial({...currentMaterial, isoStatus: e.target.value as any})}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 bg-white"
                                >
                                    <option value="Released">Released (ผ่าน - พร้อมใช้)</option>
                                    <option value="Quarantine">Quarantine (รอตรวจสอบ)</option>
                                    <option value="Hold">Hold (กักกัน)</option>
                                    <option value="Rejected">Rejected (ไม่ผ่าน)</option>
                                </select>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setIsMaterialModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">ยกเลิก</button>
                            <button onClick={handleSaveMaterial} className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-black transition-all flex items-center gap-2 active:scale-95">
                                <Save size={18}/> บันทึกข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RawMaterialBOM;
