
import React, { useState, useEffect, useRef } from 'react';
import { useFactoryActions, useFactoryData, useApiKey } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Save, Plus, Trash2, Upload, Download, Loader2, Check, 
    AlertTriangle, RefreshCcw, Database, Settings as SettingsIcon,
    FileText, Box, Activity, AlertOctagon, CheckSquare, Square,
    Truck, ClipboardCheck, Cpu, Layers, Key, Sparkles, X
} from 'lucide-react';
import { FactoryData, FactorySettings, CostItem } from '../types';
import { sanitizeData } from '../services/firebase';

// Helper Component for Simple Lists (Strings)
const StringListEditor = ({ 
    title, 
    items = [], 
    onUpdate, 
    placeholder,
    addItemLabel
}: { 
    title: string; 
    items: string[]; 
    onUpdate: (items: string[]) => void; 
    placeholder: string;
    addItemLabel?: string;
}) => {
    const [newItem, setNewItem] = useState('');

    const handleAdd = () => {
        if (newItem.trim()) {
            onUpdate([...items, newItem.trim()]);
            setNewItem('');
        }
    };

    const handleDelete = (index: number) => {
        const updated = items.filter((_, i) => i !== index);
        onUpdate(updated);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-slate-100 bg-white">
                <h3 className="font-bold text-slate-800">{title}</h3>
            </div>
            <div className="p-4 flex-1 space-y-2 overflow-y-auto max-h-60 custom-scrollbar">
                {items.length === 0 && <p className="text-sm text-slate-400 italic p-2 text-center">No items added.</p>}
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors">
                        <span className="text-sm text-slate-700">{item}</span>
                        <button onClick={() => handleDelete(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button 
                        onClick={handleAdd}
                        className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full transition-colors flex-shrink-0"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper Component for Cost Items (Name & Value)
const CostListEditor = ({ 
    title, 
    subtext,
    items = [], 
    onUpdate, 
    t 
}: { 
    title: string; 
    subtext?: string;
    items: CostItem[]; 
    onUpdate: (items: CostItem[]) => void; 
    t: any;
}) => {
    const total = items.reduce((sum, item) => sum + (item.value || 0), 0);

    const handleDelete = (id: string) => {
        onUpdate(items.filter(i => i.id !== id));
    };

    const handleAdd = () => {
        const newItem: CostItem = { id: Math.random().toString(36).substr(2, 9), name: '', value: 0, unit: 'hr' };
        onUpdate([...items, newItem]);
    };

    const handleChange = (id: string, field: keyof CostItem, val: any) => {
        onUpdate(items.map(item => item.id === id ? { ...item, [field]: val } : item));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
             <div className="px-6 py-4 border-b border-slate-100 bg-white">
                <h3 className="font-bold text-slate-800">{title}</h3>
                {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
            </div>
            <div className="p-4 space-y-3">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                         <input 
                            type="text" 
                            value={item.name}
                            onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                            placeholder={t('set.costName')}
                            className="flex-[2] text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900"
                        />
                        <div className="flex-1 relative">
                            <input 
                                type="number" 
                                value={item.value}
                                onChange={(e) => handleChange(item.id, 'value', parseFloat(e.target.value) || 0)}
                                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right pr-2 bg-white text-slate-900"
                            />
                        </div>
                        <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 px-1">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                <button 
                    onClick={handleAdd}
                    className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 text-sm hover:bg-slate-50 hover:border-slate-400 flex items-center justify-center gap-2 transition-all"
                >
                    <Plus size={14} /> {t('set.addOverhead')}
                </button>
            </div>
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
                 <span className="text-sm font-medium text-slate-600">{t('set.totalPerHour')}</span>
                 <span className="text-lg font-bold text-slate-800">฿{total.toFixed(2)}</span>
            </div>
        </div>
    );
};

const Settings: React.FC = () => {
    const { t } = useTranslation();
    const { updateData, isLoading: isActionLoading } = useFactoryActions();
    const allData = useFactoryData();
    const { factory_settings } = allData;
    const { apiKey, setApiKey } = useApiKey();

    // Initialize with safe defaults
    const defaultSettings: FactorySettings = {
        id: 'main',
        name: 'CT Electric',
        companyInfo: { name: '', address: '', taxId: '', phone: '', email: '', logoUrl: '' },
        productionConfig: { shifts: [], lowStockThreshold: 0, vatRate: 7, regrindPercentage: 0, workingHoursPerDay: 8 },
        qcRejectReasons: [],
        machineStatuses: [],
        productionStatuses: [], 
        roles: [], 
        overheadRatePerHour: 0, 
        depreciationCostPerHour: 0, 
        productionSteps: [],
        departments: [],
        overheadCosts: [],
        machineDepreciation: []
    };

    const [settings, setSettings] = useState<FactorySettings>(defaultSettings);
    const [msg, setMsg] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'reset'>('general');
    const [tempKey, setTempKey] = useState(apiKey);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [resetOptions, setResetOptions] = useState({
        orders: false,
        logs: false,
        inventory: false,
        materials: false,
        qc: false,
        machines: false
    });

    useEffect(() => {
        if (factory_settings) {
            setSettings({
                ...defaultSettings,
                ...factory_settings,
                companyInfo: { ...defaultSettings.companyInfo, ...factory_settings.companyInfo },
                productionConfig: { ...defaultSettings.productionConfig, ...factory_settings.productionConfig }
            });
        }
    }, [factory_settings]);

    useEffect(() => {
        setTempKey(apiKey);
    }, [apiKey]);

    const handleSave = async () => {
        try {
            await updateData({ ...allData, factory_settings: settings });
            setMsg(t('set.saveSuccess'));
            setTimeout(() => setMsg(null), 3000);
        } catch (e) {
            console.error(e);
        }
    };

    const updateCompany = (field: keyof typeof settings.companyInfo, value: string) => {
        setSettings(prev => ({ ...prev, companyInfo: { ...prev.companyInfo, [field]: value } }));
    };

    const updateProdConfig = (field: keyof typeof settings.productionConfig, value: any) => {
        setSettings(prev => ({ ...prev, productionConfig: { ...prev.productionConfig, [field]: value } }));
    };

    const handleExport = () => {
        try {
            // Aggressive sanitization before stringify to prevent "circular structure" errors
            const cleanData = sanitizeData(allData);
            const dataStr = JSON.stringify(cleanData, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `factory_data_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Export failed: Data structure contains non-serializable objects. Please try refreshing and try again.");
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.packing_orders) {
                    await updateData(json);
                    setMsg("Data Imported Successfully!");
                    setTimeout(() => setMsg(null), 3000);
                }
            } catch (err) { alert("Invalid JSON file"); }
        };
        reader.readAsText(file);
    };

    const toggleOption = (key: keyof typeof resetOptions) => {
        setResetOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleAll = (forcedState?: boolean) => {
        const targetState = forcedState !== undefined 
            ? forcedState 
            : !Object.values(resetOptions).every(v => v);
            
        setResetOptions({
            orders: targetState,
            logs: targetState,
            inventory: targetState,
            materials: targetState,
            qc: targetState,
            machines: targetState
        });
    };

    const executeReset = async () => {
        const selectedCount = Object.values(resetOptions).filter(v => v).length;
        if (selectedCount === 0) {
            alert("กรุณาเลือกรายการที่ต้องการล้างข้อมูล");
            return;
        }

        if (!window.confirm(`ยืนยันการล้างข้อมูล ${selectedCount} รายการ?`)) return;

        const newData = { ...allData };

        if (resetOptions.orders) {
            newData.packing_orders = [];
            newData.production_documents = [];
        }
        if (resetOptions.logs) newData.molding_logs = [];
        if (resetOptions.inventory) newData.packing_inventory = newData.packing_inventory.map(i => ({...i, quantity: 0}));
        if (resetOptions.materials) newData.packing_raw_materials = newData.packing_raw_materials.map(i => ({...i, quantity: 0}));
        if (resetOptions.qc) newData.packing_qc_entries = [];
        if (resetOptions.machines) newData.factory_machines = newData.factory_machines.map(m => ({...m, status: 'ว่าง'}));

        await updateData(newData);
        setMsg(`ล้างข้อมูล ${selectedCount} รายการเรียบร้อยแล้ว`);
    };

    const resetItems = [
        { key: 'orders', label: 'ใบสั่งผลิตและออเดอร์ (Orders)', icon: FileText, desc: 'ลบรายการสั่งผลิตและออเดอร์ทั้งหมด' },
        { key: 'logs', label: 'บันทึกการผลิต (Production Logs)', icon: Activity, desc: 'ลบประวัติการฉีดงานรายวัน' },
        { key: 'machines', label: 'สถานะเครื่องจักร (Machine Status)', icon: Cpu, desc: 'รีเซ็ตเครื่องจักรทั้งหมดเป็น "ว่าง"' },
        { key: 'inventory', label: 'สต็อกสินค้าสำเร็จรูป', icon: Box, desc: 'ปรับยอดสินค้าสำเร็จรูปเป็น 0' },
        { key: 'materials', label: 'สต็อกวัตถุดิบ', icon: Layers, desc: 'ปรับยอดวัตถุดิบเป็น 0' },
        { key: 'qc', label: 'ประวัติ QC', icon: ClipboardCheck, desc: 'ลบรายการรอตรวจสอบและประวัติ QC' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur py-4 border-b border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{t('set.title')}</h2>
                        <p className="text-slate-500 text-sm">จัดการการตั้งค่าและข้อมูลระบบ</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-200 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('general')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'general' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <SettingsIcon size={16}/> ทั่วไป
                        </button>
                        <button 
                            onClick={() => setActiveTab('reset')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'reset' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Database size={16}/> ล้างข้อมูล / รีเซ็ต
                        </button>
                    </div>
                    {activeTab === 'general' && (
                        <button 
                            onClick={handleSave}
                            disabled={isActionLoading}
                            className="hidden md:flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-all disabled:opacity-50"
                        >
                            {isActionLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            {t('set.saveAll')}
                        </button>
                    )}
                </div>
            </div>

            {msg && (
                <div className="fixed top-24 right-8 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 z-50">
                    <Check size={20} /> {msg}
                </div>
            )}

            {activeTab === 'general' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Left Column */}
                    <div className="space-y-8">
                        {/* Company Info */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                             <h3 className="font-bold text-slate-800 mb-4">{t('set.companyProfile')}</h3>
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('set.companyName')}</label>
                                    <input type="text" value={settings.companyInfo.name} onChange={(e) => updateCompany('name', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('set.companyAddress')}</label>
                                    <textarea value={settings.companyInfo.address} onChange={(e) => updateCompany('address', e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none bg-white text-slate-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('set.taxId')}</label>
                                    <input type="text" value={settings.companyInfo.taxId} onChange={(e) => updateCompany('taxId', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900" />
                                </div>
                                <div className="flex items-center gap-4 border-t border-slate-100 pt-4 mt-2">
                                    <div className="h-16 w-16 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden">
                                        {settings.companyInfo.logoUrl ? <img src={settings.companyInfo.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-xs text-slate-400">Logo</span>}
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('set.logoUrl')}</label>
                                        <input type="text" value={settings.companyInfo.logoUrl} onChange={(e) => updateCompany('logoUrl', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900" />
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* AI Key Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <Sparkles size={100} />
                             </div>
                             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Key className="text-purple-500" size={20}/> Gemini AI Configuration
                             </h3>
                             <div className="space-y-4 relative z-10">
                                <p className="text-xs text-slate-500">
                                    ตั้งค่า Google Gemini API Key เพื่อเปิดใช้งานฟีเจอร์อัจฉริยะ (AI)
                                </p>
                                <div className="flex gap-2">
                                    <input 
                                        type="password" 
                                        value={tempKey} 
                                        onChange={(e) => setTempKey(e.target.value)} 
                                        placeholder="Enter your Gemini API Key..."
                                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50 text-slate-900" 
                                    />
                                    <button 
                                        onClick={() => { setApiKey(tempKey); setMsg("API Key Saved"); setTimeout(() => setMsg(null), 3000); }}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                                    >
                                        Save Key
                                    </button>
                                </div>
                             </div>
                        </div>

                        <CostListEditor title={t('set.overhead')} subtext="ค่าใช้จ่ายแฝง (Indirect Costs)" items={settings.overheadCosts} onUpdate={(items) => setSettings(prev => ({...prev, overheadCosts: items}))} t={t} />
                        <CostListEditor title={t('set.depreciation')} subtext="ค่าเสื่อมราคาเครื่องจักร" items={settings.machineDepreciation} onUpdate={(items) => setSettings(prev => ({...prev, machineDepreciation: items}))} t={t} />
                        
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                             <h3 className="font-bold text-slate-800 mb-4">{t('set.general')}</h3>
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('set.regrind')}</label>
                                    <input type="number" value={settings.productionConfig?.regrindPercentage} onChange={(e) => updateProdConfig('regrindPercentage', parseFloat(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('set.oeeHours')}</label>
                                    <input type="number" value={settings.productionConfig?.workingHoursPerDay} onChange={(e) => updateProdConfig('workingHoursPerDay', parseFloat(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">
                        <StringListEditor title={t('set.qcReasons')} items={settings.qcRejectReasons} onUpdate={(items) => setSettings(prev => ({...prev, qcRejectReasons: items}))} placeholder={t('set.newItemPlaceholder')} />
                        <StringListEditor title={t('set.prodSteps')} items={settings.productionSteps} onUpdate={(items) => setSettings(prev => ({...prev, productionSteps: items}))} placeholder={t('set.newItemPlaceholder')} />
                        <StringListEditor title={t('set.machineStatus')} items={settings.machineStatuses} onUpdate={(items) => setSettings(prev => ({...prev, machineStatuses: items}))} placeholder={t('set.newItemPlaceholder')} />
                        <StringListEditor title={t('set.roles')} items={settings.departments} onUpdate={(items) => setSettings(prev => ({...prev, departments: items}))} placeholder={t('set.newItemPlaceholder')} />
                        
                        <div className="md:hidden">
                            <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-xl font-bold shadow-md transition-all">
                                <Save size={20} /> {t('set.saveAll')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Backup & Restore */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                             <Database className="text-blue-500" size={20}/> สำรองและกู้คืนข้อมูล
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">ดาวน์โหลดไฟล์ JSON เก็บไว้ หรือนำเข้าไฟล์เพื่อกู้คืนข้อมูล</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={handleExport}
                                className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-6 py-4 rounded-xl font-bold hover:bg-blue-100 transition-all"
                            >
                                <Download size={20} /> {t('set.export')} (Backup)
                            </button>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-300 px-6 py-4 rounded-xl font-bold hover:bg-slate-50 transition-all"
                            >
                                <Upload size={20} /> {t('set.import')} (Restore)
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                        </div>
                    </div>

                    {/* Reset Controls */}
                    <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden relative">
                         <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                         <div className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <AlertOctagon className="text-red-500" size={20}/> Danger Zone
                                </h3>
                                <button onClick={() => toggleAll()} className="text-xs font-bold text-primary-600 hover:text-primary-800">Select All</button>
                            </div>
                            <p className="text-sm text-slate-500 mb-6">เลือกรายการที่ต้องการล้างข้อมูลเพื่อเริ่มต้นใหม่</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {resetItems.map(item => (
                                    <div 
                                        key={item.key}
                                        onClick={() => toggleOption(item.key as keyof typeof resetOptions)}
                                        className={`cursor-pointer border rounded-xl p-4 flex items-start gap-3 transition-all ${resetOptions[item.key as keyof typeof resetOptions] ? 'border-red-500 bg-red-50/50' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <div className={`mt-0.5 ${resetOptions[item.key as keyof typeof resetOptions] ? 'text-red-500' : 'text-slate-300'}`}>
                                            {resetOptions[item.key as keyof typeof resetOptions] ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-700">{item.label}</h4>
                                            <p className="text-xs text-slate-400">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <button 
                                    onClick={executeReset}
                                    className="w-full bg-red-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-3"
                                >
                                    <RefreshCcw size={24} /> ยืนยันการล้างข้อมูล
                                </button>
                            </div>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
