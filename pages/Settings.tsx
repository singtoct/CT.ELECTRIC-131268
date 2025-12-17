import React, { useState, useEffect, useRef } from 'react';
import { useFactoryActions, useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { Save, Plus, Trash2, Upload, Download, Loader2, Check } from 'lucide-react';
import { FactoryData, FactorySettings, CostItem } from '../types';

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

    // Initialize with safe defaults to prevent null pointers
    const defaultSettings: FactorySettings = {
        name: 'CT Electric',
        companyInfo: { name: '', address: '', taxId: '', phone: '', email: '', logoUrl: '' },
        productionConfig: { shifts: [], lowStockThreshold: 0, vatRate: 7, regrindPercentage: 0, workingHoursPerDay: 8 },
        qcRejectReasons: [],
        machineStatuses: [],
        productionSteps: [],
        departments: [],
        overheadCosts: [],
        machineDepreciation: []
    };

    const [settings, setSettings] = useState<FactorySettings>(defaultSettings);
    const [msg, setMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleSave = async () => {
        try {
            await updateData({ ...allData, factory_settings: settings });
            setMsg(t('set.saveSuccess'));
            setTimeout(() => setMsg(null), 3000);
        } catch (e) {
            console.error(e);
        }
    };

    // Generic Update Handlers
    const updateCompany = (field: keyof typeof settings.companyInfo, value: string) => {
        setSettings(prev => ({ ...prev, companyInfo: { ...prev.companyInfo, [field]: value } }));
    };

    const updateProdConfig = (field: keyof typeof settings.productionConfig, value: any) => {
        setSettings(prev => ({ ...prev, productionConfig: { ...prev.productionConfig, [field]: value } }));
    };

    // JSON Export/Import
    const handleExport = () => {
        const dataStr = JSON.stringify(allData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factory_data_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
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
            } catch (err) { alert("Invalid JSON"); }
        };
        reader.readAsText(file);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header with Save Button */}
            <div className="flex items-center justify-between sticky top-0 z-20 bg-slate-50/95 backdrop-blur py-4 border-b border-slate-200">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{t('set.title')}</h2>
                    <p className="text-slate-500 hidden sm:block">{t('set.saveAll')}</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isActionLoading}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-all disabled:opacity-50"
                >
                    {isActionLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    {t('set.saveAll')}
                </button>
            </div>

            {msg && (
                <div className="fixed top-20 right-8 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 z-50">
                    <Check size={20} /> {msg}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- Left Column --- */}
                <div className="space-y-8">
                    
                    {/* 1. Company Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                         <h3 className="font-bold text-slate-800 mb-4">{t('set.companyProfile')}</h3>
                         <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('set.companyName')}</label>
                                <input 
                                    type="text" 
                                    value={settings.companyInfo.name} 
                                    onChange={(e) => updateCompany('name', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('set.companyAddress')}</label>
                                <textarea 
                                    value={settings.companyInfo.address} 
                                    onChange={(e) => updateCompany('address', e.target.value)}
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none bg-white text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('set.taxId')}</label>
                                <input 
                                    type="text" 
                                    value={settings.companyInfo.taxId} 
                                    onChange={(e) => updateCompany('taxId', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                                />
                            </div>
                            <div className="flex items-center gap-4 border-t border-slate-100 pt-4 mt-2">
                                <div className="h-16 w-16 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden">
                                    {settings.companyInfo.logoUrl ? <img src={settings.companyInfo.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-xs text-slate-400">Logo</span>}
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('set.logoUrl')}</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={settings.companyInfo.logoUrl} 
                                            onChange={(e) => updateCompany('logoUrl', e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                                        />
                                        <button className="text-xs border border-slate-300 rounded px-2 hover:bg-slate-50">{t('set.changeLogo')}</button>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>

                    {/* 2. Overhead Costs */}
                    <CostListEditor 
                        title={t('set.overhead')} 
                        subtext="ค่าใช้จ่ายที่ไม่ใช่ค่าวัตถุดิบและค่าแรงโดยตรง"
                        items={settings.overheadCosts} 
                        onUpdate={(items) => setSettings(prev => ({...prev, overheadCosts: items}))}
                        t={t}
                    />

                    {/* 3. Machine Depreciation */}
                    <CostListEditor 
                        title={t('set.depreciation')} 
                        subtext="ค่าเสื่อมราคาของเครื่องจักรทั้งหมด (เฉลี่ยรายชั่วโมง)"
                        items={settings.machineDepreciation} 
                        onUpdate={(items) => setSettings(prev => ({...prev, machineDepreciation: items}))}
                        t={t}
                    />

                    {/* 4. General Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                         <h3 className="font-bold text-slate-800 mb-4">{t('set.general')}</h3>
                         <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('set.regrind')}</label>
                                <input 
                                    type="number" 
                                    value={settings.productionConfig.regrindPercentage}
                                    onChange={(e) => updateProdConfig('regrindPercentage', parseFloat(e.target.value))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('set.oeeHours')}</label>
                                <input 
                                    type="number" 
                                    value={settings.productionConfig.workingHoursPerDay}
                                    onChange={(e) => updateProdConfig('workingHoursPerDay', parseFloat(e.target.value))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Right Column --- */}
                <div className="space-y-8">
                    
                    {/* 1. QC Reasons */}
                    <StringListEditor 
                        title={t('set.qcReasons')} 
                        items={settings.qcRejectReasons} 
                        onUpdate={(items) => setSettings(prev => ({...prev, qcRejectReasons: items}))}
                        placeholder={t('set.newItemPlaceholder')}
                    />

                    {/* 2. Production Steps */}
                    <StringListEditor 
                        title={t('set.prodSteps')} 
                        items={settings.productionSteps} 
                        onUpdate={(items) => setSettings(prev => ({...prev, productionSteps: items}))}
                        placeholder={t('set.newItemPlaceholder')}
                    />

                    {/* 3. Machine Status */}
                    <StringListEditor 
                        title={t('set.machineStatus')} 
                        items={settings.machineStatuses} 
                        onUpdate={(items) => setSettings(prev => ({...prev, machineStatuses: items}))}
                        placeholder={t('set.newItemPlaceholder')}
                    />

                    {/* 4. Roles/Departments */}
                    <StringListEditor 
                        title={t('set.roles')} 
                        items={settings.departments} 
                        onUpdate={(items) => setSettings(prev => ({...prev, departments: items}))}
                        placeholder={t('set.newItemPlaceholder')}
                    />

                    {/* Data Management Section */}
                    <div className="bg-slate-100 rounded-xl border border-slate-200 p-6 mt-8">
                        <h3 className="font-bold text-slate-800 mb-4">{t('set.dataManagement')}</h3>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-all flex items-center justify-center gap-2"
                            >
                                <Upload size={18} /> {t('set.import')}
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                            
                            <button 
                                onClick={handleExport}
                                className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all flex items-center justify-center gap-2"
                            >
                                <Download size={18} /> {t('set.export')}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-3 text-center">
                            Use Import/Export for manual backup or transferring data between devices.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Settings;