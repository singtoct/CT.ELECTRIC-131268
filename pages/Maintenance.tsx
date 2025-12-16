import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Wrench, Activity, AlertTriangle, Power, Play, Pause, 
    MoreHorizontal, Settings, Box, User, Clock, CheckCircle2, 
    Plus, X, Save, AlertCircle, BarChart3, Gauge, ChevronDown
} from 'lucide-react';
import { Machine, MoldingLog, PackingOrder } from '../types';

interface MaintenanceProps {
    view: 'status' | 'maintenance';
}

// --- Types for Local State ---
type ModalType = 'ASSIGN_JOB' | 'LOG_OUTPUT' | 'CHANGE_STATUS' | null;

const Maintenance: React.FC<MaintenanceProps> = ({ view }) => {
  const { factory_machines, molding_logs, packing_orders, factory_settings, packing_employees } = useFactoryData();
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();

  // --- State ---
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [formData, setFormData] = useState<any>({});

  // --- Helpers for Status ---
  // Map raw data (which might be in Thai or English) to a normalized key
  const getNormalizedStatus = (status: string) => {
      if (['ทำงาน', 'Working', 'Running'].includes(status)) return 'running';
      if (['เสีย', 'Error', 'Breakdown'].includes(status)) return 'error';
      if (['กำลังซ่อม', 'Maintenance'].includes(status)) return 'maintenance';
      return 'idle';
  };

  // Get Display Label based on current language
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
  
  // Link Machines to Active Logs and Orders
  const machineStatusMap = useMemo(() => {
    return factory_machines.map(machine => {
        // Find active log (In Progress)
        // Normalize status check to match multiple variants
        const activeLog = molding_logs?.find(l => 
            l.machine === machine.name && 
            ['In Progress', 'Working', 'ทำงาน', 'Running'].includes(l.status)
        );

        // Find associated order info if log exists
        const associatedOrder = activeLog ? packing_orders?.find(o => o.id === activeLog.orderId) : null;
        
        // Calculate Progress
        const target = associatedOrder ? associatedOrder.quantity : 0;
        const current = activeLog ? activeLog.quantityProduced : 0;
        const progress = target > 0 ? (current / target) * 100 : 0;

        // Mock OEE (Random for demo if not in log)
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
      
      // Prefill Logic
      if (type === 'ASSIGN_JOB') {
          setFormData({ orderId: '', operator: '' });
      } else if (type === 'LOG_OUTPUT') {
          setFormData({ addedQuantity: 0, rejectQuantity: 0 });
      } else if (type === 'CHANGE_STATUS') {
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
              productId: ''
          };
          newMoldingLogs.push(newLog);
          newMachines[machineIndex] = { ...newMachines[machineIndex], status: 'ทำงาน' };
      } 
      
      // 2. Log Output Logic
      else if (modalType === 'LOG_OUTPUT') {
          const activeLogIndex = newMoldingLogs.findIndex(l => 
              l.machine === selectedMachine.name && ['In Progress', 'Working', 'ทำงาน'].includes(l.status)
          );
          
          if (activeLogIndex >= 0) {
              const log = newMoldingLogs[activeLogIndex];
              newMoldingLogs[activeLogIndex] = {
                  ...log,
                  quantityProduced: (log.quantityProduced || 0) + (parseInt(formData.addedQuantity) || 0),
                  quantityRejected: (log.quantityRejected || 0) + (parseInt(formData.rejectQuantity) || 0)
              };
          }
      }

      // 3. Change Status Logic
      else if (modalType === 'CHANGE_STATUS') {
          newMachines[machineIndex] = { ...newMachines[machineIndex], status: formData.status };
      }

      // Commit Updates
      await updateData({
          ...useFactoryData(),
          factory_machines: newMachines,
          molding_logs: newMoldingLogs
      });

      handleCloseModal();
  };

  // --- Render Helpers ---

  const getStatusColor = (normalizedStatus: string) => {
      if (normalizedStatus === 'running') return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
      if (normalizedStatus === 'error') return 'bg-red-500';
      if (normalizedStatus === 'maintenance') return 'bg-orange-500';
      return 'bg-slate-300'; // Idle
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
        
        {/* Quick Filter Legend */}
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
                        {/* Status Light */}
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
                        <div className="space-y-4">
                            {/* Product Info */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                                        {item.activeLog.jobId}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">{item.activeLog.lotNumber}</span>
                                </div>
                                <h4 className="font-medium text-slate-800 text-sm line-clamp-1" title={item.activeLog.productName}>
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
                                        className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000" 
                                        style={{ width: `${Math.min(item.progress, 100)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                                    <span>{item.activeLog.quantityProduced.toLocaleString()} pcs</span>
                                    <span>{item.associatedOrder?.quantity.toLocaleString() || '-'} pcs</span>
                                </div>
                            </div>
                        </div>
                    ) : item.isOnline ? (
                        /* Running but no job assigned case */
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
                        /* Idle case */
                        <div className="text-center py-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                <Power size={24} />
                            </div>
                            <p className="text-sm font-medium text-slate-500">{t('mach.machineIdle')}</p>
                            <p className="text-xs text-slate-400">{t('mach.ready')}</p>
                        </div>
                    )}
                </div>

                {/* 3. Footer: Metrics or Actions */}
                <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                     {item.isOnline && item.activeLog ? (
                         <div className="flex items-center gap-4 text-xs">
                             <div className="flex items-center gap-1.5" title="OEE (Efficiency)">
                                 <Gauge size={14} className="text-purple-500" />
                                 <span className="font-bold text-slate-700">{item.oee}%</span>
                             </div>
                             <div className="flex items-center gap-1.5" title="Operator">
                                 <User size={14} className="text-blue-500" />
                                 <span className="font-medium text-slate-600 truncate max-w-[80px]">{item.activeLog.operatorName || '-'}</span>
                             </div>
                         </div>
                     ) : (
                         <div className="text-xs text-slate-400 flex items-center gap-1">
                             <Clock size={12} /> {t('mach.lastActive')}: 2h ago
                         </div>
                     )}

                     {/* Action Menu (Hover or Click) */}
                     <div className="flex gap-2">
                         {item.isOnline ? (
                             <button 
                                onClick={() => handleOpenModal(item, 'LOG_OUTPUT')}
                                className="p-2 bg-white border border-slate-200 hover:border-primary-300 hover:text-primary-600 rounded-lg shadow-sm transition-all"
                                title={t('mach.log')}
                             >
                                 <Plus size={16} />
                             </button>
                         ) : (
                             <button 
                                onClick={() => handleOpenModal(item, 'ASSIGN_JOB')}
                                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1"
                             >
                                 <Play size={12} fill="currentColor" /> {t('mach.assign')}
                             </button>
                         )}
                         
                         <button 
                            onClick={() => handleOpenModal(item, 'CHANGE_STATUS')}
                            className="p-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 rounded-lg shadow-sm transition-all"
                            title={t('mach.settings')}
                         >
                             <Settings size={16} />
                         </button>
                     </div>
                </div>
            </div>
        ))}
      </div>

      {/* --- MODAL: MACHINE CONTROL CENTER --- */}
      {modalType && selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                             {modalType === 'ASSIGN_JOB' && <><Play className="text-green-500" size={20} /> {t('mach.modalAssign')}</>}
                             {modalType === 'LOG_OUTPUT' && <><BarChart3 className="text-blue-500" size={20} /> {t('mach.modalLog')}</>}
                             {modalType === 'CHANGE_STATUS' && <><Settings className="text-slate-500" size={20} /> {t('mach.modalStatus')}</>}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{selectedMachine.name} • {selectedMachine.location}</p>
                    </div>
                    <button onClick={handleCloseModal} className="text-slate-300 hover:text-slate-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    
                    {/* 1. ASSIGN JOB FORM */}
                    {modalType === 'ASSIGN_JOB' && (
                        <>
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-slate-700">{t('mach.selectOrder')}</label>
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                    {packing_orders.filter(o => o.status === 'Open' || !o.status).map(order => (
                                        <label 
                                            key={order.id} 
                                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                                                ${formData.orderId === order.id ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-slate-200 hover:border-primary-200 hover:bg-slate-50'}
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
                                                    <span className="text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">{order.dueDate}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 mt-0.5">{order.name}</p>
                                                <p className="text-xs text-slate-400 mt-1">{t('orders.quantity')}: {order.quantity.toLocaleString()}</p>
                                            </div>
                                        </label>
                                    ))}
                                    {packing_orders.filter(o => o.status === 'Open').length === 0 && (
                                        <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            {t('mach.noOrders')}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('mach.operator')}</label>
                                <div className="relative">
                                    <select 
                                        className="w-full border border-slate-200 bg-white text-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none shadow-sm appearance-none"
                                        value={formData.operator}
                                        onChange={(e) => setFormData({...formData, operator: e.target.value})}
                                    >
                                        <option value="">{t('mach.selectOp')}</option>
                                        {packing_employees?.map(emp => (
                                            <option key={emp.id} value={emp.name}>{emp.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* 2. LOG OUTPUT FORM */}
                    {modalType === 'LOG_OUTPUT' && (
                        <>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-2">
                                <div className="text-xs text-slate-500 mb-1">{t('mach.currentJob')}</div>
                                <div className="font-bold text-slate-800">
                                    {molding_logs?.find(l => l.machine === selectedMachine.name && ['In Progress', 'Working', 'ทำงาน'].includes(l.status))?.productName || t('mach.runningNoJob')}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 text-center">{t('mach.goodQty')}</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            className="w-full border border-green-200 bg-green-50/50 rounded-xl px-4 py-4 text-2xl font-bold text-center text-green-700 focus:ring-2 focus:ring-green-500 outline-none"
                                            placeholder="0"
                                            value={formData.addedQuantity}
                                            onChange={(e) => setFormData({...formData, addedQuantity: e.target.value})}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-300">
                                            <CheckCircle2 size={20} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 text-center">{t('mach.rejectQty')}</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            className="w-full border border-red-200 bg-red-50/50 rounded-xl px-4 py-4 text-2xl font-bold text-center text-red-700 focus:ring-2 focus:ring-red-500 outline-none"
                                            placeholder="0"
                                            value={formData.rejectQuantity}
                                            onChange={(e) => setFormData({...formData, rejectQuantity: e.target.value})}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-300">
                                            <AlertCircle size={20} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Preset Buttons */}
                            <div className="flex justify-center gap-2">
                                {[10, 50, 100, 500].map(num => (
                                    <button 
                                        key={num}
                                        onClick={() => setFormData({...formData, addedQuantity: (parseInt(formData.addedQuantity) || 0) + num})}
                                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        +{num}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* 3. CHANGE STATUS FORM */}
                    {modalType === 'CHANGE_STATUS' && (
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-700">{t('mach.setStatus')}</label>
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

                {/* Modal Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button 
                        onClick={handleCloseModal}
                        className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        {t('mach.cancel')}
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={modalType === 'ASSIGN_JOB' && !formData.orderId}
                        className="flex-[2] py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Save size={18} /> {t('mach.confirm')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
