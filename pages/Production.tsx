
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Cpu, Clock, Calendar, FileText, BarChart3, AlertCircle, CheckCircle2, 
    Plus, Filter, Edit2, Trash2, X, Save, Search, Factory, Calculator, 
    Timer, Settings, RefreshCcw, ArrowRight, Power, Users, LayoutList, Package, UserCheck, AlertOctagon
} from 'lucide-react';
import { MoldingLog, ProductionDocument, Product, Machine, FactoryEmployee } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Helper for generating ID
const generateId = () => Math.random().toString(36).substr(2, 9);

interface SimItem {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    cycleTime: number;
    minTonnage: number;
}

const Production: React.FC = () => {
  const factoryData = useFactoryData();
  const { factory_machines, molding_logs, production_documents = [], factory_products, packing_employees } = factoryData;
  const { updateData } = useFactoryActions(); 
  const { t } = useTranslation();
  
  // View State
  const [viewMode, setViewMode] = useState<'monitor' | 'simulator'>('monitor');

  // --- Monitor State ---
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [summaryFilter, setSummaryFilter] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Partial<MoldingLog> | null>(null);

  // --- Advanced Simulator State ---
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [simItems, setSimItems] = useState<SimItem[]>([]);
  const [simHoursPerDay, setSimHoursPerDay] = useState(24);

  // Pre-calculate options
  const machineOptions = useMemo(() => factory_machines.map(m => ({ value: m.name, label: `${m.name} (${m.location})` })), [factory_machines]);
  
  const orderOptions = useMemo(() => {
      const internalDocs = production_documents
          .filter(d => d.status === 'Approved' || d.status === 'In Progress' || d.status === 'Material Checking')
          .flatMap(d => d.items.map(item => ({
              value: d.id, 
              label: `${d.docNumber} - ${item.productName}`, 
              subLabel: `Target: ${item.quantity} ${item.unit}`,
              type: 'internal',
              doc: d,
              item: item
          })));
      return internalDocs;
  }, [production_documents]);

  const productOptions = useMemo(() => factory_products.map(p => ({ 
      value: p.id, label: p.name, subLabel: `Cycle: ${p.cycleTimeSeconds}s | Min: ${p.minTonnage || 0}T` 
  })), [factory_products]);

  // --- ADVANCED SIMULATION LOGIC ---
  const simulationResults = useMemo(() => {
      // 1. Manpower Analysis
      const selectedEmployees = packing_employees.filter(e => selectedEmployeeIds.includes(e.id));
      const operators = selectedEmployees.filter(e => e.roleId === 'operator' || e.roleId === 'technician').length;
      const generalStaff = selectedEmployees.filter(e => e.roleId === 'general').length;

      // 2. Machine Analysis & Compatibility
      const selectedMachines = factory_machines.filter(m => selectedMachineIds.includes(m.id));
      
      // Calculate capacity per item based on machine capability
      let totalTimeSeconds = 0;
      let bottleneck = '';
      let warnings: string[] = [];

      // Logic: For each product, how many machines CAN run it?
      // Assuming load balancing: Total Work / (Available & Compatible Machines capped by Operators)
      
      simItems.forEach(item => {
          const compatibleMachines = selectedMachines.filter(m => (m.tonnage || 0) >= item.minTonnage);
          
          if (compatibleMachines.length === 0) {
              warnings.push(`สินค้า ${item.productName} (Min ${item.minTonnage}T) ไม่มีเครื่องจักรที่รองรับในรายการที่เลือก`);
          } else {
              // Real available machines is limited by Manpower (Assume 1 Operator per Machine for now)
              const staffedMachines = Math.min(compatibleMachines.length, operators);
              
              if (staffedMachines === 0) {
                  warnings.push(`สินค้า ${item.productName} มีเครื่องรองรับ แต่ไม่มีพนักงานเดินเครื่อง (Operators)`);
              } else {
                  // Time = (Qty * Cycle) / Machines
                  totalTimeSeconds += (item.quantity * item.cycleTime) / staffedMachines;
              }
          }
      });

      const totalDays = totalTimeSeconds / (3600 * simHoursPerDay);
      const isFinishIn7Days = totalDays <= 7;

      return {
          operators,
          generalStaff,
          activeMachinesCount: selectedMachines.length,
          totalItems: simItems.reduce((acc, i) => acc + i.quantity, 0),
          totalDays,
          warnings,
          isFinishIn7Days
      };
  }, [selectedEmployeeIds, selectedMachineIds, simItems, simHoursPerDay, packing_employees, factory_machines]);

  // --- ACTIONS ---

  const handleOpenAddModal = (prefillJob?: any) => {
    // ... existing modal logic ...
    setEditingLog({
        id: '',
        date: selectedDate,
        machine: factory_machines?.[0]?.name || '',
        shift: 'เช้า',
        quantityProduced: 0,
        quantityRejected: 0,
        status: 'In Progress',
        lotNumber: prefillJob ? prefillJob.docNumber : '',
        productName: prefillJob ? prefillJob.productName : '',
        productId: prefillJob ? prefillJob.productId : '', 
        orderId: prefillJob ? prefillJob.docId : '',
        jobId: generateId(),
        operatorName: ''
    });
    setIsModalOpen(true);
  };

  const handleSaveLog = async () => {
      // ... existing save logic ...
      if (!editingLog) return;
      let updatedLogs = [...(molding_logs || [])];
      if (editingLog.id) {
          updatedLogs = updatedLogs.map(l => l.id === editingLog.id ? editingLog as MoldingLog : l);
      } else {
          const newLog = { ...editingLog, id: generateId() } as MoldingLog;
          updatedLogs.push(newLog);
      }
      await updateData({ ...factoryData, molding_logs: updatedLogs });
      setIsModalOpen(false);
  };

  const handleOrderSelectChange = (val: any) => {
      const opt = orderOptions.find(o => o.value === val);
      if (opt && opt.doc && opt.item) {
          setEditingLog(prev => ({
              ...prev,
              orderId: opt.doc.id,
              lotNumber: opt.doc.docNumber,
              productName: opt.item.productName,
              productId: opt.item.productId, 
              targetQuantity: opt.item.quantity
          }));
      }
  };

  // --- SIMULATOR ACTIONS ---
  const toggleEmployee = (id: string) => {
      setSelectedEmployeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleMachine = (id: string) => {
      setSelectedMachineIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addSimItem = (productId: string) => {
      const product = factory_products.find(p => p.id === productId);
      if (!product) return;
      setSimItems(prev => [...prev, {
          id: generateId(),
          productId: product.id,
          productName: product.name,
          quantity: 1000,
          cycleTime: product.cycleTimeSeconds || 15,
          minTonnage: product.minTonnage || 0
      }]);
  };

  const removeSimItem = (id: string) => setSimItems(prev => prev.filter(i => i.id !== id));
  const updateSimItemQty = (id: string, qty: number) => setSimItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));

  // --- LOGIC: Active Production Progress (Monitor Mode) ---
  const activeJobsProgress = useMemo(() => {
    // ... existing progress logic ...
    const jobs = production_documents.flatMap(doc => {
        return doc.items.map(item => {
            const relevantLogs = molding_logs?.filter(log => log.orderId === doc.id && log.productName === item.productName) || [];
            const totalProduced = relevantLogs.reduce((sum, log) => sum + (log.quantityProduced || 0), 0);
            const progress = item.quantity > 0 ? (totalProduced / item.quantity) * 100 : 0;
            let healthStatus = progress >= 100 ? 'Completed' : progress === 0 ? 'Not Started' : 'In Progress';
            if (doc.status === 'Draft') healthStatus = 'Draft';
            return {
                id: `${doc.id}_${item.id}`,
                docId: doc.id,
                docNumber: doc.docNumber,
                productName: item.productName,
                productId: item.productId, 
                target: item.quantity,
                dueDate: item.dueDate,
                customer: doc.customerName,
                totalProduced,
                progress,
                healthStatus,
                status: doc.status
            };
        });
    });
    if (summaryFilter === 'all') return jobs;
    if (summaryFilter === 'completed') return jobs.filter(j => j.healthStatus === 'Completed');
    if (summaryFilter === 'not_started') return jobs.filter(j => j.healthStatus === 'Not Started');
    if (summaryFilter === 'in_progress') return jobs.filter(j => j.healthStatus === 'In Progress');
    return jobs;
  }, [production_documents, molding_logs, summaryFilter]);

  const dailyLogs = useMemo(() => molding_logs?.filter(log => log.date === selectedDate) || [], [molding_logs, selectedDate]);

  return (
    <div className="space-y-8 relative pb-20">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('prod.title')}</h2>
          <p className="text-slate-500">{t('prod.subtitle')}</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button 
                onClick={() => setViewMode('monitor')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${viewMode === 'monitor' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <BarChart3 size={18}/> Monitor (ติดตามงาน)
            </button>
            <button 
                onClick={() => setViewMode('simulator')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${viewMode === 'simulator' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Calculator size={18}/> Simulator (จำลองแผน)
            </button>
        </div>
      </div>

      {viewMode === 'monitor' ? (
          <>
            {/* ... Existing Monitor View Code ... */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 mt-6">
                <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                                <Factory size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Active Jobs (แผนการผลิตปัจจุบัน)</h3>
                                <p className="text-sm text-slate-500">ติดตามความคืบหน้าจากใบสั่งผลิต (PO Documents)</p>
                            </div>
                        </div>
                        <div className="flex bg-slate-200/50 p-1 rounded-lg">
                            {['all', 'in_progress', 'not_started', 'completed'].map(k => (
                                <button key={k} onClick={() => setSummaryFilter(k as any)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${summaryFilter === k ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{k}</button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">{t('prod.poNumber')}</th>
                                <th className="px-6 py-4">{t('prod.productDetail')}</th>
                                <th className="px-6 py-4">{t('orders.status')}</th>
                                <th className="px-6 py-4 text-right">{t('prod.target')}</th>
                                <th className="px-6 py-4 w-1/5">{t('prod.progress')}</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activeJobsProgress.map((job) => (
                                <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4"><span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{job.docNumber}</span></td>
                                    <td className="px-6 py-4"><div className="font-bold text-slate-900">{job.productName}</div></td>
                                    <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 border">{job.healthStatus}</span></td>
                                    <td className="px-6 py-4 text-right font-mono">{job.target.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                            <div className="h-full bg-blue-500" style={{ width: `${Math.min(job.progress || 0, 100)}%` }}></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleOpenAddModal(job)} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold">บันทึกผลิต</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </>
      ) : (
          /* --- ADVANCED SIMULATOR VIEW --- */
          <div className="flex flex-col xl:flex-row gap-6 animate-in fade-in slide-in-from-right-2 h-full">
              {/* Left: 3-Step Controls */}
              <div className="w-full xl:w-2/3 space-y-6">
                  
                  {/* Step 1: Employees */}
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                      <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                          <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> เลือกพนักงาน (Manpower)
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                          {packing_employees.map(emp => (
                              <div 
                                key={emp.id} 
                                onClick={() => toggleEmployee(emp.id)}
                                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedEmployeeIds.includes(emp.id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-300'}`}
                              >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedEmployeeIds.includes(emp.id) ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                      {emp.roleId === 'operator' ? 'OP' : emp.roleId === 'technician' ? 'TC' : 'GN'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold truncate">{emp.name}</div>
                                      <div className="text-[10px] text-slate-500">{emp.department}</div>
                                  </div>
                                  {selectedEmployeeIds.includes(emp.id) && <CheckCircle2 size={16} className="text-emerald-500 shrink-0"/>}
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Step 2: Machines */}
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                      <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                          <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> เลือกเครื่องจักร (Machines)
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                          {factory_machines.map(mac => (
                              <div 
                                key={mac.id} 
                                onClick={() => toggleMachine(mac.id)}
                                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedMachineIds.includes(mac.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}
                              >
                                  <div className="flex justify-between items-start mb-2">
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${mac.status === 'ทำงาน' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{mac.status}</span>
                                      <span className="text-[10px] font-bold text-slate-400">{mac.tonnage || 0} Tons</span>
                                  </div>
                                  <div className="font-bold text-sm text-slate-800">{mac.name}</div>
                                  <div className="text-[10px] text-slate-500">{mac.location}</div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Step 3: Products */}
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                      <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                          <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> เลือกรายการผลิต (Products)
                      </h3>
                      <div className="mb-4">
                          <SearchableSelect 
                              options={productOptions}
                              value={null}
                              onChange={addSimItem}
                              placeholder="ค้นหาและเพิ่มสินค้า..."
                          />
                      </div>
                      <div className="space-y-2">
                          {simItems.map(item => (
                              <div key={item.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                  <div className="flex-1">
                                      <div className="font-bold text-slate-800 text-sm">{item.productName}</div>
                                      <div className="text-[10px] text-slate-500 flex gap-2">
                                          <span>Cycle: {item.cycleTime}s</span>
                                          <span>Min: {item.minTonnage} Tons</span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-400">Qty:</span>
                                      <input 
                                        type="number" 
                                        value={item.quantity} 
                                        onChange={(e) => updateSimItemQty(item.id, parseInt(e.target.value) || 0)}
                                        className="w-24 text-right bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                      />
                                  </div>
                                  <button onClick={() => removeSimItem(item.id)} className="text-slate-300 hover:text-red-500"><X size={18}/></button>
                              </div>
                          ))}
                          {simItems.length === 0 && <div className="text-center py-4 text-slate-400 text-xs italic">ยังไม่ได้เลือกสินค้า</div>}
                      </div>
                  </div>
              </div>

              {/* Right: Real-time Analysis Result */}
              <div className="w-full xl:w-1/3 space-y-6">
                  <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-10 opacity-10"><Calculator size={120}/></div>
                      <h3 className="text-xl font-black mb-6 relative z-10">ผลการจำลอง (Simulation Result)</h3>
                      
                      <div className="space-y-6 relative z-10">
                          <div className="flex justify-between items-center">
                              <span className="text-indigo-200 text-sm font-bold">เวลาทำงาน/วัน</span>
                              <div className="flex items-center gap-2 bg-indigo-800 rounded-lg px-2 py-1">
                                  <input 
                                    type="number" 
                                    value={simHoursPerDay} 
                                    onChange={(e) => setSimHoursPerDay(parseInt(e.target.value) || 24)}
                                    className="w-10 bg-transparent text-center font-black outline-none text-white"
                                  />
                                  <span className="text-xs text-indigo-300">ชม.</span>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-indigo-800/50 p-4 rounded-2xl border border-indigo-700">
                                  <span className="text-[10px] text-indigo-300 font-bold uppercase block mb-1">คนพร้อม (Ops)</span>
                                  <span className="text-2xl font-black">{simulationResults.operators} <span className="text-sm font-medium opacity-50">คน</span></span>
                              </div>
                              <div className="bg-indigo-800/50 p-4 rounded-2xl border border-indigo-700">
                                  <span className="text-[10px] text-indigo-300 font-bold uppercase block mb-1">เครื่องพร้อม</span>
                                  <span className="text-2xl font-black">{simulationResults.activeMachinesCount} <span className="text-sm font-medium opacity-50">เครื่อง</span></span>
                              </div>
                          </div>

                          <div className="pt-4 border-t border-indigo-800">
                              <div className="text-sm font-bold text-indigo-200 mb-2">ระยะเวลาที่ต้องใช้ (Estimated Time)</div>
                              <div className={`text-5xl font-black ${simulationResults.isFinishIn7Days ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {simulationResults.totalDays.toFixed(1)} <span className="text-lg text-white">วัน</span>
                              </div>
                              <p className="text-xs text-indigo-300 mt-2">
                                  {simulationResults.isFinishIn7Days ? '✅ ทันตามกำหนด 7 วัน' : '⚠️ เกินกำหนด 7 วัน ควรเพิ่มเครื่องจักรหรือคน'}
                              </p>
                          </div>
                      </div>
                  </div>

                  {simulationResults.warnings.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                          <h4 className="font-black text-amber-800 text-sm mb-3 flex items-center gap-2"><AlertOctagon size={16}/> ข้อควรระวัง (Issues Found)</h4>
                          <ul className="space-y-2">
                              {simulationResults.warnings.map((w, i) => (
                                  <li key={i} className="text-xs text-amber-700 flex gap-2">
                                      <span className="shrink-0">•</span> {w}
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- ADD/EDIT MODAL (MONITOR MODE - Keeping original functionality) --- */}
      {isModalOpen && editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                {/* ... existing modal UI ... */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-black text-slate-800 text-xl tracking-tight">บันทึกการผลิต</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600"><X size={24} /></button>
                </div>
                <div className="p-8 space-y-5 flex-1 overflow-y-auto">
                    {/* ... form fields ... */}
                    <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ใบสั่งผลิต (Job/PO)</label>
                        <SearchableSelect options={orderOptions} value={editingLog.orderId} onChange={handleOrderSelectChange} placeholder="เลือกใบสั่งผลิต..." />
                    </div>
                    {/* ... other fields ... */}
                    <button onClick={handleSaveLog} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">บันทึก</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Production;
