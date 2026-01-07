
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    List, ChevronDown, User, Clock, 
    PlusCircle, ChevronRight, Play, 
    X, Save, MoreHorizontal,
    ArrowUpRight, Move, Edit3, Calendar, PauseCircle, CheckCircle2, Trash2, MonitorPlay,
    Factory, Settings, Power, Activity, AlertTriangle
} from 'lucide-react';
import { Machine, MoldingLog, ProductionDocumentItem } from '../types';
import SearchableSelect from '../components/SearchableSelect';

const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper interface for Queue Items derived from Production Docs
interface QueueItem extends ProductionDocumentItem {
    docId: string;
    docNumber: string;
    customerName: string;
    remainingQty: number;
    progress: number;
}

const Maintenance: React.FC<{ view: 'status' | 'maintenance' }> = ({ view }) => {
  const data = useFactoryData();
  const { 
      factory_machines = [], 
      molding_logs = [], 
      production_documents = [], 
      factory_products = [],
      packing_employees = [] 
  } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('th-TH'));
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Modals
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeLog, setActiveLog] = useState<MoldingLog | null>(null);
  
  // Job Management Modal State
  const [manageJob, setManageJob] = useState<MoldingLog | null>(null);
  const [targetMachineIdForTransfer, setTargetMachineIdForTransfer] = useState<string>('');

  // Machine Edit Modal State
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

  // Inputs for Quick Log
  const [logQty, setLogQty] = useState(0);
  const [rejectQty, setRejectQty] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('th-TH'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
      if (manageJob) {
          const currentM = factory_machines.find(m => m.name === manageJob.machine);
          setTargetMachineIdForTransfer(currentM?.id || '');
      }
  }, [manageJob, factory_machines]);

  // --- LOGIC: Derive Queue from Approved Production Documents ---
  const waitingJobs = useMemo(() => {
      const queue: QueueItem[] = [];

      production_documents.forEach(doc => {
          // Only consider Approved or In Progress documents
          if (doc.status !== 'Approved' && doc.status !== 'In Progress' && doc.status !== 'Material Checking') return;

          doc.items.forEach(item => {
              // Calculate how much has been produced for this specific item in this specific document
              const relevantLogs = molding_logs.filter(l => l.orderId === doc.id && l.productName === item.productName);
              const totalProduced = relevantLogs.reduce((sum, l) => sum + (l.quantityProduced || 0), 0);
              const remaining = Math.max(0, item.quantity - totalProduced);

              // If there is work left to do
              if (remaining > 0) {
                  queue.push({
                      ...item,
                      docId: doc.id,
                      docNumber: doc.docNumber,
                      customerName: doc.customerName,
                      remainingQty: remaining,
                      progress: (totalProduced / item.quantity) * 100
                  });
              }
          });
      });

      // Sort by Due Date
      return queue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [production_documents, molding_logs]);

  const idleMachines = useMemo(() => 
    factory_machines.filter(m => m.status === 'ว่าง' || m.status === 'Idle')
  , [factory_machines]);

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'ทำงาน': return { dot: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200', bg: 'bg-emerald-50' };
        case 'เสีย': return { dot: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-200', bg: 'bg-rose-50' };
        case 'เม็ดหมด': return { dot: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-200', bg: 'bg-amber-50' };
        case 'ทดสอบงาน': return { dot: 'bg-blue-400', text: 'text-blue-400', border: 'border-blue-200', bg: 'bg-blue-50' };
        default: return { dot: 'bg-slate-300', text: 'text-slate-400', border: 'border-slate-200', bg: 'bg-white' };
    }
  };

  // --- ACTIONS ---

  const handleAssignJob = async (machine: Machine, queueItem: QueueItem) => {
    const newLog: MoldingLog = {
        id: generateId(),
        jobId: `JOB-${queueItem.docNumber.replace('PO-', '')}-${Date.now().toString().slice(-4)}`,
        orderId: queueItem.docId,
        quantityRejected: 0,
        operatorName: '---ยังไม่ระบุ---',
        productName: queueItem.productName,
        shift: 'เช้า',
        lotNumber: queueItem.docNumber, // Using PO Number as Lot Reference
        date: new Date().toISOString().split('T')[0],
        status: 'กำลังผลิต',
        productId: queueItem.productId,
        machine: machine.name,
        quantityProduced: 0,
        targetQuantity: queueItem.remainingQty, // Default target is remaining amount
        startTime: new Date().toISOString(),
        priority: 10
    };

    const updatedMachines = factory_machines.map(m => 
        m.id === machine.id ? { ...m, status: 'ทำงาน' } : m
    );

    const updatedDocs = production_documents.map(d => 
        d.id === queueItem.docId && d.status === 'Approved' ? { ...d, status: 'In Progress' } : d
    );

    await updateData({ 
        ...data, 
        molding_logs: [...molding_logs, newLog],
        factory_machines: updatedMachines,
        production_documents: updatedDocs
    });
    setShowAssignModal(false);
  };

  const handleSaveProduction = async () => {
    if (!activeLog) return;

    const updatedLogs = molding_logs.map(l => {
        if (l.id === activeLog.id) {
            const newTotal = (l.quantityProduced || 0) + logQty;
            const isFinished = newTotal >= (l.targetQuantity || 0);
            return { 
                ...l, 
                quantityProduced: newTotal, 
                quantityRejected: (l.quantityRejected || 0) + rejectQty,
                status: isFinished ? 'รอนับ' : 'กำลังผลิต'
            };
        }
        return l;
    });

    const logCheck = updatedLogs.find(l => l.id === activeLog.id);
    let updatedMachines = factory_machines;
    if (logCheck && logCheck.status === 'รอนับ') {
        updatedMachines = factory_machines.map(m => 
            m.name === activeLog.machine ? { ...m, status: 'ว่าง' } : m
        );
    }

    await updateData({ ...data, molding_logs: updatedLogs, factory_machines: updatedMachines });
    setShowLogModal(false);
    setLogQty(0);
    setRejectQty(0);
  };

  // --- JOB MANAGE LOGIC ---

  const handleSaveJobChanges = async () => {
      if (!manageJob) return;

      let updatedLogs = molding_logs.map(l => l.id === manageJob.id ? manageJob : l);
      let updatedMachines = [...factory_machines];

      // Handle Transfer Logic
      const currentMachineObj = factory_machines.find(m => m.name === manageJob.machine);
      if (targetMachineIdForTransfer && currentMachineObj && targetMachineIdForTransfer !== currentMachineObj.id) {
          const targetMachine = factory_machines.find(m => m.id === targetMachineIdForTransfer);
          if (targetMachine) {
              // 1. Update Log Machine Name
              updatedLogs = updatedLogs.map(l => l.id === manageJob.id ? { ...l, machine: targetMachine.name } : l);
              // 2. Update Statuses
              updatedMachines = updatedMachines.map(m => {
                  if (m.id === currentMachineObj.id) return { ...m, status: 'ว่าง' };
                  if (m.id === targetMachine.id) return { ...m, status: 'ทำงาน' };
                  return m;
              });
          }
      }

      await updateData({ ...data, molding_logs: updatedLogs, factory_machines: updatedMachines });
      setManageJob(null);
  };

  const handleJobAction = async (action: 'Pause' | 'Finish' | 'Remove') => {
      if (!manageJob) return;
      if (!confirm(`ยืนยันการทำรายการ: ${action}?`)) return;

      let newStatus = manageJob.status;
      let machineStatus = 'ทำงาน';

      if (action === 'Pause') {
          newStatus = 'Stopped';
          machineStatus = 'ว่าง'; 
      } else if (action === 'Finish') {
          newStatus = 'รอนับ';
          machineStatus = 'ว่าง';
      } else if (action === 'Remove') {
          const updatedLogs = molding_logs.filter(l => l.id !== manageJob.id);
          const updatedMachines = factory_machines.map(m => m.name === manageJob.machine ? { ...m, status: 'ว่าง' } : m);
          await updateData({ ...data, molding_logs: updatedLogs, factory_machines: updatedMachines });
          setManageJob(null);
          return;
      }

      const updatedLogs = molding_logs.map(l => l.id === manageJob.id ? { ...l, status: newStatus } : l);
      const updatedMachines = factory_machines.map(m => m.name === manageJob.machine ? { ...m, status: machineStatus } : m);

      await updateData({ ...data, molding_logs: updatedLogs, factory_machines: updatedMachines });
      setManageJob(null);
  };

  // --- MACHINE MANAGE LOGIC ---
  const handleSaveMachine = async () => {
      if (!editingMachine) return;
      const updated = factory_machines.map(m => m.id === editingMachine.id ? editingMachine : m);
      await updateData({ ...data, factory_machines: updated });
      setEditingMachine(null);
  };

  const handleDeleteMachine = async (id: string) => {
      if (!confirm("Are you sure you want to delete this machine?")) return;
      const updated = factory_machines.filter(m => m.id !== id);
      await updateData({ ...data, factory_machines: updated });
      setEditingMachine(null);
  };

  const handleAddMachine = async () => {
      const newMachine: Machine = {
          id: generateId(),
          name: `Machine ${factory_machines.length + 1}`,
          location: 'Zone A',
          status: 'ว่าง',
          workingHoursPerDay: 18
      };
      await updateData({ ...data, factory_machines: [...factory_machines, newMachine] });
      setEditingMachine(newMachine);
  };

  const calculateTimeRemaining = (log: MoldingLog) => {
      const product = factory_products.find(p => p.name === log.productName);
      const cycleTime = product?.cycleTimeSeconds || 15;
      const remaining = (log.targetQuantity || 0) - (log.quantityProduced || 0);
      if (remaining <= 0) return "เสร็จสิ้น";
      
      const seconds = remaining * cycleTime;
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h} ชม. ${m} นาที`;
  };

  return (
    <div className="flex h-full gap-0 overflow-hidden -m-8 relative">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">สถานะเครื่องฉีด (Real-time)</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                        <Activity size={12}/> อัปเดตล่าสุด: {currentTime}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleAddMachine}
                        className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        <PlusCircle size={16}/> เพิ่มเครื่องจักร
                    </button>
                    {!isSidebarOpen && (
                        <button onClick={() => setIsSidebarOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-lg">
                            <List size={16} /> แสดงคิวงาน ({waitingJobs.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Machine Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {factory_machines.map((m) => {
                    const activeJob = molding_logs.find(l => l.machine === m.name && l.status === 'กำลังผลิต');
                    const statusStyle = getStatusColor(m.status);
                    const progress = activeJob ? Math.min((activeJob.quantityProduced / (activeJob.targetQuantity || 1)) * 100, 100) : 0;

                    return (
                        <div key={m.id} className={`rounded-[1.5rem] shadow-sm border flex flex-col overflow-hidden transition-all relative group ${activeJob ? 'bg-white border-slate-200' : 'bg-slate-50/50 border-dashed border-slate-300'}`}>
                            {/* Machine Header */}
                            <div className="p-6 flex-1 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${statusStyle.dot} animate-pulse`}></div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800">{m.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold">{m.location}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => setEditingMachine(m)}
                                            className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                        >
                                            <Settings size={14}/>
                                        </button>
                                        <div className="relative inline-block text-left group/status">
                                            <button className={`flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition-all border ${statusStyle.bg} ${statusStyle.border}`}>
                                                <span className={`text-[10px] font-black uppercase ${statusStyle.text}`}>{m.status}</span>
                                            </button>
                                            <div className="hidden group-hover/status:block absolute right-0 mt-1 w-32 bg-white border border-slate-100 rounded-xl shadow-xl z-20 py-2">
                                                {['ทำงาน', 'ว่าง', 'เสีย', 'เม็ดหมด', 'ทดสอบงาน'].map(s => (
                                                    <button key={s} onClick={() => {
                                                        const updated = factory_machines.map(mac => mac.id === m.id ? { ...mac, status: s } : mac);
                                                        updateData({ ...data, factory_machines: updated });
                                                    }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-slate-50 text-slate-600">
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {activeJob ? (
                                    <div className="space-y-4 cursor-pointer relative" onClick={() => setManageJob(activeJob)}>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                    <Activity size={10} className="text-emerald-500"/> กำลังผลิต
                                                </div>
                                                <button onClick={(e) => {e.stopPropagation(); setManageJob(activeJob);}} className="text-[10px] font-bold text-blue-600 hover:underline">จัดการ</button>
                                            </div>
                                            <div className="text-sm font-black text-slate-800 line-clamp-1">{activeJob.productName}</div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">PO: {activeJob.lotNumber}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-end text-[11px] font-black">
                                                <span className="text-slate-600">{activeJob.quantityProduced.toLocaleString()} / {(activeJob.targetQuantity || 0).toLocaleString()}</span>
                                                <span className="text-blue-600">{progress.toFixed(1)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                                                <User size={12} /> <span className="truncate">{activeJob.operatorName}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold justify-end">
                                                <Clock size={12} /> <span>{calculateTimeRemaining(activeJob)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-32 flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                                        <MonitorPlay size={40} className="text-slate-400"/>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ready for Job</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions Footer */}
                            <div className="p-4 bg-slate-50/50 border-t border-slate-100 space-y-2">
                                {activeJob ? (
                                    <button 
                                        onClick={() => { setActiveLog(activeJob); setShowLogModal(true); }}
                                        className="w-full bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <PlusCircle size={16} /> บันทึกยอดผลิต
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => { setSelectedMachine(m); setShowAssignModal(true); }}
                                        className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Play size={16} /> ป้อนงานเข้าเครื่อง
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Collapsible Right Sidebar: Waiting Queue */}
      <div 
        className={`bg-white border-l border-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-20 absolute right-0 top-0 bottom-0 h-full shadow-2xl
        ${isSidebarOpen ? 'translate-x-0 w-[380px]' : 'translate-x-full w-0 opacity-0 pointer-events-none'}`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
                <h3 className="text-lg font-black text-slate-800">คิวรอฉีด ({waitingJobs.length})</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Approved Orders</p>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <ChevronRight size={20} />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/30">
            {waitingJobs.map((job) => (
                <div key={`${job.docId}-${job.id}`} onClick={() => { 
                    if (!isSidebarOpen) return;
                    const idleMachine = factory_machines.find(m => m.status === 'ว่าง');
                    if(idleMachine) handleAssignJob(idleMachine, job);
                    else alert("ไม่มีเครื่องจักรว่าง กรุณาเลือกเครื่องจักรด้วยตนเอง");
                }} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:w-1.5 transition-all"></div>
                    <div className="flex justify-between items-start mb-2">
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold text-[10px] uppercase border border-slate-200">PO: {job.docNumber}</span>
                        {job.progress > 0 && <span className="text-[10px] text-blue-600 font-bold">{job.progress.toFixed(0)}% Done</span>}
                    </div>
                    <h4 className="font-black text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors mb-3">{job.productName}</h4>
                    
                    <div className="flex items-center gap-2 text-[11px] font-mono mb-1">
                        <span className="text-slate-400 font-bold">เหลือผลิต:</span>
                        <span className="text-rose-600 font-black text-sm">{job.remainingQty.toLocaleString()}</span>
                        <span className="text-slate-400 font-bold">/ {job.quantity.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                        <div className="flex flex-col">
                            <span className="text-slate-400 text-[9px] font-bold uppercase">Customer</span>
                            <span className="text-[10px] font-bold text-slate-700 truncate max-w-[150px]">{job.customerName || '-'}</span>
                        </div>
                        <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-bold bg-blue-50 px-2 py-1 rounded-lg">Assign <ArrowUpRight size={12}/></span>
                    </div>
                </div>
            ))}
            {waitingJobs.length === 0 && (
                <div className="text-center py-20 text-slate-400">
                    <Factory size={40} className="mx-auto mb-4 opacity-20"/>
                    <p className="text-sm font-bold text-slate-600">ไม่มีงานค้าง</p>
                    <p className="text-xs mt-1">ใบสั่งผลิตทั้งหมดถูกจ่ายงานแล้ว หรือยังไม่ได้รับการอนุมัติ</p>
                </div>
            )}
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* 1. MACHINE EDIT MODAL */}
      {editingMachine && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-black text-slate-800">Edit Machine</h3>
                      <button onClick={() => setEditingMachine(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Machine Name</label>
                          <input type="text" value={editingMachine.name} onChange={e => setEditingMachine({...editingMachine, name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Location / Zone</label>
                          <input type="text" value={editingMachine.location} onChange={e => setEditingMachine({...editingMachine, location: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Status</label>
                          <select value={editingMachine.status} onChange={e => setEditingMachine({...editingMachine, status: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 bg-white">
                              <option value="ว่าง">ว่าง (Idle)</option>
                              <option value="ทำงาน">ทำงาน (Working)</option>
                              <option value="เสีย">เสีย (Broken)</option>
                              <option value="Maintenance">Maintenance</option>
                          </select>
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
                      <button onClick={() => handleDeleteMachine(editingMachine.id)} className="p-3 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-all"><Trash2 size={18}/></button>
                      <button onClick={handleSaveMachine} className="flex-1 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all">Save Changes</button>
                  </div>
              </div>
          </div>
      )}

      {/* 2. JOB MANAGE MODAL */}
      {manageJob && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  {/* Header */}
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">จัดการงานสำหรับ {manageJob.machine}</h3>
                      <button onClick={() => setManageJob(null)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><X size={24}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 bg-white">
                      {/* Product & Progress Header */}
                      <div>
                          <h4 className="text-xl font-black text-blue-600 mb-3">{manageJob.productName}</h4>
                          <div className="flex justify-between items-end text-sm font-bold text-slate-600 mb-2">
                              <span className="font-mono">{manageJob.quantityProduced.toLocaleString()} / {(manageJob.targetQuantity || 0).toLocaleString()}</span>
                              <span className="text-blue-600">{((manageJob.quantityProduced / (manageJob.targetQuantity || 1)) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(((manageJob.quantityProduced / (manageJob.targetQuantity || 1)) * 100), 100)}%` }}></div>
                          </div>
                      </div>

                      {/* Main Form Grid */}
                      <div className="space-y-5">
                          {/* Operator */}
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ผู้ควบคุมเครื่อง</label>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select 
                                    value={manageJob.operatorName} 
                                    onChange={(e) => setManageJob({...manageJob, operatorName: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                >
                                    <option value="">---ว่าง---</option>
                                    {packing_employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                              </div>
                          </div>

                          {/* Quantities Row */}
                          <div className="grid grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">จำนวนเป้าหมาย (ชิ้น)</label>
                                  <input 
                                    type="number" 
                                    value={manageJob.targetQuantity} 
                                    onChange={(e) => setManageJob({...manageJob, targetQuantity: parseInt(e.target.value) || 0})}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl font-black text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">จำนวนที่ผลิตแล้ว</label>
                                  <input 
                                    type="number" 
                                    value={manageJob.quantityProduced} 
                                    onChange={(e) => setManageJob({...manageJob, quantityProduced: parseInt(e.target.value) || 0})}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl font-black text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                                  />
                              </div>
                          </div>

                          {/* Lot Number */}
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lot Number / PO</label>
                              <input 
                                type="text" 
                                value={manageJob.lotNumber} 
                                onChange={(e) => setManageJob({...manageJob, lotNumber: e.target.value})}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>

                          {/* Time */}
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">เวลาเริ่มเดินเครื่อง</label>
                              <div className="relative">
                                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                  <input 
                                    type="datetime-local" 
                                    value={manageJob.startTime ? new Date(manageJob.startTime).toISOString().slice(0, 16) : ''}
                                    onChange={(e) => setManageJob({...manageJob, startTime: new Date(e.target.value).toISOString()})}
                                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                              </div>
                          </div>

                          {/* Transfer Section */}
                          <div className="pt-4 border-t border-slate-100 bg-blue-50/50 p-4 rounded-xl">
                              <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Move size={12}/> ย้ายไปเครื่องจักรอื่น (Transfer Job)</label>
                              <div className="relative">
                                  <select 
                                    value={targetMachineIdForTransfer}
                                    onChange={(e) => setTargetMachineIdForTransfer(e.target.value)}
                                    className="w-full pl-4 pr-10 py-3 border border-blue-200 rounded-xl font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                  >
                                      {factory_machines.find(m => m.name === manageJob.machine) && (
                                          <option value={factory_machines.find(m => m.name === manageJob.machine)?.id}>
                                              {manageJob.machine} (เครื่องปัจจุบัน)
                                          </option>
                                      )}
                                      {idleMachines.map(m => (
                                          <option key={m.id} value={m.id}>{m.name} (ว่าง)</option>
                                      ))}
                                  </select>
                                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                              </div>
                          </div>

                          {/* Action Buttons */}
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Actions</label>
                              <div className="flex flex-wrap gap-3">
                                  <button onClick={() => handleJobAction('Pause')} className="flex-1 min-w-[120px] bg-amber-400 text-amber-900 py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-amber-500 transition-colors shadow-sm">
                                      <PauseCircle size={18}/> พักงาน
                                  </button>
                                  <button onClick={() => handleJobAction('Finish')} className="flex-1 min-w-[120px] bg-emerald-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors shadow-sm">
                                      <CheckCircle2 size={18}/> จบงานนี้
                                  </button>
                                  <button onClick={() => handleJobAction('Remove')} className="flex-1 min-w-[120px] bg-rose-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-rose-600 transition-colors shadow-sm">
                                      <Trash2 size={18}/> ลบออก
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <button onClick={() => setManageJob(null)} className="px-8 py-3.5 border border-slate-300 rounded-xl font-bold text-slate-500 hover:bg-white transition-all text-sm">
                          ยกเลิก
                      </button>
                      <button onClick={handleSaveJobChanges} className="px-10 py-3.5 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all text-sm active:scale-95">
                          บันทึกการเปลี่ยนแปลง
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 3. LOG PRODUCTION MODAL */}
      {showLogModal && activeLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">บันทึกยอดผลิต: {activeLog.machine}</h3>
                      <button onClick={() => setShowLogModal(false)} className="p-2 text-slate-300 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">จำนวนของดี (Pcs)</label>
                          <input type="number" value={logQty || ''} onChange={e => setLogQty(parseInt(e.target.value) || 0)} className="w-full px-6 py-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl text-2xl font-black text-emerald-700 focus:ring-4 focus:ring-emerald-50 outline-none" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">จำนวนของเสีย (Reject)</label>
                          <input type="number" value={rejectQty || ''} onChange={e => setRejectQty(parseInt(e.target.value) || 0)} className="w-full px-6 py-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-xl font-black text-rose-700 focus:ring-4 focus:ring-rose-50 outline-none" />
                      </div>
                  </div>
                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                      <button onClick={() => setShowLogModal(false)} className="flex-1 py-4 font-black text-slate-400 uppercase text-xs">ยกเลิก</button>
                      <button onClick={handleSaveProduction} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-xs">
                         <Save size={18}/> บันทึกข้อมูล
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 4. ASSIGN JOB MODAL */}
      {showAssignModal && selectedMachine && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">มอบหมายงาน: {selectedMachine.name}</h3>
                      <button onClick={() => setShowAssignModal(false)} className="p-2 text-slate-300 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="p-8 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
                      {waitingJobs.map(job => (
                          <button 
                            key={`${job.docId}-${job.id}`} 
                            onClick={() => handleAssignJob(selectedMachine, job)}
                            className="w-full text-left p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-between group"
                          >
                              <div>
                                  <div className="font-black text-slate-800 text-sm">{job.productName}</div>
                                  <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">PO: {job.docNumber} | {job.remainingQty.toLocaleString()} Pcs</div>
                              </div>
                              <ArrowUpRight className="text-slate-300 group-hover:text-blue-500" size={20}/>
                          </button>
                      ))}
                      {waitingJobs.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">ไม่มีงานรอในคิว</p>}
                  </div>
                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button onClick={() => setShowAssignModal(false)} className="px-8 py-3 font-black text-slate-400 uppercase text-xs">ปิด</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Maintenance;
