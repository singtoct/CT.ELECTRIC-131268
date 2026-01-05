
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Map, Box, Shield, AlertTriangle, ChevronRight, X, 
    ArrowRightLeft, CheckCircle2, Factory, Search,
    Package, Edit, Plus, Trash2, Settings, Zap, Layers,
    LayoutGrid, Save, Printer, QrCode, Grid, Move, RotateCw, Grip,
    MousePointer2, Maximize
} from 'lucide-react';
import { WarehouseLocation, InventoryItem, ISOStatus } from '../types';

// --- Stock Card Component (Print Only) ---
const StockCardPrint = ({ location, items }: { location: WarehouseLocation, items: InventoryItem[] }) => (
    <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8">
        <div className="grid grid-cols-2 gap-8">
            <div className="border-4 border-slate-800 p-6 rounded-3xl break-inside-avoid">
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Stock Card</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-[4px] mt-1">CT Electric Factory</p>
                    </div>
                    <div className="text-right">
                        <span className="block text-xs font-bold text-slate-400 uppercase">Location ID</span>
                        <span className="text-5xl font-black text-slate-900">{location.name}</span>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex gap-4 items-center bg-slate-100 p-4 rounded-xl border border-slate-200">
                        <div className="bg-white p-2 rounded-lg">
                            <QrCode size={64} className="text-slate-800"/>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Zone / Category</p>
                            <p className="text-xl font-black text-slate-800">{location.zone}</p>
                            <p className="text-sm font-bold text-slate-600">{location.description || 'Standard Storage'}</p>
                        </div>
                    </div>

                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-slate-200">
                                <th className="border border-slate-800 p-2 text-left">Item Name</th>
                                <th className="border border-slate-800 p-2 text-center w-20">Lot</th>
                                <th className="border border-slate-800 p-2 text-right w-24">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.slice(0, 5).map((item, idx) => (
                                <tr key={idx}>
                                    <td className="border border-slate-800 p-3 font-bold">{item.name}</td>
                                    <td className="border border-slate-800 p-3 text-center">{item.lotNumber}</td>
                                    <td className="border border-slate-800 p-3 text-right font-black">{item.quantity}</td>
                                </tr>
                            ))}
                            {[...Array(Math.max(0, 5 - items.length))].map((_, i) => (
                                <tr key={`empty-${i}`} className="h-12">
                                    <td className="border border-slate-800 p-2"></td>
                                    <td className="border border-slate-800 p-2"></td>
                                    <td className="border border-slate-800 p-2"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
);

const WarehouseMap: React.FC = () => {
    const data = useFactoryData();
    const { 
        warehouse_locations = [], 
        packing_inventory = [], 
        packing_raw_materials = [] 
    } = data;
    const { updateData } = useFactoryActions();
    const { t } = useTranslation();

    const [viewMode, setViewMode] = useState<'blueprint' | 'grid'>('blueprint');
    const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(null);
    const [isDesignMode, setIsDesignMode] = useState(false);
    const [moveItem, setMoveItem] = useState<{ item: InventoryItem, sourceArray: 'inventory' | 'material' } | null>(null);
    const [editLocationForm, setEditLocationForm] = useState<Partial<WarehouseLocation> | null>(null);

    // --- Drag & Drop Logic & Local State ---
    // We use a local state for smooth dragging, syncing with DB only on mouse up.
    const [localLocations, setLocalLocations] = useState<WarehouseLocation[]>(warehouse_locations);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const isDraggingRef = useRef(false); // To distinguish click vs drag
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Sync local state when DB changes (unless we are currently dragging)
    useEffect(() => {
        if (!draggingId) {
            setLocalLocations(warehouse_locations);
        }
    }, [warehouse_locations, draggingId]);

    // --- Statistics & Aggregation ---
    const allInventory = useMemo(() => {
        return [
            ...packing_inventory.map(i => ({ ...i, type: 'inventory' as const })), 
            ...packing_raw_materials.map(i => ({ ...i, type: 'material' as const }))
        ];
    }, [packing_inventory, packing_raw_materials]);

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
    const handleAddObject = async (type: 'Rack' | 'Floor' | 'Wall' | 'Door') => {
        // Place new object in center of current scroll view roughly, or fixed 100,100
        const scrollX = mapContainerRef.current?.scrollLeft || 0;
        const scrollY = mapContainerRef.current?.scrollTop || 0;

        const newLoc: WarehouseLocation = {
            id: `obj-${Date.now()}`,
            name: type === 'Wall' ? 'Wall' : `NEW-${warehouse_locations.length + 1}`,
            zone: type === 'Wall' || type === 'Door' ? 'Structure' : 'Raw Material',
            type: type,
            capacity: type === 'Rack' ? 2000 : 0,
            x: scrollX + 100,
            y: scrollY + 100,
            w: type === 'Rack' ? 60 : type === 'Floor' ? 120 : type === 'Wall' ? 20 : 80,
            h: type === 'Rack' ? 100 : type === 'Floor' ? 80 : type === 'Wall' ? 200 : 20,
            rotation: 0
        };
        const updatedList = [...warehouse_locations, newLoc];
        setLocalLocations(updatedList); // Immediate UI update
        await updateData({ ...data, warehouse_locations: updatedList });
    };

    const handleDeleteLocation = async (id: string) => {
        if (!confirm("Confirm Delete? (ยืนยันการลบ?)")) return;
        
        // Immediate UI Update
        const newLocs = localLocations.filter(l => l.id !== id);
        setLocalLocations(newLocs);
        setSelectedLocation(null);
        setEditLocationForm(null);

        // Background Sync
        await updateData({ ...data, warehouse_locations: newLocs });
    };

    const handleSaveLocation = async () => {
        if (!editLocationForm || !editLocationForm.id) return;
        const updatedLocs = warehouse_locations.map(l => l.id === editLocationForm.id ? { ...l, ...editLocationForm } as WarehouseLocation : l);
        setLocalLocations(updatedLocs); // Immediate
        await updateData({ ...data, warehouse_locations: updatedLocs });
        setEditLocationForm(null);
        setSelectedLocation(null);
    };

    // --- Drag Handlers ---

    const handleMouseDown = (e: React.MouseEvent, id: string, initialX: number = 0, initialY: number = 0) => {
        if (!isDesignMode) return;
        e.preventDefault(); // Prevent text selection
        e.stopPropagation();
        
        isDraggingRef.current = false; // Reset drag flag
        setDraggingId(id);
        setDragOffset({ x: e.clientX - initialX, y: e.clientY - initialY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDesignMode || !draggingId) return;
        
        isDraggingRef.current = true; // Mark as dragging
        
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Update LOCAL state for speed
        setLocalLocations(prev => prev.map(l => l.id === draggingId ? { ...l, x: newX, y: newY } : l));
    };

    const handleMouseUp = async () => {
        if (draggingId && isDraggingRef.current) {
            // Drag finished, sync to DB
            await updateData({ ...data, warehouse_locations: localLocations });
        }
        setDraggingId(null);
    };

    const handleObjectClick = (e: React.MouseEvent, loc: WarehouseLocation) => {
        e.stopPropagation();
        // Only open edit modal if it was a CLICK, not a drag release
        if (!isDraggingRef.current) {
            if (isDesignMode) {
                setEditLocationForm(loc);
            } else {
                setSelectedLocation(loc);
            }
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

    const handleUpdateStatus = async (item: InventoryItem, status: ISOStatus, type: 'inventory' | 'material') => {
        if (type === 'inventory') {
            const updatedInv = packing_inventory.map(i => i.id === item.id ? { ...i, isoStatus: status } : i);
            await updateData({ ...data, packing_inventory: updatedInv });
        } else {
            const updatedMat = packing_raw_materials.map(i => i.id === item.id ? { ...i, isoStatus: status } : i);
            await updateData({ ...data, packing_raw_materials: updatedMat });
        }
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

    // Shared input styles - ensuring text visibility and background color
    const inputStyle = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 font-bold focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm";

    return (
        <div className="space-y-6 pb-10 h-full flex flex-col" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('wms.title')}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] font-bold uppercase tracking-[2px] text-slate-500">Interactive Blueprint</p>
                        {isDesignMode && <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 animate-pulse">DESIGN MODE ACTIVE</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {isDesignMode && (
                        <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm mr-2">
                            <button onClick={() => handleAddObject('Rack')} className="px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-bold flex flex-col items-center gap-1 text-slate-600">
                                <Box size={14} className="text-blue-600"/> +Rack
                            </button>
                            <button onClick={() => handleAddObject('Floor')} className="px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-bold flex flex-col items-center gap-1 text-slate-600">
                                <Layers size={14} className="text-amber-600"/> +Area
                            </button>
                            <button onClick={() => handleAddObject('Wall')} className="px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-bold flex flex-col items-center gap-1 text-slate-600">
                                <Box size={14} className="text-slate-800"/> +Wall
                            </button>
                            <button onClick={() => handleAddObject('Door')} className="px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-bold flex flex-col items-center gap-1 text-slate-600">
                                <ArrowRightLeft size={14} className="text-slate-400"/> +Door
                            </button>
                        </div>
                    )}
                    <button 
                        onClick={() => setIsDesignMode(!isDesignMode)} 
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase flex items-center gap-2 transition-all shadow-sm ${isDesignMode ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        {isDesignMode ? <CheckCircle2 size={16}/> : <Edit size={16}/>}
                        {isDesignMode ? "Finish Editing" : "Edit Layout"}
                    </button>
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setViewMode('blueprint')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all ${viewMode === 'blueprint' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Map size={16}/> Map
                        </button>
                        <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Grid size={16}/> List
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col relative h-[600px] md:h-auto">
                
                {viewMode === 'blueprint' ? (
                    <div 
                        ref={mapContainerRef}
                        className={`flex-1 relative overflow-auto bg-slate-50 select-none custom-scrollbar`}
                        onMouseMove={handleMouseMove}
                    >
                        {/* Large Canvas Container */}
                        <div 
                            style={{ width: '2000px', height: '2000px', position: 'relative' }}
                            className={`${isDesignMode ? 'cursor-crosshair' : 'cursor-default'}`}
                        >
                            {/* Grid Background */}
                            <div 
                                className="absolute inset-0 pointer-events-none opacity-20" 
                                style={{
                                    backgroundImage: `linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)`,
                                    backgroundSize: '40px 40px'
                                }}
                            ></div>

                            {/* Interactive Elements (Using Local Locations State) */}
                            {localLocations.map((loc) => {
                                const usage = getUsagePercentage(loc);
                                const isSelected = selectedLocation?.id === loc.id;
                                const isWall = loc.type === 'Wall' || loc.type === 'Door' || loc.type === 'Obstacle';
                                
                                // Defaults if no layout data
                                const x = loc.x || 100;
                                const y = loc.y || 100;
                                const w = loc.w || (isWall ? 20 : 60);
                                const h = loc.h || (isWall ? 100 : 80);
                                const rot = loc.rotation || 0;

                                return (
                                    <div
                                        key={loc.id}
                                        onMouseDown={(e) => handleMouseDown(e, loc.id, x, y)}
                                        onClick={(e) => handleObjectClick(e, loc)}
                                        className={`absolute transition-shadow group flex items-center justify-center
                                            ${isDesignMode ? 'cursor-move hover:ring-2 ring-amber-400' : 'cursor-pointer hover:scale-[1.02]'}
                                            ${isSelected ? 'ring-4 ring-primary-400 z-10' : ''}
                                            ${loc.type === 'Rack' ? 'bg-blue-600 rounded-sm shadow-md' : ''}
                                            ${loc.type === 'Floor' ? 'bg-amber-100 border-2 border-dashed border-amber-300 rounded-lg text-amber-700' : ''}
                                            ${loc.type === 'Wall' ? 'bg-slate-800' : ''}
                                            ${loc.type === 'Door' ? 'bg-white border-2 border-slate-300' : ''}
                                            ${loc.type === 'Obstacle' ? 'bg-slate-200 border border-slate-300' : ''}
                                        `}
                                        style={{
                                            left: x,
                                            top: y,
                                            width: w,
                                            height: h,
                                            transform: `rotate(${rot}deg)`,
                                            zIndex: isWall ? 0 : 5
                                        }}
                                    >
                                        {/* Content based on Type */}
                                        {loc.type === 'Rack' && (
                                            <div className="flex flex-col items-center justify-center w-full h-full pointer-events-none">
                                                <span className="text-[10px] font-black text-white bg-blue-800/80 px-1 rounded truncate max-w-full overflow-hidden">{loc.name}</span>
                                                {h > 40 && (
                                                    <div className="w-[80%] h-1.5 bg-blue-900/50 rounded-full overflow-hidden mt-1">
                                                        <div className="h-full bg-green-400" style={{width: `${usage}%`}}></div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {loc.type === 'Floor' && (
                                            <div className="flex flex-col items-center text-center pointer-events-none p-1">
                                                <span className="text-xs font-black uppercase truncate w-full">{loc.name}</span>
                                                <span className="text-[8px] opacity-70 truncate w-full">{loc.zone}</span>
                                            </div>
                                        )}
                                        {loc.type === 'Door' && <span className="text-[8px] text-slate-400 font-bold uppercase -rotate-90">Entrance</span>}
                                        {loc.type === 'Obstacle' && <span className="text-xs font-bold text-slate-500 p-1 text-center">{loc.name}</span>}

                                        {/* Tooltip on Hover (View Mode) */}
                                        {!isDesignMode && !isWall && (
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-slate-800 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 shadow-xl transition-opacity">
                                                <p className="font-bold">{loc.name}</p>
                                                <p className="text-[10px]">{getItemsInLocation(loc.id).length} Items</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* Grid View */
                    <div className="p-8 overflow-y-auto">
                        <div className="flex justify-end mb-4">
                             <button onClick={() => handleAddObject('Rack')} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-900 transition-all">
                                 <Plus size={16}/> Add Location
                             </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {warehouse_locations.map(loc => (
                                <div key={loc.id} onClick={() => setSelectedLocation(loc)} className="border p-4 rounded-xl hover:shadow-md cursor-pointer bg-white">
                                    <h4 className="font-bold text-slate-800">{loc.name}</h4>
                                    <p className="text-xs text-slate-500">{loc.type} • {loc.zone}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Design Mode Modal (Edit Rack) */}
            {editLocationForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-50">
                            <h3 className="font-black text-amber-900 text-lg">Edit Properties</h3>
                            <button onClick={() => setEditLocationForm(null)} className="p-2 text-amber-300 hover:text-amber-700 hover:bg-amber-100 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Name</label>
                                    <input type="text" value={editLocationForm.name} onChange={e => setEditLocationForm({...editLocationForm, name: e.target.value})} className={inputStyle} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Zone</label>
                                    <select value={editLocationForm.zone} onChange={e => setEditLocationForm({...editLocationForm, zone: e.target.value})} className={inputStyle}>
                                        <option value="Raw Material">Raw Material</option>
                                        <option value="Finished Goods">Finished Goods</option>
                                        <option value="Quarantine">Quarantine</option>
                                        <option value="Structure">Structure</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Maximize size={10}/> Layout Dimensions</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 mb-1">Width (px)</label>
                                        <input type="number" value={editLocationForm.w} onChange={e => setEditLocationForm({...editLocationForm, w: parseInt(e.target.value) || 0})} className={inputStyle + " text-center"} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 mb-1">Height (px)</label>
                                        <input type="number" value={editLocationForm.h} onChange={e => setEditLocationForm({...editLocationForm, h: parseInt(e.target.value) || 0})} className={inputStyle + " text-center"} />
                                    </div>
                                </div>
                                
                                {/* Slanted / Rotation Control */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-[9px] font-bold text-slate-400">Rotate (Slanted Area)</label>
                                        <span className="text-[10px] font-black text-amber-600">{editLocationForm.rotation || 0}°</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RotateCw size={14} className="text-slate-400"/>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="360" 
                                            value={editLocationForm.rotation || 0} 
                                            onChange={e => setEditLocationForm({...editLocationForm, rotation: parseInt(e.target.value)})}
                                            className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <input 
                                            type="number" 
                                            value={editLocationForm.rotation || 0} 
                                            onChange={e => setEditLocationForm({...editLocationForm, rotation: parseInt(e.target.value)})}
                                            className="w-16 border border-slate-300 rounded-lg px-1 py-1 text-center text-xs font-bold text-slate-900 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Capacity</label>
                                    <input type="number" value={editLocationForm.capacity} onChange={e => setEditLocationForm({...editLocationForm, capacity: parseInt(e.target.value)})} className={inputStyle} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Priority</label>
                                    <select value={editLocationForm.priority || 'Medium'} onChange={e => setEditLocationForm({...editLocationForm, priority: e.target.value as any})} className={inputStyle}>
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-4">
                            {editLocationForm.id && (
                                <button onClick={() => handleDeleteLocation(editLocationForm.id!)} className="text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1 transition-all">
                                    <Trash2 size={16}/> Delete Object
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
                <>
                    {/* Stock Card Print Component (Hidden unless printing) */}
                    <StockCardPrint location={selectedLocation} items={getItemsInLocation(selectedLocation.id)} />

                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200 print-hidden">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[80vh] animate-in zoom-in duration-200">
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-2xl font-black text-slate-800">{selectedLocation.name}</h3>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 uppercase tracking-widest">{selectedLocation.zone}</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 mt-1">{selectedLocation.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => window.print()} className="p-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl transition-all shadow-lg flex items-center gap-2">
                                        <Printer size={18}/> <span className="text-xs font-bold uppercase hidden sm:inline">Print Stock Card</span>
                                    </button>
                                    <button onClick={() => { setEditLocationForm(selectedLocation); setSelectedLocation(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                                        <Edit size={20}/>
                                    </button>
                                    <button onClick={() => setSelectedLocation(null)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"><X size={24}/></button>
                                </div>
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
                                             {warehouse_locations.filter(l => l.id !== selectedLocation.id && l.type === 'Rack').map(loc => (
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
                </>
            )}
        </div>
    );
};

export default WarehouseMap;
