import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Wrench, Activity, AlertTriangle, Power, Play, Pause, 
    MoreHorizontal, Settings, Box, User, Clock, CheckCircle2, 
    Plus, X, Save, AlertCircle, BarChart3, Gauge, ChevronDown,
    Calendar, Hash, MoveRight, Trash2, PauseCircle, PlayCircle
} from 'lucide-react';
import { Machine, MoldingLog, PackingOrder } from '../types';

interface MaintenanceProps {
    view: 'status' | 'maintenance';
}

// --- Types for Local State ---
type ModalType = 'ASSIGN_JOB' | 'MANAGE_JOB' | 'CHANGE_STATUS' | null;

const Maintenance: React.FC<MaintenanceProps> = ({ view }) => {
  const factoryData = useFactoryData(); // Get full data object once
  const { factory_machines, molding_logs, packing_orders, packing_employees } = factoryData;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();

  // --- State ---
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [formData, setFormData] = useState<any>({});

  // --- Helpers for Status ---
  const getNormalizedStatus = (status: string) => {
      if (['ทำงาน', 'Working', 'Running'].includes(status)) return 'running';
      if (['เสีย', 'Error', 'Breakdown'].includes(status)) return 'error';
      if (['กำลังซ่อม', 'Maintenance'].includes(status)) return 'maintenance';
      return 'idle';
  };

  const getStatusLabel = (status: string) => {
      const normalized = getNormalizedStatus(status);
      switch (normalized) {
          case 'running': return t('mach.running');
          case 'error': return t('mach.error');
          case 'maintenance': return t('mach.maintenance');
          default: return t('mach.idle');
      }
  };

  // --- Derived Data ---
  const machineStatusMap = useMemo(() => {
    return factory_machines.map(machine => {
        const activeLog = molding_logs?.find(l => 
            l.machine === machine.name && 
            ['In Progress', 'Working', 'ทำงาน', 'Running', 'Paused', 'Stopped'].includes(l.status)
        );
        const associatedOrder = activeLog ? packing_orders?.find(o => o.id === activeLog.orderId) : null;
        
        // Use Log's targetQuantity if available, otherwise Order's
        const target = activeLog?.targetQuantity || associatedOrder?.quantity || 0;
        const current = activeLog ? activeLog.quantityProduced : 0;
        const progress = target > 0 ? (current / target) * 100 : 0;
        const oee = activeLog ? (Math.random() * (98 - 75) + 75).toFixed(1) : 0;
        const normalizedStatus = getNormalizedStatus(machine.status);

        return {
            ...machine,
            activeLog,
            associatedOrder,
            progress,
            oee,
            normalizedStatus,
            isOnline: normalizedStatus === 'running'
        };
    });
  }, [factory_machines, molding_logs, packing_orders]);

  // --- Actions ---

  const handleOpenModal = (machine: Machine, type: ModalType) => {
      setSelectedMachine(machine);
      setModalType(type);
      
      if (type === 'ASSIGN_JOB') {
          setFormData({ orderId: '', operator: '' });
      } 
      else if (type === 'MANAGE_JOB') {
          // Find the active log to pre-fill
          const activeMachineData = machineStatusMap.find(m => m.id === machine.id);
          const log = activeMachineData?.activeLog;
          const order = activeMachineData?.associatedOrder;

          if (log) {
            setFormData({
                logId: log.id,
                productName: log.productName,
                lotNumber: log.lotNumber,
                operator: log.operatorName,
                quantityProduced: log.quantityProduced,
                targetQuantity: log.targetQuantity || order?.quantity || 0,
                priority: log.priority || 10,
                startTime: log.startTime || `${log.date} 08:00`,
                status: log.status,
                moveToMachine: '' // For transfer logic
            });
          }
      } 
      else if (type === 'CHANGE_STATUS') {
          setFormData({ status: machine.status });
      }
  };

  const handleCloseModal = () => {
      setSelectedMachine(null);
      setModalType(null);
      setFormData({});
  };

  const handleSubmit = async () => {
      if (!selectedMachine) return;

      const newMoldingLogs = [...(molding_logs || [])];
      const newMachines = [...factory_machines];
      
      const machineIndex = newMachines.findIndex(m => m.id === selectedMachine.id);
      if (machineIndex === -1) return;

      // 1. Assign Job Logic
      if (modalType === 'ASSIGN_JOB') {
          const order = packing_orders.find(o => o.id === formData.orderId);
          if (!order) return;

          const newLog: MoldingLog = {
              id: Math.random().toString(36).substr(2, 9),
              date: new Date().toISOString().split('T')[0],
              machine: selectedMachine.name,
              status: 'In Progress',
              jobId: `JOB-${Math.floor(Math.random()*10000)}`,
              orderId: order.id,
              productName: order.name,
              lotNumber: order.lotNumber || 'N/A',
              quantityProduced: 0,
              quantityRejected: 0,
              operatorName: formData.operator || 'Unknown',
              shift: 'Day',
              productId: '',
              startTime: new Date().toLocaleString('sv-SE').slice(0, 16).replace('T', ' '), // Current Time YYYY-MM-DD HH:mm
              targetQuantity: order.quantity,
              priority: 10
          };
          newMoldingLogs.push(newLog);
          newMachines[machineIndex] = { ...newMachines[machineIndex], status: 'ทำงาน' };
      } 
      
      // 2. Manage Job Logic (Detailed Edit)
      else if (modalType === 'MANAGE_JOB') {
          const logIndex = newMoldingLogs.findIndex(l => l.id === formData.logId);
          if (logIndex >= 0) {
              const currentLog = newMoldingLogs[logIndex];
              
              // Handle Machine Transfer
              let machineName = currentLog.machine;
              if (formData.moveToMachine && formData.moveToMachine !== currentLog.machine) {
                  // 1. Free up current machine
                  newMachines[machineIndex] = { ...newMachines[machineIndex], status: 'ว่าง' };
                  
                  // 2. Occupy new machine
                  const newMachineIndex = newMachines.findIndex(m => m.name === formData.moveToMachine);
                  if (newMachineIndex >= 0) {
                       newMachines[newMachineIndex] = { ...newMachines[newMachineIndex], status: 'ทำงาน' };
                  }
                  machineName = formData.moveToMachine;
              }

              // Update Log
              newMoldingLogs[logIndex] = {
                  ...currentLog,
                  machine: machineName,
                  quantityProduced: parseInt(formData.quantityProduced) || 0,
                  targetQuantity: parseInt(formData.targetQuantity) || 0,
                  lotNumber: formData.lotNumber,
                  operatorName: formData.operator,
                  startTime: formData.startTime,
                  priority: parseInt(formData.priority) || 10,
                  // Status is handled via specific buttons, but we save basic edits here
              };
          }
      }

      // 3. Change Status Logic
      else if (modalType === 'CHANGE_STATUS') {
          newMachines[machineIndex] = { ...newMachines[machineIndex], status: formData.status };
      }

      await updateData({
          ...factoryData,
          factory_machines: newMachines,
          molding_logs: newMoldingLogs
      });

      handleCloseModal();
  };

  // Dedicated Actions for Manage Job Modal
  const handleJobAction = async (action: 'PAUSE' | 'FINISH' | 'REMOVE') => {
        if (!selectedMachine || !formData.logId) return;

        const newMoldingLogs = [...(molding_logs || [])];
        const newMachines = [...factory_machines];
        const machineIndex = newMachines.findIndex(m => m.id === selectedMachine.id);
        const logIndex = newMoldingLogs.findIndex(l => l.id === formData.logId);

        if (logIndex === -1 || machineIndex === -1) return;

        if (action === 'PAUSE') {
            newMoldingLogs[logIndex].status = 'Stopped';
            newMachines[machineIndex].status = 'ว่าง'; // Machine becomes idle
        } else if (action === 'FINISH') {
            newMoldingLogs[logIndex].status = 'Completed';
            newMoldingLogs[logIndex].quantityProduced = parseInt(formData.quantityProduced) || newMoldingLogs[logIndex].quantityProduced;
            newMachines[machineIndex].status = 'ว่าง';
        } else if (action === 'REMOVE') {
            // Either delete or mark cancelled
            newMoldingLogs.splice(logIndex, 1);
            newMachines[machineIndex].status = 'ว่าง';
        }

        await updateData({
            ...factoryData,
            factory_machines: newMachines,
            molding_logs: newMoldingLogs
        });
        handleCloseModal();
  };


  const getStatusColor = (normalizedStatus: string) => {
      if (normalizedStatus === 'running') return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
      if (normalizedStatus === 'error') return 'bg-red-500';
      if (normalizedStatus === 'maintenance') return 'bg-orange-500';
      return 'bg-slate-300';
  };

  const getStatusLabelColor = (normalizedStatus: string) => {
      if (normalizedStatus === 'running') return 'bg-green-100 text-green-700 border-green-200';
      if (normalizedStatus === 'error') return 'bg-red-100 text-red-700 border-red-200';
      if (normalizedStatus === 'maintenance') return 'bg-orange-100 text-orange-700 border-orange-200';
      return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                {view === 'status' ? (
                    <><Activity className="text-primary-600" /> {t('nav.machineStatus')}</>
                ) : (
                    <><Wrench className="text-orange-500" /> {t('nav.maintenance')}</>
                )}
            </h2>
            <p className="text-slate-500">
                {view === 'status' ? t('mach.subtitle') : t('mach.maintSubtitle')}
            </p>
        </div>
        
        {view === 'status' && (
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-50 text-green-700 text-xs font-bold cursor-pointer hover:bg-green-100">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> {t('mach.running')}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-500 text-xs font-bold cursor-pointer hover:bg-slate-50">
                    <div className="w-2 h-2 rounded-full bg-slate-300"></div> {t('mach.idle')}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-red-500 text-xs font-bold cursor-pointer hover:bg-red-50">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div> {t('mach.error')}
                </div>
            </div>
        )}
      </div>

      {/* --- GRID VIEW --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {machineStatusMap.map((item) => (
            <div 
                key={item.id} 
                className={`relative bg-white rounded-xl shadow-sm border transition-all duration-300 group
                    ${item.isOnline ? 'border-green-200 shadow-green-100/50' : 'border-slate-200'}
                    hover:shadow-md
                `}
            >
                {/* 1. Header: Status & Name */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(item.normalizedStatus)}`}></div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 leading-none">{item.name}</h3>
                            <span className="text-xs text-slate-400 font-medium">{item.location}</span>
                        </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusLabelColor(item.normalizedStatus)}`}>
                        {getStatusLabel(item.status)}
                    </span>
                </div>

                {/* 2. Body: Context (Job or Idle) */}
                <div className="p-5 min-h-[160px] flex flex-col justify-center">
                    {item.activeLog ? (
                        <div className="space-y-4 cursor-pointer" onClick={() => handleOpenModal(item, 'MANAGE_JOB')}>
                            {/* Product Info */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                                        {item.activeLog.jobId}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1 rounded">{item.activeLog.lotNumber}</span>
                                </div>
                                <h4 className="font-medium text-slate-800 text-sm line-clamp-1 hover:text-primary-600 transition-colors" title={item.activeLog.productName}>
                                    {item.activeLog.productName}
                                </h4>
                            </div>

                            {/* Progress Bar */}
                            <div>
                                <div className="flex justify-between text-xs mb-1.5">
                                    <span className="text-slate-500">{t('prod.progress')}</span>
                                    <span className="font-bold text-slate-700">{item.progress.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-1000" 
                                        style={{ width: `${Math.min(item.progress, 100)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                                    <span>{item.activeLog.quantityProduced.toLocaleString()} pcs</span>
                                    <span>{(item.activeLog.targetQuantity || item.associatedOrder?.quantity || 0).toLocaleString()} pcs</span>
                                </div>
                            </div>
                        </div>
                    ) : item.isOnline ? (
                        <div className="text-center py-4">
                            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-400 animate-pulse">
                                <AlertCircle size={24} />
                            </div>
                            <p className="text-sm font-medium text-slate-500">{t('mach.runningNoJob')}</p>
                            <button 
                                onClick={() => handleOpenModal(item, 'ASSIGN_JOB')}
                                className="mt-2 text-xs text-primary-600 font-bold hover:underline"
                            >
                                {t('mach.assignNow')}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                <Power size={24} />
                            </div>
                            <p className="text-sm font-medium text-slate-500">{t('mach.machineIdle')}</p>
                            <button 
                                onClick={() => handleOpenModal(item, 'ASSIGN_JOB')}
                                className="mt-2 px-4 py-1.5 bg-primary-50 text-primary-600 text-xs font-bold rounded-full hover:bg-primary-100 transition-colors"
                            >
                                {t('mach.assign')}
                            </button>
                        </div>
                    )}
                </div>

                {/* 3. Footer */}
                <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                     {item.isOnline && item.activeLog ? (
                         <div className="flex items-center gap-4 text-xs">
                             <div className="flex items-center gap-1.5" title="Operator">
                                 <User size={14} className="text-blue-500" />
                                 <span className="font-medium text-slate-600 truncate max-w-[80px]">{item.activeLog.operatorName || '-'}</span>
                             </div>
                             <div className="flex items-center gap-1.5" title="Start Time">
                                 <Clock size={14} className="text-slate-400" />
                                 <span className="text-slate-500">{item.activeLog.startTime?.split(' ')[1] || '08:00'}</span>
                             </div>
                         </div>
                     ) : (
                         <div className="text-xs text-slate-400 flex items-center gap-1">
                             <Clock size={12} /> {t('mach.lastActive')}: 2h ago
                         </div>
                     )}

                     <div className="flex gap-2">
                         {item.isOnline && (
                             <button 
                                onClick={() => handleOpenModal(item, 'MANAGE_JOB')}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:border-primary-300 hover:text-primary-600 shadow-sm transition-all flex items-center gap-1"
                             >
                                 <Settings size={14} /> Manage
                             </button>
                         )}
                         <button 
                            onClick={() => handleOpenModal(item, 'CHANGE_STATUS')}
                            className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-lg shadow-sm transition-all"
                         >
                             <MoreHorizontal size={16} />
                         </button>
                     </div>
                </div>
            </div>
        ))}
      </div>

      {/* --- MODAL --- */}
      {modalType && selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[95vh] border border-white/20
                ${modalType === 'MANAGE_JOB' ? 'max-w-2xl' : 'max-w-md'}
            `}>
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                             {modalType === 'ASSIGN_JOB' && <>{t('mach.modalAssign')}</>}
                             {modalType === 'MANAGE_JOB' && <>{t('mach.modalLog')} & Control</>}
                             {modalType === 'CHANGE_STATUS' && <>{t('mach.modalStatus')}</>}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{selectedMachine.name} • {selectedMachine.location}</p>
                    </div>
                    <button onClick={handleCloseModal} className="text-slate-300 hover:text-slate-500 transition-colors p-1 bg-slate-50 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    
                    {/* --- ASSIGN JOB --- */}
                    {modalType === 'ASSIGN_JOB' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700">{t('mach.selectOrder')}</label>
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl p-2 bg-slate-50">
                                    {packing_orders.filter(o => o.status === 'Open' || !o.status).map(order => (
                                        <label 
                                            key={order.id} 
                                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all bg-white
                                                ${formData.orderId === order.id ? 'border-primary-500 ring-1 ring-primary-500 shadow-md' : 'border-slate-200 hover:border-primary-200'}
                                            `}
                                        >
                                            <input 
                                                type="radio" 
                                                name="orderSelect" 
                                                value={order.id} 
                                                checked={formData.orderId === order.id}
                                                onChange={() => setFormData({...formData, orderId: order.id})}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-800 text-sm">{order.lotNumber}</span>
                                                    <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{order.dueDate}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 mt-0.5">{order.name}</p>
                                                <div className="flex gap-2 mt-1">
                                                     <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Qty: {order.quantity.toLocaleString()}</span>
                                                     <span className="text-xs bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded">{order.color}</span>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                    {packing_orders.filter(o => o.status === 'Open').length === 0 && (
                                        <div className="text-center py-6 text-slate-400 italic">
                                            {t('mach.noOrders')}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">{t('mach.operator')}</label>
                                <select 
                                    className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={formData.operator}
                                    onChange={(e) => setFormData({...formData, operator: e.target.value})}
                                >
                                    <option value="">{t('mach.selectOp')}</option>
                                    {packing_employees?.map(emp => (
                                        <option key={emp.id} value={emp.name}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* --- MANAGE JOB (Detailed) --- */}
                    {modalType === 'MANAGE_JOB' && (
                        <div className="space-y-6">
                            
                            {/* 1. Job Info Header */}
                            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                                <h4 className="text-primary-700 font-bold text-lg mb-2">{formData.productName}</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-medium text-slate-600">
                                        <span>{parseInt(formData.quantityProduced).toLocaleString()} / {parseInt(formData.targetQuantity).toLocaleString()}</span>
                                        <span>{((parseInt(formData.quantityProduced) / (parseInt(formData.targetQuantity) || 1)) * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="h-3 bg-white rounded-full overflow-hidden border border-blue-100">
                                        <div 
                                            className="h-full bg-primary-500 rounded-full" 
                                            style={{ width: `${Math.min((parseInt(formData.quantityProduced) / (parseInt(formData.targetQuantity) || 1)) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Detailed Form Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Operator</label>
                                    <select 
                                        className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                        value={formData.operator}
                                        onChange={(e) => setFormData({...formData, operator: e.target.value})}
                                    >
                                        <option value="">-- Select --</option>
                                        {packing_employees?.map(emp => (
                                            <option key={emp.id} value={emp.name}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Lot Number</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                            value={formData.lotNumber}
                                            onChange={(e) => setFormData({...formData, lotNumber: e.target.value})}
                                        />
                                        <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Target Quantity</label>
                                    <input 
                                        type="number" 
                                        className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                        value={formData.targetQuantity}
                                        onChange={(e) => setFormData({...formData, targetQuantity: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Produced (Update)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border border-green-300 bg-green-50 text-green-800 font-bold rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                                        value={formData.quantityProduced}
                                        onChange={(e) => setFormData({...formData, quantityProduced: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Start Time</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                                            placeholder="YYYY-MM-DD HH:mm"
                                        />
                                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Priority</label>
                                    <input 
                                        type="number" 
                                        className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                        placeholder="10"
                                    />
                                    <span className="text-[10px] text-slate-400">Lower value = Higher priority</span>
                                </div>
                            </div>
                            
                            <hr className="border-slate-100" />

                            {/* 3. Transfer Machine */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Move to Another Machine</label>
                                <div className="relative">
                                    <select 
                                        className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 appearance-none bg-white text-slate-900"
                                        value={formData.moveToMachine}
                                        onChange={(e) => setFormData({...formData, moveToMachine: e.target.value})}
                                    >
                                        <option value="">{selectedMachine.name} (Current)</option>
                                        {factory_machines.filter(m => m.id !== selectedMachine.id && m.status === 'ว่าง').map(m => (
                                            <option key={m.id} value={m.name}>{m.name} (Idle)</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Action Buttons */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Actions</label>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleJobAction('PAUSE')}
                                        className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <PauseCircle size={18} /> Pause Job
                                    </button>
                                    <button 
                                        onClick={() => handleJobAction('FINISH')}
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <CheckCircle2 size={18} /> Finish Job
                                    </button>
                                    <button 
                                        onClick={() => handleJobAction('REMOVE')}
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Trash2 size={18} /> Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- CHANGE STATUS --- */}
                    {modalType === 'CHANGE_STATUS' && (
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-slate-700">{t('mach.setStatus')}</label>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { val: 'ทำงาน', label: 'mach.statusRun', color: 'bg-green-50 border-green-200 text-green-700', icon: Activity },
                                    { val: 'ว่าง', label: 'mach.statusIdle', color: 'bg-slate-50 border-slate-200 text-slate-600', icon: Power },
                                    { val: 'กำลังซ่อม', label: 'mach.statusMaint', color: 'bg-orange-50 border-orange-200 text-orange-700', icon: Wrench },
                                    { val: 'เสีย', label: 'mach.statusError', color: 'bg-red-50 border-red-200 text-red-700', icon: AlertTriangle },
                                ].map(opt => (
                                    <button
                                        key={opt.val}
                                        onClick={() => setFormData({...formData, status: opt.val})}
                                        className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all
                                            ${formData.status === opt.val ? `ring-2 ring-offset-1 ring-slate-400 ${opt.color} shadow-sm` : 'bg-white border-slate-200 hover:bg-slate-50'}
                                        `}
                                    >
                                        <div className={`p-2 rounded-full bg-white shadow-sm`}>
                                            <opt.icon size={20} />
                                        </div>
                                        <span className="font-bold">{t(opt.label)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Buttons */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
                    <button 
                        onClick={handleCloseModal}
                        className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        {t('mach.cancel')}
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={modalType === 'ASSIGN_JOB' && !formData.orderId}
                        className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {t('mach.confirm')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;