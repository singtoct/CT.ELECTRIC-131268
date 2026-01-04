
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Map, Box, Shield, AlertTriangle, ChevronRight, X, 
    ArrowRightLeft, CheckCircle2, Factory, Search,
    Package, Edit, Plus, Trash2, Settings, Zap, Layers,
    LayoutGrid, Save
} from 'lucide-react';
import { WarehouseLocation, InventoryItem, ISOStatus } from '../types';

const WarehouseMap: React.FC = () => {
    const data = useFactoryData();
    const { 
        warehouse_locations = [], 
        packing_inventory = [], 
        packing_raw_materials = [] 
    } = data;
    const { updateData } = useFactoryActions();
    const { t } = useTranslation();

    const [activeZone, setActiveZone] = useState<string>('Raw Material');
    const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(null);
    const [isDesignMode, setIsDesignMode] = useState(false);
    const [moveItem, setMoveItem] = useState<{ item: InventoryItem, sourceArray: 'inventory' | 'material' } | null>(null);
    const [editLocationForm, setEditLocationForm] = useState<Partial<WarehouseLocation> | null>(null);

    // --- Statistics & Aggregation ---
    const allInventory = useMemo(() => {
        return [
            ...packing_inventory.map(i => ({ ...i, type: 'inventory' as const })), 
            ...packing_raw_materials.map(i => ({ ...i, type: 'material' as const }))
        ];
    }, [packing_inventory, packing_raw_materials]);

    const zoneStats = useMemo(() => {
        const rawItems = packing_raw_materials.length;
        const rawValue = packing_raw_materials.reduce((sum, i) => sum + (i.quantity * (i.costPerUnit || 0)), 0);
        const finishedItems = packing_inventory.length;
        return { rawItems, rawValue, finishedItems };
    }, [packing_raw_materials, packing_inventory]);

    const locationsInZone = useMemo(() => {
        return warehouse_locations.filter(loc => loc.zone === activeZone);
    }, [warehouse_locations, activeZone]);

    const getItemsInLocation = (locationId: string) => {
        return allInventory.filter(item => item.locationId === locationId);
    };

    const getUsagePercentage = (loc: WarehouseLocation) => {
        const items = getItemsInLocation(loc.id);
        const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
        if (loc.capacity === 0) return 0;
        return Math.min((totalQty / loc.capacity) * 100, 100);
    };

    // --- Actions ---

    const handleAddLocation = async () => {
        const newLoc: WarehouseLocation = {
            id: `loc-${Date.now()}`,
            name: `${activeZone.charAt(0)}-${locationsInZone.length + 1}`.toUpperCase(),
            zone: activeZone,
            type: 'Rack',
            capacity: 1000,
            description: 'New Rack',
            tags: [],
            priority: 'Medium'
        };
        await updateData({ ...data, warehouse_locations: [...warehouse_locations, newLoc] });
    };

    const handleDeleteLocation = async (id: string) => {
        if (!confirm("Are you sure? Items in this location will need to be moved.")) return;
        const newLocs = warehouse_locations.filter(l => l.id !== id);
        await updateData({ ...data, warehouse_locations: newLocs });
        setSelectedLocation(null);
        setEditLocationForm(null);
    };

    const handleSaveLocation = async () => {
        if (!editLocationForm || !editLocationForm.id) return;
        const updatedLocs = warehouse_locations.map(l => l.id === editLocationForm.id ? { ...l, ...editLocationForm } as WarehouseLocation : l);
        await updateData({ ...data, warehouse_locations: updatedLocs });
        setEditLocationForm(null);
        setSelectedLocation(null);
    };

    const handleUpdateStatus = async (item: InventoryItem, newStatus: ISOStatus, type: 'inventory' | 'material') => {
        if (type === 'inventory') {
            const updatedInv = packing_inventory.map(i => i.id === item.id ? { ...i, isoStatus: newStatus } : i);
            await updateData({ ...data, packing_inventory: updatedInv });
        } else {
            const updatedMat = packing_raw_materials.map(i => i.id === item.id ? { ...i, isoStatus: newStatus } : i);
            await updateData({ ...data, packing_raw_materials: updatedMat });
        }
    };

    const handleMoveItem = async (targetLocId: string) => {
        if (!moveItem) return;
        if (moveItem.sourceArray === 'inventory') {
            const updatedInv = packing_inventory.map(i => i.id === moveItem.item.id ? { ...i, locationId: targetLocId } : i);
            await updateData({ ...data, packing_inventory: updatedInv });
        } else {
            const updatedMat = packing_raw_materials.map(i => i.id === moveItem.item.id ? { ...i, locationId: targetLocId } : i);
            await updateData({ ...data, packing_raw_materials: updatedMat });
        }
        setMoveItem(null);
        setSelectedLocation(null);
    };

    const getISOStatusColor = (status?: ISOStatus) => {
        switch (status) {
            case 'Quarantine': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Released': return 'bg-green-100 text-green-700 border-green-200';
            case 'Hold': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-500 border-slate-200';
        }
    };

    return (
        <div className="space-y-6 pb-10 h-full flex flex-col">
            {/* Header & Stats */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('wms.title')}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-[2px] text-slate-500">Inventory Map & Designer</span>
                            {isDesignMode && <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1"><Edit size={10}/> DESIGN MODE ACTIVE</span>}
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsDesignMode(!isDesignMode)} 
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase flex items-center gap-2 transition-all shadow-sm ${isDesignMode ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        {isDesignMode ? <CheckCircle2 size={16}/> : <LayoutGrid size={16}/>}
                        {isDesignMode ? "Finish Editing" : "Design Layout"}
                    </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600"><Layers size={20}/></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Raw Material Items</p>
                            <p className="text-xl font-black text-slate-800">{zoneStats.rawItems}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600"><Settings size={20}/></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Stock Value</p>
                            <p className="text-xl font-black text-slate-800">฿{(zoneStats.rawValue/1000).toFixed(1)}k</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Zone Selector */}
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit self-start">
                <button onClick={() => setActiveZone('Raw Material')} className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all flex items-center gap-2 ${activeZone === 'Raw Material' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Box size={16}/> {t('wms.zoneRaw')}
                </button>
                <button onClick={() => setActiveZone('Finished Goods')} className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all flex items-center gap-2 ${activeZone === 'Finished Goods' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Package size={16}/> {t('wms.zoneFinished')}
                </button>
                <button onClick={() => setActiveZone('Quarantine')} className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all flex items-center gap-2 ${activeZone === 'Quarantine' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Shield size={16}/> {t('wms.zoneQuarantine')}
                </button>
            </div>

            {/* Warehouse Visual Grid */}
            <div className={`flex-1 bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col relative transition-colors ${isDesignMode ? 'border-amber-300 ring-4 ring-amber-50' : 'border-slate-200'}`}>
                {/* Visual Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                     <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                         <Map className="text-slate-400" size={20}/> Zone Layout: {activeZone}
                     </h3>
                     {isDesignMode && (
                         <button onClick={handleAddLocation} className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-lg flex items-center gap-2 hover:bg-amber-600 transition-all">
                             <Plus size={14}/> Add New Rack
                         </button>
                     )}
                </div>
                
                <div className="flex-1 p-8 overflow-y-auto bg-slate-50/30 custom-scrollbar relative">
                    {/* Entrance Simulation */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-200 px-6 py-1 rounded-b-xl text-[10px] font-black uppercase text-slate-500 tracking-[4px] shadow-inner border border-slate-300 z-0">Main Entrance / Loading Dock</div>

                    {locationsInZone.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                            <Factory size={64} className="mb-4 opacity-20"/>
                            <p className="font-bold">No locations defined for this zone.</p>
                            {isDesignMode && <p className="text-xs mt-2 text-amber-500">Click "Add New Rack" to start designing.</p>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-8">
                            {locationsInZone.map(loc => {
                                const usage = getUsagePercentage(loc);
                                const usageColor = usage > 90 ? 'bg-red-500' : usage > 50 ? 'bg-amber-500' : 'bg-green-500';
                                const items = getItemsInLocation(loc.id);
                                const hasQuarantine = items.some(i => i.isoStatus === 'Quarantine');
                                
                                // ABC Analysis Simulation (Visual Hint)
                                const isHighPriority = loc.priority === 'High';

                                return (
                                    <button 
                                        key={loc.id}
                                        onClick={() => {
                                            if (isDesignMode) setEditLocationForm(loc);
                                            else setSelectedLocation(loc);
                                        }}
                                        className={`relative bg-white border rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all group text-left flex flex-col justify-between min-h-[140px]
                                            ${isDesignMode ? 'border-dashed border-slate-400 hover:border-amber-500 cursor-pointer' : 'border-slate-200 hover:border-primary-400 hover:-translate-y-1'}
                                            ${isHighPriority && !isDesignMode ? 'ring-2 ring-blue-100' : ''}
                                        `}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-black text-slate-800 text-xl">{loc.name}</span>
                                                {isDesignMode ? (
                                                    <Settings size={14} className="text-slate-300 group-hover:text-amber-500"/>
                                                ) : (
                                                    hasQuarantine && <AlertTriangle size={16} className="text-amber-500 animate-pulse"/>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium mb-4 line-clamp-2 min-h-[2.5em]">
                                                {loc.description || (isHighPriority ? "Prime Location (High Usage)" : "Standard Storage")}
                                            </div>
                                            {/* Category Tags */}
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {loc.tags?.map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] rounded font-bold uppercase">{tag}</span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                <span>{items.length} Items</span>
                                                <span>{usage.toFixed(0)}% Full</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${usageColor}`} style={{width: `${usage}%`}}></div>
                                            </div>
                                        </div>
                                        
                                        {/* ABC Priority Indicator */}
                                        {isHighPriority && (
                                            <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-md border border-white">
                                                FAST MOVING
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Design Mode Modal (Edit Rack) */}
            {editLocationForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-50">
                            <h3 className="font-black text-amber-900 text-lg">Edit Rack Configuration</h3>
                            <button onClick={() => setEditLocationForm(null)} className="p-2 text-amber-300 hover:text-amber-700 hover:bg-amber-100 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Rack Name / Code</label>
                                <input type="text" value={editLocationForm.name} onChange={e => setEditLocationForm({...editLocationForm, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Description / Allowed Category</label>
                                <input type="text" value={editLocationForm.description} onChange={e => setEditLocationForm({...editLocationForm, description: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Plastic Pellets Only" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Capacity (Max)</label>
                                    <input type="number" value={editLocationForm.capacity} onChange={e => setEditLocationForm({...editLocationForm, capacity: parseInt(e.target.value)})} className="w-full border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Access Priority</label>
                                    <select value={editLocationForm.priority || 'Medium'} onChange={e => setEditLocationForm({...editLocationForm, priority: e.target.value as any})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-bold">
                                        <option value="High">High (Fast Moving)</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low (Slow Moving)</option>
                                    </select>
                                </div>
                            </div>
                            {/* Tags Input (Simplified) */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tags (Comma Separated)</label>
                                <input 
                                    type="text" 
                                    value={editLocationForm.tags?.join(', ')} 
                                    onChange={e => setEditLocationForm({...editLocationForm, tags: e.target.value.split(',').map(s => s.trim()).filter(s => s)})} 
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                                    placeholder="Plastic, Box, Big"
                                />
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-4">
                            {editLocationForm.id && (
                                <button onClick={() => handleDeleteLocation(editLocationForm.id!)} className="text-red-500 font-bold text-xs flex items-center gap-1 hover:underline">
                                    <Trash2 size={14}/> Delete Rack
                                </button>
                            )}
                            <button onClick={handleSaveLocation} className="bg-amber-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:bg-amber-600 transition-all flex items-center gap-2 ml-auto">
                                <Save size={16}/> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Mode Modal (Move Item & Detail) */}
            {selectedLocation && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[80vh] animate-in zoom-in duration-200">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">{selectedLocation.name}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedLocation.zone} • {selectedLocation.type} • {selectedLocation.priority} Priority</p>
                            </div>
                            <button onClick={() => setSelectedLocation(null)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"><X size={24}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                            {moveItem ? (
                                <div className="space-y-6">
                                     <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-center gap-4">
                                        <ArrowRightLeft className="text-blue-500" size={32}/>
                                        <div>
                                            <h4 className="font-black text-blue-800 text-lg">Moving Item</h4>
                                            <p className="text-sm text-blue-600">Select a new location for <span className="font-bold">{moveItem.item.name}</span></p>
                                        </div>
                                        <button onClick={() => setMoveItem(null)} className="ml-auto px-4 py-2 bg-white text-blue-600 rounded-lg font-bold text-xs shadow-sm">Cancel Move</button>
                                     </div>

                                     <h4 className="font-black text-slate-700 mt-4">Available Locations</h4>
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                         {warehouse_locations.filter(l => l.id !== selectedLocation.id).map(loc => (
                                             <button 
                                                key={loc.id} 
                                                onClick={() => handleMoveItem(loc.id)}
                                                className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-primary-500 transition-all text-left"
                                             >
                                                 <div className="font-black text-slate-700">{loc.name}</div>
                                                 <div className="text-xs text-slate-400">{loc.zone}</div>
                                             </button>
                                         ))}
                                     </div>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-slate-400 font-black text-[10px] uppercase tracking-[2px] border-b border-slate-100">
                                        <tr>
                                            <th className="pb-4 px-4">Lot No.</th>
                                            <th className="pb-4 px-4">Item Name</th>
                                            <th className="pb-4 px-4 text-center">Status (ISO)</th>
                                            <th className="pb-4 px-4 text-right">Qty</th>
                                            <th className="pb-4 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {getItemsInLocation(selectedLocation.id).map((item, idx) => (
                                            <tr key={`${item.id}-${idx}`} className="group hover:bg-slate-50">
                                                <td className="py-4 px-4 font-mono font-bold text-slate-500">{item.lotNumber || '-'}</td>
                                                <td className="py-4 px-4 font-bold text-slate-800">{item.name}</td>
                                                <td className="py-4 px-4 text-center">
                                                    <div className="relative group/status inline-block">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black border uppercase cursor-pointer ${getISOStatusColor(item.isoStatus)}`}>
                                                            {item.isoStatus || 'Unknown'}
                                                        </span>
                                                        <div className="hidden group-hover/status:block absolute left-1/2 -translate-x-1/2 mt-1 w-32 bg-white border border-slate-200 shadow-xl rounded-xl z-10 py-1 overflow-hidden">
                                                            {['Released', 'Quarantine', 'Hold', 'Rejected'].map(s => (
                                                                <button 
                                                                    key={s}
                                                                    onClick={() => handleUpdateStatus(item, s as ISOStatus, item.type as any)}
                                                                    className="block w-full text-left px-3 py-2 text-[10px] font-bold uppercase hover:bg-slate-50 text-slate-600"
                                                                >
                                                                    {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-right font-mono text-slate-600">{item.quantity.toLocaleString()} {item.unit}</td>
                                                <td className="py-4 px-4 text-right">
                                                    <button 
                                                        onClick={() => setMoveItem({ item, sourceArray: item.type as any })}
                                                        className="text-primary-600 font-bold text-xs hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-all"
                                                    >
                                                        {t('wms.relocate')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {getItemsInLocation(selectedLocation.id).length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                                                    Empty Rack
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarehouseMap;
