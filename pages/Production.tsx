
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Cpu, Clock, Calendar, FileText, BarChart3, AlertCircle, CheckCircle2, 
    Plus, Filter, Edit2, Trash2, X, Save, Search, Factory, Calculator, 
    Timer, Settings, RefreshCcw, ArrowRight
} from 'lucide-react';
import { MoldingLog, ProductionDocument, Product } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Helper for generating ID
const generateId = () => Math.random().toString(36).substr(2, 9);

const Production: React.FC = () => {
  const factoryData = useFactoryData();
  const { factory_machines, molding_logs, production_documents = [], packing_orders, factory_products } = factoryData;
  const { updateData } = useFactoryActions(); 
  const { t } = useTranslation();
  
  // View State
  const [viewMode, setViewMode] = useState<'monitor' | 'simulator'>('monitor');

  // --- Monitor State ---
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [summaryFilter, setSummaryFilter] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Partial<MoldingLog> | null>(null);

  // --- Simulator State ---
  const [simItems, setSimItems] = useState<{ id: string, productId: string, productName: string, quantity: number, cycleTime: number }[]>([]);
  const [simConfig, setSimConfig] = useState({
      machines: factory_machines.filter(m => m.status !== 'เสีย').length || 1,
      hoursPerDay: 20,
      targetDays: 7
  });

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
      value: p.id, label: p.name, subLabel: `Cycle: ${p.cycleTimeSeconds}s` 
  })), [factory_products]);

  // --- SIMULATION LOGIC ---
  const simulationResults = useMemo(() => {
      const totalUnits = simItems.reduce((acc, item) => acc + item.quantity, 0);
      
      // 1. Calculate Total Required Time (in Seconds) for all items
      // Formula: Sum(Quantity * CycleTime)
      const totalSecondsRequired = simItems.reduce((acc, item) => acc + (item.quantity * item.cycleTime), 0);
      
      // 2. Calculate Factory Capacity Per Day (in Seconds)
      // Formula: Machines * Hours * 3600
      const capacitySecondsPerDay = simConfig.machines * simConfig.hoursPerDay * 3600;

      // Result A: Days needed to finish everything
      const daysNeeded = capacitySecondsPerDay > 0 ? totalSecondsRequired / capacitySecondsPerDay : 0;

      // Result B: Production within Target Days
      const totalCapacityInTargetDays = capacitySecondsPerDay * simConfig.targetDays;
      const percentFinishable = totalSecondsRequired > 0 ? Math.min((totalCapacityInTargetDays / totalSecondsRequired) * 100, 100) : 0;
      const unitsFinishable = totalSecondsRequired > 0 ? Math.floor(totalUnits * (percentFinishable / 100)) : 0;

      return {
          totalUnits,
          totalSecondsRequired,
          daysNeeded,
          percentFinishable,
          unitsFinishable,
          isOverload: daysNeeded > simConfig.targetDays
      };
  }, [simItems, simConfig]);

  // --- LOGIC: Active Production Progress ---
  const activeJobsProgress = useMemo(() => {
    // Flatten Production Documents into trackable jobs
    const jobs = production_documents.flatMap(doc => {
        return doc.items.map(item => {
            const relevantLogs = molding_logs?.filter(log => log.orderId === doc.id && log.productName === item.productName) || [];
            const totalProduced = relevantLogs.reduce((sum, log) => sum + (log.quantityProduced || 0), 0);
            const progress = item.quantity > 0 ? (totalProduced / item.quantity) * 100 : 0;
            
            let healthStatus = 'In Progress';
            if (progress >= 100) healthStatus = 'Completed';
            else if (progress === 0) healthStatus = 'Not Started';
            else if (progress >= 90) healthStatus = 'Near Completion';

            if (doc.status === 'Draft') healthStatus = 'Draft';

            return {
                id: `${doc.id}_${item.id}`,
                docId: doc.id,
                docNumber: doc.docNumber,
                productName: item.productName,
                productId: item.productId, // Ensure ID is available
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
    if (summaryFilter === 'in_progress') return jobs.filter(j => j.healthStatus === 'In Progress' || j.healthStatus === 'Near Completion');
    return jobs;
  }, [production_documents, molding_logs, summaryFilter]);

  const dailyLogs = useMemo(() => {
    return molding_logs?.filter(log => log.date === selectedDate) || [];
  }, [molding_logs, selectedDate]);

  // --- ACTIONS ---

  const handleOpenAddModal = (prefillJob?: any) => {
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
        productId: prefillJob ? prefillJob.productId : '', // PREFILL Product ID
        orderId: prefillJob ? prefillJob.docId : '',
        jobId: generateId(),
        operatorName: ''
    });
    setIsModalOpen(true);
  };

  const handleEditLog = (log: MoldingLog) => {
      setEditingLog({ ...log });
      setIsModalOpen(true);
  };

  const handleDeleteLog = async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this log?")) return;
      const updatedLogs = molding_logs.filter(l => l.id !== id);
      await updateData({ ...factoryData, molding_logs: updatedLogs });
  };

  const handleSaveLog = async () => {
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
              productId: opt.item.productId, // Copy Product ID from selected order
              targetQuantity: opt.item.quantity
          }));
      }
  };

  // Simulator Actions
  const addSimItem = (productId: string) => {
      const product = factory_products.find(p => p.id === productId);
      if (!product) return;
      
      setSimItems(prev => [...prev, {
          id: generateId(),
          productId: product.id,
          productName: product.name,
          quantity: 1000, // Default qty
          cycleTime: product.cycleTimeSeconds || 15
      }]);
  };

  const removeSimItem = (id: string) => {
      setSimItems(prev => prev.filter(i => i.id !== id));
  };

  const updateSimItemQty = (id: string, qty: number) => {
      setSimItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

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
                <Calculator size={18}/> Simulator (คำนวณแผน)
            </button>
        </div>
      </div>

      {viewMode === 'monitor' ? (
          <>
            {/* 1. Active Production Orders (Smart Tracking) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
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

                        {/* Filter Tabs */}
                        <div className="flex bg-slate-200/50 p-1 rounded-lg">
                            {[
                                { key: 'all', label: 'ทั้งหมด' },
                                { key: 'in_progress', label: 'กำลังผลิต' },
                                { key: 'not_started', label: 'ยังไม่เริ่ม' },
                                { key: 'completed', label: 'เสร็จสิ้น' }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setSummaryFilter(tab.key as any)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                        summaryFilter === tab.key 
                                        ? 'bg-white text-slate-800 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {tab.label}
                                </button>
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
                                <th className="px-6 py-4 text-right text-green-700">{t('prod.produced')}</th>
                                <th className="px-6 py-4 w-1/5">{t('prod.progress')}</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activeJobsProgress.map((job) => (
                                <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{job.docNumber}</span>
                                        {job.customer && <div className="text-[10px] text-slate-400 mt-1">{job.customer}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{job.productName}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10}/> Due: {job.dueDate}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border uppercase
                                            ${job.healthStatus === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                                            job.healthStatus === 'Near Completion' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                            job.healthStatus === 'Not Started' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                                            'bg-white text-slate-700 border-slate-300'}`}>
                                            {job.healthStatus === 'In Progress' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>}
                                            {job.healthStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-500">{job.target.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-green-600">{job.totalProduced.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-bold text-slate-700">{(job.progress || 0).toFixed(1)}%</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                                <div 
                                                    className={`h-full rounded-full shadow-sm ${job.progress >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}
                                                    style={{ width: `${Math.min(job.progress || 0, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => handleOpenAddModal(job)}
                                            className="px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-lg transition-all flex items-center gap-1 mx-auto text-xs font-bold shadow-md hover:shadow-lg active:scale-95"
                                            title="Add Production Log for this Job"
                                        >
                                            <Plus size={14} /> บันทึกผลิต
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {activeJobsProgress.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-12 text-slate-400 font-bold">ไม่พบรายการผลิตที่กำลังดำเนินการ</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 2. Daily Production Log (CRUD) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{t('prod.dailyLog')}</h3>
                            <p className="text-sm text-slate-500">{t('prod.dailyLogSub')}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            <Calendar size={16} className="text-slate-500 ml-2" />
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0"
                            />
                        </div>
                        <button 
                            onClick={() => handleOpenAddModal()}
                            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors shadow-sm"
                        >
                            <Plus size={16} /> เพิ่มบันทึกทั่วไป
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Machine</th>
                                <th className="px-6 py-4">{t('prod.shift')}</th>
                                <th className="px-6 py-4">{t('prod.productDetail')}</th>
                                <th className="px-6 py-4 text-right bg-blue-50/50 text-blue-700">{t('prod.outputToday')}</th>
                                <th className="px-6 py-4">{t('orders.status')}</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {dailyLogs.length > 0 ? (
                                dailyLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{log.machine}</td>
                                        <td className="px-6 py-4 text-slate-600">{log.shift}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-900 font-bold line-clamp-1">{log.productName}</div>
                                            <div className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-1 rounded">{log.lotNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-blue-600 bg-blue-50/30 font-mono text-base">
                                            {(log.quantityProduced || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase 
                                                ${log.status === 'Completed' || log.status === 'เสร็จสิ้น' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleEditLog(log)}
                                                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                        </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <FileText size={32} className="text-slate-300" />
                                            <p>{t('prod.noLogs')}</p>
                                            <p className="text-xs opacity-70">กด "เพิ่มบันทึก" เพื่อลงยอดผลิตของวันที่ {selectedDate}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          </>
      ) : (
          /* --- SIMULATOR VIEW --- */
          <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-right-2">
              {/* Configuration Panel */}
              <div className="w-full lg:w-[400px] space-y-6">
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                      <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Settings size={18} className="text-slate-400"/> ตั้งค่าการผลิต (Constraints)</h3>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">จำนวนเครื่องจักรที่ใช้</label>
                              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                                  <Factory size={18} className="text-slate-400"/>
                                  <input 
                                    type="number" 
                                    value={simConfig.machines} 
                                    onChange={(e) => setSimConfig({...simConfig, machines: parseInt(e.target.value) || 1})}
                                    className="bg-transparent font-black text-slate-800 w-full outline-none"
                                  />
                                  <span className="text-xs font-bold text-slate-400">เครื่อง</span>
                              </div>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ชั่วโมงทำงาน / วัน</label>
                              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                                  <Clock size={18} className="text-slate-400"/>
                                  <input 
                                    type="number" 
                                    value={simConfig.hoursPerDay} 
                                    onChange={(e) => setSimConfig({...simConfig, hoursPerDay: parseInt(e.target.value) || 1})}
                                    className="bg-transparent font-black text-slate-800 w-full outline-none"
                                  />
                                  <span className="text-xs font-bold text-slate-400">ชม.</span>
                              </div>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ระยะเวลาเป้าหมาย (Timeline)</label>
                              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2">
                                  <Calendar size={18} className="text-indigo-500"/>
                                  <input 
                                    type="number" 
                                    value={simConfig.targetDays} 
                                    onChange={(e) => setSimConfig({...simConfig, targetDays: parseInt(e.target.value) || 1})}
                                    className="bg-transparent font-black text-indigo-700 w-full outline-none"
                                  />
                                  <span className="text-xs font-bold text-indigo-400">วัน</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-[400px]">
                      <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Plus size={18} className="text-slate-400"/> เพิ่มรายการคำนวณ</h3>
                      <div className="mb-4 relative">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">เลือกสินค้า</label>
                          <SearchableSelect 
                              options={productOptions}
                              value={null}
                              onChange={addSimItem}
                              placeholder="ค้นหาชื่อสินค้า..."
                          />
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                          {simItems.map((item, idx) => (
                              <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative group">
                                  <button onClick={() => removeSimItem(item.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><X size={14}/></button>
                                  <div className="font-bold text-slate-800 text-sm pr-6 truncate">{item.productName}</div>
                                  <div className="flex justify-between items-center mt-2">
                                      <div className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100">
                                          Cycle: {item.cycleTime}s
                                      </div>
                                      <div className="flex items-center gap-1">
                                          <span className="text-[10px] font-bold text-slate-400">Qty:</span>
                                          <input 
                                            type="number" 
                                            value={item.quantity} 
                                            onChange={(e) => updateSimItemQty(item.id, parseInt(e.target.value) || 0)}
                                            className="w-20 text-right bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                          />
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {simItems.length === 0 && (
                              <div className="text-center py-10 text-slate-400 text-xs">
                                  เลือกสินค้าเพื่อเริ่มคำนวณ
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Results Dashboard */}
              <div className="flex-1 space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={`p-6 rounded-[2rem] border-2 shadow-sm flex flex-col justify-between ${simulationResults.isOverload ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                          <div>
                              <div className="flex items-center gap-2 mb-2">
                                  <Timer size={24} className={simulationResults.isOverload ? "text-rose-500" : "text-emerald-500"}/>
                                  <span className={`text-sm font-bold uppercase tracking-wider ${simulationResults.isOverload ? "text-rose-600" : "text-emerald-600"}`}>ระยะเวลาที่ต้องใช้</span>
                              </div>
                              <div className={`text-5xl font-black ${simulationResults.isOverload ? "text-rose-700" : "text-emerald-700"}`}>
                                  {simulationResults.daysNeeded.toFixed(1)} <span className="text-lg font-bold">วัน</span>
                              </div>
                          </div>
                          <div className={`mt-4 text-xs font-bold ${simulationResults.isOverload ? "text-rose-500" : "text-emerald-500"}`}>
                              {simulationResults.isOverload ? `เกินเป้าหมาย ${simConfig.targetDays} วันไป ${(simulationResults.daysNeeded - simConfig.targetDays).toFixed(1)} วัน` : "สามารถผลิตทันตามกำหนดเวลา"}
                          </div>
                      </div>

                      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
                          <div>
                              <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle2 size={24} className="text-blue-500"/>
                                  <span className="text-sm font-bold uppercase tracking-wider text-blue-600">ศักยภาพใน {simConfig.targetDays} วัน</span>
                              </div>
                              <div className="text-5xl font-black text-slate-800">
                                  {simulationResults.percentFinishable.toFixed(0)}%
                              </div>
                          </div>
                          <div className="mt-4 w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                              <div className={`h-full rounded-full ${simulationResults.percentFinishable >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{width: `${simulationResults.percentFinishable}%`}}></div>
                          </div>
                          <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400">
                              <span>ผลิตได้: {simulationResults.unitsFinishable.toLocaleString()} ชิ้น</span>
                              <span>เป้าหมาย: {simulationResults.totalUnits.toLocaleString()} ชิ้น</span>
                          </div>
                      </div>
                  </div>

                  {/* Recommendation / Analysis */}
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                      <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-slate-400"/> รายละเอียดการผลิต (Breakdown)</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                  layout="vertical"
                                  data={simItems.map(i => ({ 
                                      name: i.productName, 
                                      hours: (i.quantity * i.cycleTime) / 3600 
                                  }))}
                                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                              >
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                  <Tooltip formatter={(val: number) => `${val.toFixed(1)} ชม.`} cursor={{fill: 'transparent'}} />
                                  <Bar dataKey="hours" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={20} />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                      <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                          <div className="bg-white p-2 rounded-lg shadow-sm text-indigo-600"><AlertCircle size={20}/></div>
                          <div>
                              <h4 className="font-bold text-slate-700 text-sm">คำแนะนำจากระบบ</h4>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                  {simulationResults.isOverload 
                                      ? `การผลิตเกินกำลังเครื่องจักร! แนะนำให้ (1) เพิ่มจำนวนเครื่องจักรเป็น ${Math.ceil(simConfig.machines * (simulationResults.daysNeeded / simConfig.targetDays))} เครื่อง หรือ (2) ขยายเวลาส่งมอบเป็น ${Math.ceil(simulationResults.daysNeeded)} วัน`
                                      : `กำลังการผลิตเพียงพอ! คุณสามารถผลิตเสร็จก่อนกำหนดโดยใช้เวลาประมาณ ${simulationResults.daysNeeded.toFixed(1)} วัน หรือลดจำนวนเครื่องจักรลงเหลือ ${Math.ceil(simConfig.machines * (simulationResults.daysNeeded / simConfig.targetDays))} เครื่องเพื่อประหยัดพลังงานได้`}
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- ADD/EDIT MODAL (MONITOR MODE) --- */}
      {isModalOpen && editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-black text-slate-800 text-xl tracking-tight">
                        {editingLog.id ? 'แก้ไขบันทึกการผลิต' : 'เพิ่มบันทึกการผลิต'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-8 space-y-5 flex-1 overflow-y-auto">
                    {/* Order Selection */}
                    <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ใบสั่งผลิต (Job/PO)</label>
                        <SearchableSelect 
                            options={orderOptions}
                            value={editingLog.orderId}
                            onChange={handleOrderSelectChange}
                            placeholder="เลือกใบสั่งผลิต..."
                        />
                    </div>

                    {/* Machine */}
                    <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">เครื่องจักร</label>
                        <SearchableSelect 
                            options={machineOptions}
                            value={editingLog.machine}
                            onChange={(val) => setEditingLog({...editingLog, machine: val})}
                            placeholder="เลือกเครื่องจักร..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">วันที่</label>
                            <input 
                                type="date" 
                                value={editingLog.date}
                                onChange={e => setEditingLog({...editingLog, date: e.target.value})}
                                className="w-full border border-slate-200 bg-white text-slate-900 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary-50"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">กะงาน (Shift)</label>
                            <select 
                                value={editingLog.shift}
                                onChange={e => setEditingLog({...editingLog, shift: e.target.value})}
                                className="w-full border border-slate-200 bg-white text-slate-900 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary-50"
                            >
                                <option value="เช้า">เช้า (Day)</option>
                                <option value="ดึก">ดึก (Night)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        {/* Output Quantity */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ยอดผลิตได้ (OK)</label>
                            <input 
                                type="number" 
                                value={editingLog.quantityProduced}
                                onChange={e => setEditingLog({...editingLog, quantityProduced: parseInt(e.target.value) || 0})}
                                className="w-full border-2 border-primary-100 bg-primary-50/30 text-primary-700 rounded-xl px-4 py-3 text-2xl font-black outline-none focus:ring-4 focus:ring-primary-100 text-right"
                            />
                        </div>
                        
                        {/* Reject Quantity */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ของเสีย (NG)</label>
                            <input 
                                type="number" 
                                value={editingLog.quantityRejected}
                                onChange={e => setEditingLog({...editingLog, quantityRejected: parseInt(e.target.value) || 0})}
                                className="w-full border-2 border-red-100 bg-red-50/30 text-red-600 rounded-xl px-4 py-3 text-2xl font-black outline-none focus:ring-4 focus:ring-red-100 text-right"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">สถานะงาน</label>
                         <select 
                            value={editingLog.status}
                            onChange={e => setEditingLog({...editingLog, status: e.target.value})}
                            className="w-full border border-slate-200 bg-white text-slate-900 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary-50"
                        >
                            <option value="In Progress">กำลังผลิต (In Progress)</option>
                            <option value="รอนับ">ผลิตเสร็จ/รอนับ (Waiting QC)</option>
                            <option value="Stopped">หยุดชั่วคราว (Stopped)</option>
                        </select>
                    </div>
                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-all text-sm"
                    >
                        ยกเลิก
                    </button>
                    <button 
                        onClick={handleSaveLog}
                        className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg flex items-center gap-2 text-sm"
                    >
                        <Save size={18} /> บันทึกข้อมูล
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Production;
