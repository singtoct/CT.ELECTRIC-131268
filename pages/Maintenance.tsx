import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Activity, Power, Settings, Plus, X, ArrowRight, Play, Clock, User, ClipboardList, CheckCircle2
} from 'lucide-react';
import { Machine, MoldingLog } from '../types';

const Maintenance: React.FC<{ view: 'status' | 'maintenance' }> = ({ view }) => {
  const data = useFactoryData();
  const { factory_machines = [], molding_logs = [], packing_employees = [] } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const waitingQueue = useMemo(() => 
    molding_logs.filter(log => log.status === 'รอฉีด' && (log.machine === 'ยังไม่ระบุ' || !log.machine)),
    [molding_logs]
  );

  const handleAssignJob = async (machine: Machine, log: MoldingLog, operator: string) => {
    const updatedLogs = molding_logs.map(l => l.id === log.id ? { 
        ...l, machine: machine.name, status: 'กำลังผลิต', operatorName: operator, startTime: new Date().toISOString()
    } : l);
    const updatedMachines = factory_machines.map(m => m.id === machine.id ? { ...m, status: 'ทำงาน' } : m);
    await updateData({ ...data, molding_logs: updatedLogs, factory_machines: updatedMachines });
    setShowAssignModal(false);
    setSelectedMachine(null);
  };

  return (
    <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">{t('nav.machineStatus')}</h2>
            <div className="flex gap-2">
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Running
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Idle
                </span>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {factory_machines.map((m) => {
                const activeLog = molding_logs.find(l => l.machine === m.name && l.status === 'กำลังผลิต');
                return (
                    <div key={m.id} className={`bg-white rounded-xl shadow-sm border p-4 md:p-5 transition-all
                        ${m.status === 'ทำงาน' ? 'border-green-200 bg-green-50/10' : 'border-slate-200'}
                    `}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800">{m.name}</h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.status === 'ทำงาน' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                {m.status}
                            </span>
                        </div>
                        <div className="min-h-[100px] flex flex-col justify-center border-y border-slate-50 py-4 my-2">
                            {activeLog ? (
                                <div className="space-y-2">
                                    <div className="text-[10px] font-bold text-primary-600 truncate">{activeLog.jobId}</div>
                                    <div className="text-sm font-medium text-slate-700 line-clamp-1">{activeLog.productName}</div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <User size={12}/> {activeLog.operatorName}
                                    </div>
                                    <div className="mt-2">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                            <span>{activeLog.quantityProduced.toLocaleString()} pcs</span>
                                            <span>{activeLog.targetQuantity?.toLocaleString()} pcs</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary-500" style={{width: `${(activeLog.quantityProduced / (activeLog.targetQuantity || 1))*100}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-slate-300 italic text-sm mb-2">No Active Job</p>
                                    <button 
                                        onClick={() => { setSelectedMachine(m); setShowAssignModal(true); }}
                                        className="px-3 py-1 bg-primary-50 text-primary-600 text-xs font-bold rounded-full border border-primary-100 hover:bg-primary-100 transition-all"
                                    >
                                        + Assign
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button className="flex-1 py-1.5 bg-slate-50 text-slate-600 text-[10px] font-bold rounded border border-slate-200">History</button>
                            <button className="p-1.5 bg-slate-50 text-slate-400 rounded border border-slate-200"><Settings size={14}/></button>
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <ClipboardList className="text-primary-600" size={18}/>
                  <h3 className="font-bold text-sm text-slate-700">รายการรอมอบหมาย (Job Queue)</h3>
                </div>
                <span className="w-fit bg-primary-100 text-primary-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{waitingQueue.length} jobs in queue</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-400 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3">Job ID</th>
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3 text-right">Target</th>
                            <th className="px-6 py-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {waitingQueue.map(job => (
                            <tr key={job.id}>
                                <td className="px-6 py-4 font-mono text-primary-600 font-bold">{job.jobId}</td>
                                <td className="px-6 py-4 truncate max-w-[150px]">{job.productName}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold">{job.targetQuantity?.toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => { setSelectedMachine(factory_machines[0]); setShowAssignModal(true); }}
                                        className="bg-primary-50 text-primary-600 px-3 py-1 rounded-md font-bold text-[10px] hover:bg-primary-100"
                                    >
                                        Assign
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {showAssignModal && (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-300">
                    <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">มอบหมายงานผลิต</h3>
                        <button onClick={() => setShowAssignModal(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full"><X/></button>
                    </div>
                    <div className="p-4 md:p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">เลือกเครื่องจักร</label>
                            <div className="grid grid-cols-2 gap-2">
                                {factory_machines.filter(m => m.status === 'ว่าง').map(m => (
                                    <button 
                                        key={m.id} 
                                        onClick={() => setSelectedMachine(m)}
                                        className={`p-3 rounded-xl border text-left transition-all ${selectedMachine?.id === m.id ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className="font-bold text-sm text-slate-800">{m.name}</div>
                                        <div className="text-[10px] text-slate-500">{m.location}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">เลือกงาน</label>
                            <select className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none">
                                {waitingQueue.map(job => (
                                    <option key={job.id} value={job.id}>{job.jobId} - {job.productName}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">พนักงาน</label>
                            <select id="operator-select-mobile" className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white text-slate-900">
                                {packing_employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="p-4 md:p-6 bg-slate-50 flex flex-col sm:flex-row gap-3">
                        <button onClick={() => setShowAssignModal(false)} className="order-2 sm:order-1 flex-1 py-3 font-bold text-slate-500 bg-white border border-slate-200 rounded-xl">ยกเลิก</button>
                        <button 
                            onClick={() => {
                                const select = document.querySelector('select') as HTMLSelectElement;
                                const opSelect = document.getElementById('operator-select-mobile') as HTMLSelectElement;
                                const log = waitingQueue.find(l => l.id === select.value);
                                if (selectedMachine && log) handleAssignJob(selectedMachine, log, opSelect.value);
                            }}
                            className="order-1 sm:order-2 flex-1 py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-200 active:scale-95 transition-all"
                        >
                            เริ่มงาน
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Maintenance;