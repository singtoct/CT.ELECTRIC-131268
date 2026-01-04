
import React, { useState, useMemo, useEffect } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    RefreshCcw, List, ChevronDown, User, Clock, 
    PlusCircle, ChevronRight, AlertCircle, Play, 
    CheckCircle2, Settings, History, X, Save,
    ArrowUpRight
} from 'lucide-react';
import { Machine, MoldingLog, PackingOrder, Product } from '../types';

const Maintenance: React.FC<{ view: 'status' | 'maintenance' }> = ({ view }) => {
  const data = useFactoryData();
  const { factory_machines = [], molding_logs = [], packing_orders = [], factory_products = [] } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('th-TH'));
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeLog, setActiveLog] = useState<MoldingLog | null>(null);

  // For Log Modal Inputs
  const [logQty, setLogQty] = useState(0);
  const [rejectQty, setRejectQty] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('th-TH'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const waitingJobs = useMemo(() => 
    packing_orders.filter(o => o.status === 'Open' || o.status === 'In Progress')
  , [packing_orders]);

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'ทำงาน': return { dot: 'bg-emerald-500', text: 'text-emerald-500' };
        case 'เสีย': return { dot: 'bg-rose-500', text: 'text-rose-500' };
        case 'เม็ดหมด': return { dot: 'bg-slate-400', text: 'text-slate-400' };
        case 'ทดสอบงาน': return { dot: 'bg-blue-400', text: 'text-blue-400' };
        default: return { dot: 'bg-amber-500', text: 'text-amber-500' };
    }
  };

  const handleStatusChange = async (machineId: string, newStatus: string) => {
    const updatedMachines = factory_machines.map(m => 
      m.id === machineId ? { ...m, status: newStatus } : m
    );
    await updateData({ ...data, factory_machines: updatedMachines });
  };

  const handleAssignJob = async (machine: Machine, order: PackingOrder) => {
    const newLog: MoldingLog = {
        id: Math.random().toString(36).substr(2, 9),
        jobId: `JOB-${order.lotNumber || 'TEMP'}-${Date.now().toString().slice(-4)}`,
        orderId: order.id,
        quantityRejected: 0,
        operatorName: '---ยังไม่ระบุ---',
        productName: order.name,
        shift: 'เช้า',
        lotNumber: order.lotNumber || '-',
        date: new Date().toISOString().split('T')[0],
        status: 'กำลังผลิต',
        productId: '',
        machine: machine.name,
        quantityProduced: 0,
        targetQuantity: order.quantity,
        startTime: new Date().toISOString()
    };

    const updatedMachines = factory_machines.map(m => 
        m.id === machine.id ? { ...m, status: 'ทำงาน' } : m
    );

    const updatedOrders = packing_orders.map(o => 
        o.id === order.id ? { ...o, status: 'In Progress' } : o
    );

    await updateData({ 
        ...data, 
        molding_logs: [...molding_logs, newLog],
        factory_machines: updatedMachines,
        packing_orders: updatedOrders
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

    // If finished, free the machine
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

  const calculateTimeRemaining = (log: MoldingLog) => {
      const product = factory_products.find(p => p.name === log.productName);
      const cycleTime = product?.cycleTimeSeconds || 15;
      const remaining = (log.targetQuantity || 0) - (log.quantityProduced || 0);
      if (remaining <= 0) return "เสร็จสิ้น";
      
      const seconds = remaining * cycleTime;
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}h ${m}m`;
  };

  return (
    <div className="flex h-full gap-6 overflow-hidden -m-8">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">สถานะเครื่องฉีด (Real-time)</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">อัปเดตล่าสุด: {currentTime}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                        <RefreshCcw size={16} /> รีเฟรช
                    </button>
                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
                        <List size={16} /> รายการรอฉีด ({waitingJobs.length})
                    </button>
                </div>
            </div>

            {/* Machine Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {factory_machines.map((m) => {
                    const activeJob = molding_logs.find(l => l.machine === m.name && l.status === 'กำลังผลิต');
                    const statusStyle = getStatusColor(m.status);
                    const progress = activeJob ? Math.min((activeJob.quantityProduced / (activeJob.targetQuantity || 1)) * 100, 100) : 0;

                    return (
                        <div key={m.id} className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="p-6 flex-1 space-y-6">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-black text-slate-800">{m.name}</h3>
                                    <div className="relative inline-block text-left group/status">
                                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 cursor-pointer hover:bg-slate-100 transition-all">
                                            <div className={`w-2 h-2 rounded-full ${statusStyle.dot}`}></div>
                                            <span className={`text-[11px] font-black uppercase ${statusStyle.text}`}>{m.status}</span>
                                            <ChevronDown size={12} className="text-slate-400" />
                                        </div>
                                        <div className="hidden group-hover/status:block absolute right-0 mt-1 w-32 bg-white border border-slate-100 rounded-xl shadow-xl z-10 py-2">
                                            {['ทำงาน', 'ว่าง', 'เสีย', 'เม็ดหมด', 'ทดสอบงาน'].map(s => (
                                                <button key={s} onClick={() => handleStatusChange(m.id, s)} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-slate-50 text-slate-600">
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {activeJob ? (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">งานปัจจุบัน</div>
                                            <div className="text-sm font-black text-blue-600 line-clamp-1">{activeJob.productName}</div>
                                            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                                                <span>Lot:</span>
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{activeJob.lotNumber}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-end text-[11px] font-black">
                                                <span className="text-slate-800">{activeJob.quantityProduced.toLocaleString()} / {(activeJob.targetQuantity || 0).toLocaleString()}</span>
                                                <span className="text-blue-600">{progress.toFixed(1)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold">
                                                <User size={14} /> <span className="text-slate-600 truncate">{activeJob.operatorName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold justify-end">
                                                <Clock size={12} /> <span>{calculateTimeRemaining(activeJob)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-center space-y-2">
                                        <p className="text-slate-300 font-black italic text-xs uppercase tracking-widest">No Active Job</p>
                                        <p className="text-[10px] text-slate-400 font-bold">พร้อมรับงานใหม่</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-slate-50/50 border-t border-slate-100 space-y-2">
                                {activeJob ? (
                                    <button 
                                        onClick={() => { setActiveLog(activeJob); setShowLogModal(true); }}
                                        className="w-full bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-md shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <PlusCircle size={16} /> บันทึกผลผลิต
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => { setSelectedMachine(m); setShowAssignModal(true); }}
                                        className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-md shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Play size={16} /> เริ่มงาน
                                    </button>
                                )}
                                <button className="w-full py-2 bg-white border border-slate-200 text-slate-500 text-[11px] font-bold rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors">
                                    <Settings size={14} /> ดูคิวทั้งหมด
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Right Sidebar: Waiting Queue */}
      <div className="w-[380px] bg-white border-l border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h3 className="text-lg font-black text-slate-800">รายการรอฉีด ({waitingJobs.length})</h3>
            <ChevronRight size={20} className="text-slate-300" />
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {waitingJobs.map((job) => (
                <div key={job.id} onClick={() => { 
                    const idleMachine = factory_machines.find(m => m.status === 'ว่าง');
                    if(idleMachine) handleAssignJob(idleMachine, job);
                    else alert("ไม่มีเครื่องจักรว่าง กรุณาเลือกเครื่องจักรด้วยตนเอง");
                }} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-blue-200 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-3">
                        <h4 className="font-black text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors">{job.name}</h4>
                        <span className="text-slate-300 group-hover:text-blue-300 transition-colors"><ChevronRight size={16}/></span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono mb-2">
                        <span className="text-slate-400 uppercase">Lot:</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">{job.lotNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-rose-600 font-black text-xs">รอฉีด: {job.quantity.toLocaleString()} ชิ้น</span>
                        <span className="text-slate-400 text-[10px] font-bold italic">{job.dueDate}</span>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Log Production Modal */}
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

      {/* Assign Job Modal */}
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
                            key={job.id} 
                            onClick={() => handleAssignJob(selectedMachine, job)}
                            className="w-full text-left p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-between group"
                          >
                              <div>
                                  <div className="font-black text-slate-800 text-sm">{job.name}</div>
                                  <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Lot: {job.lotNumber} | {job.quantity.toLocaleString()} Pcs</div>
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
