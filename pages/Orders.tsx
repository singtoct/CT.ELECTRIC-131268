
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Search, Package, Calculator,
    ArrowRight, ChevronDown, ChevronUp, FilePlus2, 
    AlertOctagon, CheckCircle2, Factory, LayoutList,
    Link as LinkIcon, AlertTriangle, MoreHorizontal, Wrench,
    ArrowUpDown, Edit3, X, Save, Plus, Trash2, Calendar, User,
    CalendarClock, Printer, Settings2, Timer, Minus, Activity, CheckSquare, Square
} from 'lucide-react';
import { ProductionDocument, MoldingLog } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const Orders: React.FC = () => {
  const data = useFactoryData();
  const { 
      production_documents = [], 
      packing_inventory = [], 
      molding_logs = [],
      factory_products = [], 
      factory_machines = [], // Access real machine list
      factory_settings
  } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  
  // View Mode State
  const [viewMode, setViewMode] = useState<'status' | 'plan'>('status');

  // Planning Configuration State
  const [planConfig, setPlanConfig] = useState({
      workingHours: factory_settings?.productionConfig?.workingHoursPerDay || 20, 
      efficiency: 90, 
  });

  // Machine Assignment State (Product Name -> Array of Machine Names)
  // Example: { "Product A": ["Machine 1", "Machine 2"] }
  const [machineAssignments, setMachineAssignments] = useState<Record<string, string[]>>({});
  
  // UI State for dropdowns
  const [openMachineSelector, setOpenMachineSelector] = useState<string | null>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'netRequired', direction: 'desc' });

  // --- Adjustment Modal State ---
  const [adjustingProcess, setAdjustingProcess] = useState<{ 
      productName: string, 
      statusKey: string, 
      logs: MoldingLog[] 
  } | null>(null);

  // --- CONFIG: Define Process Steps Columns ---
  const processColumns = [
      { key: 'รอ QC', label: 'รอ QC', color: 'text-blue-600' },
      { key: 'รอแปะกันรอย', label: 'รอแปะกันรอย', color: 'text-slate-600' },
      { key: 'รอประกอบ', label: 'รอประกอบ', color: 'text-slate-600' },
      { key: 'รอแพค', label: 'รอแพค', color: 'text-slate-600' },
      { key: 'รอนับ', label: 'รอนับ', color: 'text-slate-600' }
  ];

  // --- LOGIC: Unlinked Production (Jobs without Order ID) ---
  const unlinkedLogs = useMemo(() => {
      return molding_logs.filter(l => 
          (!l.orderId || l.orderId === '') && 
          l.status !== 'เสร็จสิ้น' && 
          l.status !== 'Completed' &&
          (l.quantityProduced || 0) > 0
      );
  }, [molding_logs]);

  // --- LOGIC: Main Planning Data ---
  const planningData = useMemo(() => {
      const productMap: Record<string, {
          productName: string, 
          productId?: string,
          earliestDue: string | null,
          totalDemand: number, 
          delivered: number, 
          stock: number, 
          wipBreakdown: Record<string, number>,
          orders: { docId: string, docNumber: string, qty: number, dueDate: string, status: string }[]
      }> = {};

      // 1. Iterate Active Orders
      production_documents.forEach(doc => {
          if (doc.status === 'Cancelled' || doc.status === 'Draft') return;
          
          doc.items.forEach(item => {
              if (!productMap[item.productName]) {
                  const stockItem = packing_inventory.find(i => i.name === item.productName && i.isoStatus === 'Released');
                  productMap[item.productName] = {
                      productName: item.productName, 
                      productId: item.productId,
                      earliestDue: null,
                      totalDemand: 0, 
                      delivered: 0, 
                      stock: stockItem?.quantity || 0,
                      wipBreakdown: {}, 
                      orders: []
                  };
                  processColumns.forEach(col => productMap[item.productName].wipBreakdown[col.key] = 0);
              }

              const entry = productMap[item.productName];
              entry.totalDemand += item.quantity;
              entry.delivered += (item.deliveredQuantity || 0);
              
              if (!entry.earliestDue || new Date(item.dueDate) < new Date(entry.earliestDue)) {
                  entry.earliestDue = item.dueDate;
              }

              entry.orders.push({ 
                  docId: doc.id, 
                  docNumber: doc.docNumber, 
                  qty: item.quantity, 
                  dueDate: item.dueDate, 
                  status: doc.status 
              });
          });
      });

      // 2. Iterate Molding Logs for WIP Breakdown
      molding_logs.forEach(log => {
          let statusKey = log.status;
          if (statusKey === 'Waiting QC') statusKey = 'รอ QC';
          
          if (productMap[log.productName]) {
              const entry = productMap[log.productName];
              if (entry.wipBreakdown[statusKey] !== undefined) {
                  entry.wipBreakdown[statusKey] += (log.quantityProduced || 0);
              }
          }
      });

      // 3. Calculation & Filtering
      let processedData = Object.values(productMap)
        .filter(p => p.productName.toLowerCase().includes(search.toLowerCase()))
        .map(p => {
            const totalWip = Object.values(p.wipBreakdown).reduce((a, b) => a + b, 0);
            const netRequired = Math.max(0, p.totalDemand - p.delivered - p.stock - totalWip);
            
            const dateObj = p.earliestDue ? new Date(p.earliestDue) : null;
            const dateDisplay = dateObj 
                ? dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                : '-';

            // --- PLANNER LOGIC ---
            const prodSpec = factory_products.find(prod => prod.name === p.productName || prod.id === p.productId);
            const cycleTime = prodSpec?.cycleTimeSeconds || 20; 
            const cavity = prodSpec?.cavity || 1;
            
            // Output per 1 Machine
            const secondsPerDay = planConfig.workingHours * 3600;
            const theoreticalOutput = (secondsPerDay / cycleTime) * cavity;
            const dailyCapacityPerMachine = Math.floor(theoreticalOutput * (planConfig.efficiency / 100));

            // Applied Machines (User Selection)
            const assignedList = machineAssignments[p.productName] || [];
            // If none assigned, default calculate as 1 machine for estimation, but show "0" assigned
            const machinesUsedCount = assignedList.length > 0 ? assignedList.length : 1; 
            const totalDailyOutput = dailyCapacityPerMachine * machinesUsedCount;

            const daysToFinish = netRequired > 0 ? (netRequired / totalDailyOutput) : 0;

            return { 
                ...p, 
                netRequired, 
                totalWip, 
                dateDisplay,
                ...p.wipBreakdown,
                cycleTime,
                cavity,
                dailyCapacityPerMachine,
                totalDailyOutput,
                assignedList,
                machinesUsedCount: assignedList.length, // Explicit count for UI
                daysToFinish
            };
        });

      // 4. Sorting Logic
      if (sortConfig !== null) {
        processedData.sort((a: any, b: any) => {
          let aValue = a[sortConfig.key];
          let bValue = b[sortConfig.key];

          if (sortConfig.key === 'earliestDue') {
              aValue = a.earliestDue || '9999-99-99'; 
              bValue = b.earliestDue || '9999-99-99';
          }

          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      return processedData;

  }, [production_documents, packing_inventory, molding_logs, search, sortConfig, planConfig, factory_products, machineAssignments]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
      if (sortConfig?.key !== columnKey) return <ArrowUpDown size={12} className="opacity-20 ml-1 inline-block" />;
      return sortConfig.direction === 'asc' 
        ? <ChevronUp size={14} className="ml-1 inline-block text-primary-600" />
        : <ChevronDown size={14} className="ml-1 inline-block text-primary-600" />;
  };

  const handleCreateProductionOrder = (productName: string, quantity: number) => {
      navigate('/production-docs', { state: { prefillProduct: productName, prefillQuantity: quantity } });
  };

  const toggleMachineAssignment = (productName: string, machineName: string) => {
      setMachineAssignments(prev => {
          const current = prev[productName] || [];
          if (current.includes(machineName)) {
              return { ...prev, [productName]: current.filter(m => m !== machineName) };
          } else {
              return { ...prev, [productName]: [...current, machineName] };
          }
      });
  };

  // ... (Keep existing Adjustment Logic & Handlers) ...
  const handleCellClick = (e: React.MouseEvent, productName: string, statusKey: string) => {
      e.stopPropagation();
      const relevantLogs = molding_logs.filter(l => 
          l.productName === productName && 
          (l.status === statusKey || (statusKey === 'รอ QC' && l.status === 'Waiting QC'))
      );
      setAdjustingProcess({ productName, statusKey, logs: JSON.parse(JSON.stringify(relevantLogs)) });
  };

  const handleUpdateLog = (index: number, field: keyof MoldingLog, value: any) => {
      if (!adjustingProcess) return;
      const newLogs = [...adjustingProcess.logs];
      newLogs[index] = { ...newLogs[index], [field]: value };
      setAdjustingProcess({ ...adjustingProcess, logs: newLogs });
  };

  const handleDeleteLog = (index: number) => {
      if (!adjustingProcess) return;
      const newLogs = adjustingProcess.logs.filter((_, i) => i !== index);
      setAdjustingProcess({ ...adjustingProcess, logs: newLogs });
  };

  const handleAddLog = () => {
      if (!adjustingProcess) return;
      const newLog: MoldingLog = {
          id: generateId(), 
          jobId: `ADJ-${Date.now().toString().slice(-4)}`,
          orderId: '', 
          productName: adjustingProcess.productName,
          status: adjustingProcess.statusKey,
          quantityProduced: 0,
          quantityRejected: 0,
          machine: 'Manual Adjust',
          operatorName: 'Admin',
          shift: 'Day',
          lotNumber: 'MANUAL',
          date: new Date().toISOString().split('T')[0],
          productId: '',
      };
      setAdjustingProcess({ ...adjustingProcess, logs: [...adjustingProcess.logs, newLog] });
  };

  const handleSaveAdjustment = async () => {
      if (!adjustingProcess) return;
      let updatedGlobalLogs = [...molding_logs];
      const originalRelevantLogs = molding_logs.filter(l => 
          l.productName === adjustingProcess.productName && 
          (l.status === adjustingProcess.statusKey || (adjustingProcess.statusKey === 'รอ QC' && l.status === 'Waiting QC'))
      );
      updatedGlobalLogs = updatedGlobalLogs.filter(l => !originalRelevantLogs.find(ol => ol.id === l.id));
      updatedGlobalLogs = [...updatedGlobalLogs, ...adjustingProcess.logs];
      await updateData({ ...data, molding_logs: updatedGlobalLogs });
      setAdjustingProcess(null);
  };

  return (
    <div className="space-y-6 pb-20">
      <style type="text/css" media="print">{`
        @page { size: A4 landscape; margin: 5mm; }
        body { background: white; font-family: sans-serif; }
        .print-hidden { display: none !important; }
        .print-visible { display: block !important; }
        table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        th, td { border: 1px solid #000; padding: 4px; }
        thead { background-color: #ddd !important; -webkit-print-color-adjust: exact; }
        .bg-white { background-color: white !important; box-shadow: none !important; border: none !important; }
        /* Fix colors for print */
        .text-rose-600 { color: black !important; font-weight: bold; }
        .bg-rose-50 { background-color: transparent !important; }
        .print-machine-list { display: block !important; font-weight: bold; font-size: 8pt; }
        .screen-machine-selector { display: none !important; }
      `}</style>

      <div className="print-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">แผนการผลิตและสถานะรวม</h2>
          <p className="text-slate-500 font-bold text-sm mt-1">
              {viewMode === 'status' ? 'ภาพรวมความคืบหน้าของออเดอร์ทั้งหมดในระบบ' : 'วิเคราะห์กำลังการผลิตรายสัปดาห์ (Weekly Capacity)'}
          </p>
        </div>
        <div className="flex gap-2">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button 
                    onClick={() => setViewMode('status')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${viewMode === 'status' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <LayoutList size={16}/> Status (ติดตาม)
                </button>
                <button 
                    onClick={() => setViewMode('plan')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${viewMode === 'plan' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <CalendarClock size={16}/> Weekly Plan (แผนผลิต)
                </button>
            </div>
            
            {viewMode === 'status' && (
                <button 
                    onClick={() => navigate('/production-docs')}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
                >
                    <FilePlus2 size={16}/> เพิ่มใบสั่งผลิต
                </button>
            )}
        </div>
      </div>

      {/* --- WEEKLY PLAN CONFIGURATION PANEL --- */}
      {viewMode === 'plan' && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 animate-in fade-in slide-in-from-top-2 print:border-black print:rounded-none">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-indigo-900 print:text-black">
                      <div className="bg-indigo-100 p-3 rounded-xl print-hidden"><Settings2 size={24}/></div>
                      <div>
                          <h4 className="font-black text-lg">ตั้งค่ากำลังการผลิต (Capacity Settings)</h4>
                          <p className="text-xs text-indigo-500 font-bold print:text-black">ปรับตัวแปรเพื่อคำนวณวันจบงาน</p>
                      </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 items-center">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex flex-col print:bg-white print:border-black">
                          <label className="text-[9px] font-black text-slate-400 uppercase print:text-black">Working Hours/Day</label>
                          <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                value={planConfig.workingHours} 
                                onChange={e => setPlanConfig({...planConfig, workingHours: parseFloat(e.target.value) || 0})}
                                className="w-12 bg-transparent font-black text-lg text-slate-800 outline-none text-center border-b border-slate-300 focus:border-indigo-500 print:text-black"
                              />
                              <span className="text-xs font-bold text-slate-500 print:text-black">Hrs.</span>
                          </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex flex-col print:bg-white print:border-black">
                          <label className="text-[9px] font-black text-slate-400 uppercase print:text-black">Efficiency (OEE)</label>
                          <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                value={planConfig.efficiency} 
                                onChange={e => setPlanConfig({...planConfig, efficiency: parseFloat(e.target.value) || 0})}
                                className="w-12 bg-transparent font-black text-lg text-slate-800 outline-none text-center border-b border-slate-300 focus:border-indigo-500 print:text-black"
                              />
                              <span className="text-xs font-bold text-slate-500 print:text-black">%</span>
                          </div>
                      </div>
                      
                      <div className="h-10 w-px bg-slate-200 hidden md:block print:hidden"></div>

                      <div className="flex gap-4">
                          <div className="text-right">
                              <div className="text-[10px] text-slate-400 font-bold uppercase print:text-black">Total Urgent Jobs</div>
                              <div className="text-xl font-black text-rose-600 print:text-black">{planningData.filter(p => p.netRequired > 0).length} Items</div>
                          </div>
                          <div className="text-right pl-4 border-l border-slate-100 print:border-black">
                              <div className="text-[10px] text-slate-400 font-bold uppercase print:text-black">Est. Machine Days</div>
                              <div className="text-xl font-black text-indigo-600 print:text-black">
                                  {planningData.reduce((sum, p) => sum + (p.netRequired > 0 ? p.daysToFinish : 0), 0).toFixed(1)} Days
                              </div>
                          </div>
                      </div>
                      
                      <button onClick={() => window.print()} className="ml-4 p-3 bg-slate-800 text-white rounded-xl shadow-lg hover:bg-black transition-all print-hidden">
                          <Printer size={20}/>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- UNLINKED PRODUCTION ALERT --- */}
      {unlinkedLogs.length > 0 && viewMode === 'status' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 print-hidden">
              <h4 className="text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
                  <Wrench size={16} className="text-amber-500"/> ข้อแนะนำเพื่อปรับปรุงข้อมูล ({unlinkedLogs.length})
              </h4>
              <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm flex items-start gap-4">
                  <div className="bg-amber-100 text-amber-600 p-2 rounded-full shrink-0 mt-1">
                      <LinkIcon size={20}/>
                  </div>
                  <div className="flex-1">
                      <h5 className="text-amber-800 font-bold text-sm">พบการผลิตที่ยังไม่ได้เชื่อมโยง</h5>
                      <div className="mt-1 space-y-1">
                          {unlinkedLogs.slice(0, 2).map(log => (
                              <div key={log.id} className="text-xs text-slate-600">
                                  <span className="font-bold">{log.productName}</span> จำนวน <span className="font-black">{log.quantityProduced.toLocaleString()}</span> ชิ้น ถูกผลิตแล้วแต่ยังไม่ได้ผูกกับออเดอร์ใด
                              </div>
                          ))}
                          {unlinkedLogs.length > 2 && <div className="text-xs text-slate-400 italic">+ อีก {unlinkedLogs.length - 2} รายการ</div>}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                          <select className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 outline-none font-bold text-slate-700">
                              <option>ออเดอร์ #PO-{unlinkedLogs[0]?.lotNumber || 'Unknown'}</option>
                          </select>
                          <button className="bg-amber-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-600">เชื่อมโยง</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- SEARCH & TABLE --- */}
      <div className="space-y-4">
          {viewMode === 'status' && (
            <div className="flex gap-4 print-hidden">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="ค้นหาสินค้า..." 
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm focus:ring-4 focus:ring-primary-50 outline-none transition-all shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible no-shadow print:border-black print:rounded-none">
              <div className="overflow-x-visible">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-widest border-b border-slate-200 print:bg-slate-200 print:text-black">
                          {viewMode === 'status' ? (
                              <tr>
                                  <th onClick={() => requestSort('productName')} className="px-6 py-4 min-w-[200px] cursor-pointer hover:bg-slate-100 transition-colors">
                                      สินค้า <SortIcon columnKey="productName"/>
                                  </th>
                                  <th onClick={() => requestSort('earliestDue')} className="px-4 py-4 min-w-[120px] cursor-pointer hover:bg-slate-100 transition-colors">
                                      กำหนดส่งแรกสุด <SortIcon columnKey="earliestDue"/>
                                  </th>
                                  <th onClick={() => requestSort('totalDemand')} className="px-4 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                                      ยอดสั่งซื้อ <SortIcon columnKey="totalDemand"/>
                                  </th>
                                  <th onClick={() => requestSort('delivered')} className="px-4 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                                      ส่งแล้ว <SortIcon columnKey="delivered"/>
                                  </th>
                                  <th onClick={() => requestSort('stock')} className="px-4 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                                      สต๊อก <SortIcon columnKey="stock"/>
                                  </th>
                                  
                                  {/* Dynamic Process Columns */}
                                  {processColumns.map(col => (
                                      <th 
                                        key={col.key} 
                                        onClick={() => requestSort(col.key)}
                                        className={`px-4 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors ${col.color}`}
                                      >
                                          {col.label} <SortIcon columnKey={col.key}/>
                                      </th>
                                  ))}

                                  <th onClick={() => requestSort('netRequired')} className="px-6 py-4 text-right text-red-600 cursor-pointer hover:bg-slate-100 transition-colors">
                                      ต้องผลิตเพิ่ม <SortIcon columnKey="netRequired"/>
                                  </th>
                                  <th className="px-6 py-4 text-center print-hidden">Actions</th>
                              </tr>
                          ) : (
                              // --- PLANNING VIEW HEADER ---
                              <tr className="bg-indigo-50 text-indigo-800 print:bg-slate-200 print:text-black">
                                  <th className="px-6 py-4 min-w-[200px]">สินค้า (Product)</th>
                                  <th className="px-4 py-4 text-center text-rose-600">เร่งด่วน (Urgent Qty)</th>
                                  <th className="px-4 py-4 text-center">Cycle Time</th>
                                  <th className="px-4 py-4 text-center">กำลังผลิต/วัน (1 เครื่อง)</th>
                                  <th className="px-4 py-4 text-center">กำหนดเครื่อง (Machine Assign)</th>
                                  <th className="px-4 py-4 text-center text-indigo-700">ผลิตได้รวม/วัน</th>
                                  <th className="px-4 py-4 text-center text-rose-600">เวลาที่ต้องใช้ (Est. Days)</th>
                              </tr>
                          )}
                      </thead>
                      <tbody className="divide-y divide-slate-100 print:divide-black">
                          {planningData.map((row, idx) => {
                              // Filter out completed items in Planning View
                              if (viewMode === 'plan' && row.netRequired <= 0) return null;

                              return (
                                  <React.Fragment key={idx}>
                                      <tr 
                                        className={`hover:bg-slate-50 transition-colors cursor-pointer group ${expandedProduct === row.productName ? 'bg-slate-50' : ''}`}
                                        onClick={() => setExpandedProduct(expandedProduct === row.productName ? null : row.productName)}
                                      >
                                          {viewMode === 'status' ? (
                                              <>
                                                  <td className="px-6 py-4">
                                                      <div className="font-black text-slate-800 text-sm">{row.productName}</div>
                                                  </td>
                                                  <td className="px-4 py-4 text-slate-600 font-bold text-xs">{row.dateDisplay}</td>
                                                  <td className="px-4 py-4 text-right font-black text-slate-800">{row.totalDemand.toLocaleString()}</td>
                                                  <td className="px-4 py-4 text-center font-bold text-emerald-600">{row.delivered > 0 ? row.delivered.toLocaleString() : '-'}</td>
                                                  <td className="px-4 py-4 text-center font-bold text-emerald-600">{row.stock > 0 ? row.stock.toLocaleString() : '0'}</td>
                                                  
                                                  {/* WIP Columns */}
                                                  {processColumns.map(col => {
                                                      const qty = row.wipBreakdown[col.key];
                                                      return (
                                                          <td 
                                                            key={col.key} 
                                                            className={`px-4 py-4 text-center font-bold relative group/cell ${qty > 0 ? 'text-blue-600' : 'text-slate-300'}`}
                                                            onClick={(e) => handleCellClick(e, row.productName, col.key)}
                                                          >
                                                              <div className="hover:bg-blue-50 hover:text-blue-700 hover:scale-110 transition-all rounded py-1 cursor-pointer flex items-center justify-center gap-1">
                                                                  {qty > 0 ? qty.toLocaleString() : '-'}
                                                                  <Edit3 size={10} className="opacity-0 group-hover/cell:opacity-100 transition-opacity print-hidden"/>
                                                              </div>
                                                          </td>
                                                      );
                                                  })}

                                                  <td className="px-6 py-4 text-right">
                                                      <span className={`font-black text-base ${row.netRequired > 0 ? 'text-red-600' : 'text-green-500'}`}>
                                                          {row.netRequired > 0 ? row.netRequired.toLocaleString() : <CheckCircle2 size={18} className="ml-auto"/>}
                                                      </span>
                                                  </td>
                                                  <td className="px-6 py-4 text-center print-hidden">
                                                      <div className="flex items-center justify-center gap-2">
                                                          <button onClick={(e) => {e.stopPropagation(); setExpandedProduct(expandedProduct === row.productName ? null : row.productName);}} className="text-slate-400 hover:text-slate-600">
                                                              {expandedProduct === row.productName ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                                          </button>
                                                          {row.netRequired > 0 && (
                                                              <button 
                                                                onClick={(e) => {e.stopPropagation(); handleCreateProductionOrder(row.productName, row.netRequired);}}
                                                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all" 
                                                                title="ผลิตเพิ่ม"
                                                              >
                                                                  <Wrench size={14}/>
                                                              </button>
                                                          )}
                                                      </div>
                                                  </td>
                                              </>
                                          ) : (
                                              // --- PLANNING ROW (With Specific Machine Assignment) ---
                                              <>
                                                  <td className="px-6 py-4">
                                                      <div className="font-black text-slate-800 text-sm">{row.productName}</div>
                                                      <div className="text-[10px] text-slate-400 mt-1">Due: {row.dateDisplay}</div>
                                                  </td>
                                                  <td className="px-4 py-4 text-center">
                                                      <span className="font-black text-lg text-rose-600 bg-rose-50 px-2 py-1 rounded print:bg-transparent print:text-black print:border print:border-black">{row.netRequired.toLocaleString()}</span>
                                                  </td>
                                                  <td className="px-4 py-4 text-center text-xs text-slate-600">
                                                      <div className="font-bold">{row.cycleTime}s</div>
                                                      <div className="text-[10px] text-slate-400">Cavity: {row.cavity}</div>
                                                  </td>
                                                  <td className="px-4 py-4 text-center font-bold text-slate-500 text-xs">
                                                      {row.dailyCapacityPerMachine.toLocaleString()}
                                                  </td>
                                                  
                                                  {/* Machine Assignment Dropdown */}
                                                  <td className="px-4 py-4 text-center relative">
                                                      {/* Print View: Just Text */}
                                                      <div className="hidden print:block text-xs font-bold text-black">
                                                          {row.assignedList.length > 0 ? row.assignedList.join(', ') : `Auto (${row.machinesUsedCount} M/C)`}
                                                      </div>

                                                      {/* Screen View: Dropdown Selector */}
                                                      <div className="screen-machine-selector flex items-center justify-center">
                                                          <div className="relative">
                                                              <button 
                                                                onClick={(e) => { e.stopPropagation(); setOpenMachineSelector(openMachineSelector === row.productName ? null : row.productName); }}
                                                                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all ${row.assignedList.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                                                              >
                                                                  {row.assignedList.length > 0 
                                                                    ? <><Factory size={12}/> {row.assignedList.join(', ')}</> 
                                                                    : 'Auto (1 M/C)'
                                                                  }
                                                                  <ChevronDown size={12} className={`transition-transform ${openMachineSelector === row.productName ? 'rotate-180' : ''}`}/>
                                                              </button>

                                                              {/* Dropdown Menu */}
                                                              {openMachineSelector === row.productName && (
                                                                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95">
                                                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 mb-1">Select Machines</div>
                                                                      {factory_machines.map(m => {
                                                                          const isSelected = row.assignedList.includes(m.name);
                                                                          return (
                                                                              <div 
                                                                                key={m.id}
                                                                                onClick={(e) => { e.stopPropagation(); toggleMachineAssignment(row.productName, m.name); }}
                                                                                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-bold transition-all ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                                                              >
                                                                                  <div className="flex items-center gap-2">
                                                                                      <div className={`w-2 h-2 rounded-full ${m.status === 'ว่าง' || m.status === 'ทำงาน' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                                                      {m.name}
                                                                                  </div>
                                                                                  {isSelected ? <CheckSquare size={14}/> : <Square size={14} className="text-slate-300"/>}
                                                                              </div>
                                                                          );
                                                                      })}
                                                                  </div>
                                                              )}
                                                          </div>
                                                      </div>
                                                  </td>

                                                  <td className="px-4 py-4 text-center font-black text-indigo-700 text-base bg-indigo-50/50 print:bg-transparent print:text-black">
                                                      {row.totalDailyOutput.toLocaleString()}
                                                  </td>

                                                  <td className="px-4 py-4 text-center">
                                                      <div className="flex items-center justify-center gap-2">
                                                          <Timer size={14} className="text-rose-500 print-hidden"/>
                                                          <span className={`font-black text-base print:text-black ${row.daysToFinish > 7 ? 'text-rose-600' : 'text-green-600'}`}>
                                                              {row.daysToFinish.toFixed(1)} <span className="text-xs text-slate-400 print:text-black">days</span>
                                                          </span>
                                                      </div>
                                                  </td>
                                              </>
                                          )}
                                      </tr>
                                      
                                      {/* Expandable Order List */}
                                      {expandedProduct === row.productName && viewMode === 'status' && (
                                          <tr>
                                              <td colSpan={10 + processColumns.length} className="px-0 py-0 bg-slate-50/50">
                                                  <div className="p-4 pl-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                      {row.orders.map((order, oIdx) => (
                                                          <div key={oIdx} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex justify-between items-center">
                                                              <div>
                                                                  <span className="text-[10px] font-bold text-slate-400 block">PO Number</span>
                                                                  <span className="font-mono font-bold text-slate-700">{order.docNumber}</span>
                                                              </div>
                                                              <div className="text-right">
                                                                  <span className="text-[10px] font-bold text-slate-400 block">Due: {order.dueDate}</span>
                                                                  <span className="font-bold text-slate-800">{order.qty.toLocaleString()} pcs</span>
                                                              </div>
                                                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${order.status === 'Approved' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                                                  {order.status}
                                                              </span>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </td>
                                          </tr>
                                      )}
                                  </React.Fragment>
                              );
                          })}
                          
                          {planningData.length === 0 && (
                              <tr>
                                  <td colSpan={12} className="py-20 text-center text-slate-400">
                                      <Package size={48} className="mx-auto mb-4 opacity-20"/>
                                      <p className="font-bold">ไม่พบข้อมูลการผลิต</p>
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* --- ADJUSTMENT MODAL (Retain Existing) --- */}
      {adjustingProcess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200 print-hidden">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  {/* ... (Existing Modal Content) ... */}
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                              <Edit3 size={20} className="text-blue-600"/> แก้ไขยอด: {adjustingProcess.statusKey}
                          </h3>
                          <p className="text-sm font-bold text-slate-500 mt-1">{adjustingProcess.productName}</p>
                      </div>
                      <button onClick={() => setAdjustingProcess(null)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"><X size={24}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
                      <div className="space-y-3">
                          {adjustingProcess.logs.map((log, idx) => (
                              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                                      <div>
                                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1"><Calendar size={10} className="inline mr-1"/> Date</label>
                                          <input 
                                            type="date" 
                                            value={log.date} 
                                            onChange={(e) => handleUpdateLog(idx, 'date', e.target.value)}
                                            className="w-full text-xs font-bold border border-slate-200 rounded px-2 py-1 bg-slate-50"
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1"><Factory size={10} className="inline mr-1"/> Machine/Src</label>
                                          <input 
                                            type="text" 
                                            value={log.machine} 
                                            onChange={(e) => handleUpdateLog(idx, 'machine', e.target.value)}
                                            className="w-full text-xs font-bold border border-slate-200 rounded px-2 py-1"
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1"><User size={10} className="inline mr-1"/> Operator</label>
                                          <input 
                                            type="text" 
                                            value={log.operatorName} 
                                            onChange={(e) => handleUpdateLog(idx, 'operatorName', e.target.value)}
                                            className="w-full text-xs font-bold border border-slate-200 rounded px-2 py-1"
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-[9px] font-bold text-blue-500 uppercase mb-1">Quantity</label>
                                          <input 
                                            type="number" 
                                            value={log.quantityProduced} 
                                            onChange={(e) => handleUpdateLog(idx, 'quantityProduced', parseInt(e.target.value) || 0)}
                                            className="w-full text-lg font-black border border-blue-200 rounded px-2 py-1 text-right text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                          />
                                      </div>
                                  </div>
                                  <button onClick={() => handleDeleteLog(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                      <Trash2 size={18}/>
                                  </button>
                              </div>
                          ))}
                          
                          {adjustingProcess.logs.length === 0 && (
                              <div className="text-center py-10 text-slate-400 text-sm">ยังไม่มีรายการบันทึกในขั้นตอนนี้</div>
                          )}

                          <button 
                            onClick={handleAddLog}
                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 hover:border-slate-400 transition-all flex items-center justify-center gap-2 text-sm"
                          >
                              <Plus size={16}/> เพิ่มรายการใหม่ (Manual Add)
                          </button>
                      </div>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <div className="text-xs text-slate-500 font-bold">
                          Total: <span className="text-blue-600 text-lg font-black ml-1">{adjustingProcess.logs.reduce((sum, l) => sum + (l.quantityProduced || 0), 0).toLocaleString()}</span> units
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => setAdjustingProcess(null)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all text-sm">ยกเลิก</button>
                          <button onClick={handleSaveAdjustment} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-sm">
                              <Save size={16}/> บันทึกการเปลี่ยนแปลง
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Orders;
