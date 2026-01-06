
import React, { useMemo, useState } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { AlertTriangle, CheckCircle2, ArrowRight, Save, X, Database, Zap } from 'lucide-react';
import { Product, FactoryCustomer, InventoryItem } from '../types';

interface DataIssue {
    id: string;
    type: 'Product' | 'Customer' | 'Material';
    entityId: string;
    name: string;
    issue: string;
    field: string; // The property key that needs fixing
    currentValue: any;
}

const DataHealthCheck: React.FC = () => {
    const data = useFactoryData();
    const { updateData } = useFactoryActions();
    const [isFixing, setIsFixing] = useState(false);
    const [fixValue, setFixValue] = useState<string | number>('');
    const [currentIssueIndex, setCurrentIssueIndex] = useState(0);

    // --- SCAN LOGIC ---
    const issues = useMemo(() => {
        const list: DataIssue[] = [];

        // 1. Check Products
        data.factory_products.forEach(p => {
            if (!p.salePrice || p.salePrice <= 0) {
                list.push({ id: `p-price-${p.id}`, type: 'Product', entityId: p.id, name: p.name, issue: 'ยังไม่ตั้งราคาขาย (Sale Price is 0)', field: 'salePrice', currentValue: 0 });
            }
            if (!p.cycleTimeSeconds || p.cycleTimeSeconds <= 0) {
                list.push({ id: `p-cycle-${p.id}`, type: 'Product', entityId: p.id, name: p.name, issue: 'ไม่มีข้อมูลเวลาการผลิต (Cycle Time)', field: 'cycleTimeSeconds', currentValue: 0 });
            }
            if (!p.bom || p.bom.length === 0) {
                list.push({ id: `p-bom-${p.id}`, type: 'Product', entityId: p.id, name: p.name, issue: 'ยังไม่ผูกสูตรการผลิต (Missing BOM)', field: 'bom', currentValue: [] });
            }
        });

        // 2. Check Customers
        data.factory_customers.forEach(c => {
            if (!c.phone || c.phone.trim() === '') {
                list.push({ id: `c-phone-${c.id}`, type: 'Customer', entityId: c.id, name: c.name, issue: 'ลูกค้าขาดเบอร์โทรศัพท์', field: 'phone', currentValue: '' });
            }
            if (!c.contactPerson || c.contactPerson.trim() === '') {
                list.push({ id: `c-contact-${c.id}`, type: 'Customer', entityId: c.id, name: c.name, issue: 'ไม่ระบุชื่อผู้ติดต่อ', field: 'contactPerson', currentValue: '' });
            }
        });

        // 3. Check Raw Materials
        data.packing_raw_materials.forEach(m => {
            if (!m.costPerUnit || m.costPerUnit <= 0) {
                list.push({ id: `m-cost-${m.id}`, type: 'Material', entityId: m.id, name: m.name, issue: 'วัตถุดิบไม่มีต้นทุนต่อหน่วย', field: 'costPerUnit', currentValue: 0 });
            }
        });

        return list;
    }, [data.factory_products, data.factory_customers, data.packing_raw_materials]);

    const healthScore = Math.max(0, 100 - (issues.length * 2)); // Simple scoring
    const currentIssue = issues[currentIssueIndex];

    // --- ACTIONS ---

    const handleApplyFix = async () => {
        if (!currentIssue) return;

        let newData = { ...data };
        const val = currentIssue.field === 'phone' || currentIssue.field === 'contactPerson' ? String(fixValue) : parseFloat(String(fixValue));

        if (currentIssue.type === 'Product') {
            newData.factory_products = data.factory_products.map(p => 
                p.id === currentIssue.entityId ? { ...p, [currentIssue.field]: val } : p
            );
        } else if (currentIssue.type === 'Customer') {
            newData.factory_customers = data.factory_customers.map(c => 
                c.id === currentIssue.entityId ? { ...c, [currentIssue.field]: val } : c
            );
        } else if (currentIssue.type === 'Material') {
            newData.packing_raw_materials = data.packing_raw_materials.map(m => 
                m.id === currentIssue.entityId ? { ...m, [currentIssue.field]: val } : m
            );
        }

        await updateData(newData);
        setFixValue('');
        // Stay on same index (which will be next item after re-render filters out fixed item) 
        // or loop back if index out of bounds
        if (currentIssueIndex >= issues.length - 1) setCurrentIssueIndex(0);
    };

    const skipIssue = () => {
        setCurrentIssueIndex(prev => (prev + 1) % issues.length);
        setFixValue('');
    };

    if (issues.length === 0) return null;

    if (isFixing && currentIssue) {
        // QUICK FIX MODE (OVERLAY)
        return (
            <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-xl p-6 relative overflow-hidden animate-in zoom-in duration-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-amber-600 font-black">
                        <Zap size={20}/>
                        <h3>Quick Data Fix</h3>
                    </div>
                    <button onClick={() => setIsFixing(false)} className="text-slate-300 hover:text-slate-500"><X size={20}/></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentIssue.type}</span>
                        <h4 className="text-lg font-black text-slate-800">{currentIssue.name}</h4>
                        <div className="flex items-center gap-2 mt-1 text-red-500 text-sm font-bold bg-red-50 px-2 py-1 rounded-lg w-fit">
                            <AlertTriangle size={14}/> {currentIssue.issue}
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">กรุณาระบุข้อมูลใหม่:</label>
                        {currentIssue.field === 'bom' ? (
                            <div className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded border border-slate-200">
                                กรณี BOM ต้องไปแก้ที่หน้าจัดการสูตรผลิต
                                <button onClick={() => { window.location.hash = '#/raw-materials'; setIsFixing(false); }} className="text-blue-600 font-bold ml-2 underline">ไปที่หน้า BOM</button>
                            </div>
                        ) : (
                            <input 
                                autoFocus
                                type={currentIssue.field.toLowerCase().includes('phone') ? 'text' : 'number'}
                                className="w-full border-2 border-amber-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-100"
                                placeholder={`ระบุ ${currentIssue.field}...`}
                                value={fixValue}
                                onChange={e => setFixValue(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleApplyFix()}
                            />
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button onClick={skipIssue} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all">ข้ามไปก่อน</button>
                        {currentIssue.field !== 'bom' && (
                            <button onClick={handleApplyFix} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all flex items-center justify-center gap-2">
                                <Save size={18}/> บันทึก
                            </button>
                        )}
                    </div>
                    
                    <div className="text-center text-[10px] text-slate-400 font-bold">
                        รายการที่ {currentIssueIndex + 1} จาก {issues.length}
                    </div>
                </div>
            </div>
        );
    }

    // DASHBOARD WIDGET MODE
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between group hover:border-amber-300 transition-all">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <svg className="w-14 h-14 transform -rotate-90">
                        <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                        <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={150} strokeDashoffset={150 - (150 * healthScore) / 100} className={healthScore > 80 ? 'text-green-500' : healthScore > 50 ? 'text-amber-500' : 'text-red-500'} />
                    </svg>
                    <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-black text-slate-700">{healthScore}%</span>
                </div>
                <div>
                    <h3 className="font-black text-slate-800 text-sm">ตรวจสอบข้อมูล (Data Health)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">พบ {issues.length} รายการที่ข้อมูลไม่ครบ</p>
                </div>
            </div>
            
            <button 
                onClick={() => { setIsFixing(true); setCurrentIssueIndex(0); }}
                className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl font-bold text-xs hover:bg-amber-100 transition-all flex items-center gap-2"
            >
                แก้ไขทันที <ArrowRight size={14}/>
            </button>
        </div>
    );
};

export default DataHealthCheck;
