import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { Cpu, Clock, Calendar, FileText, BarChart3, AlertCircle, CheckCircle2, Plus, Filter, Edit2, Trash2, X, Save, Search } from 'lucide-react';
import { MoldingLog } from '../types';

// Helper for generating ID
const generateId = () => Math.random().toString(36).substr(2, 9);

const Production: React.FC = () => {
  const factoryData = useFactoryData(); // Grab full object once
  const { factory_machines, molding_logs, packing_orders } = factoryData;
  const { updateData } = useFactoryActions(); 
  const { t } = useTranslation();
  
  // State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [summaryFilter, setSummaryFilter] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Partial<MoldingLog> | null>(null);

  // --- Logic 1: Overall Active PO Progress ---
  const activeOrdersProgress = useMemo(() => {
    // Get all orders (we might want to see completed ones too depending on filter)
    const allOrders = packing_orders || [];

    const processed = allOrders.map(order => {
        const relevantLogs = molding_logs?.filter(log => 
            (log.orderId === order.id) || 
            (order.lotNumber && log.lotNumber === order.lotNumber)
        ) || [];

        const totalProduced = relevantLogs.reduce((sum, log) => sum + (log.quantityProduced || 0), 0);
        const quantity = order.quantity || 0;
        const progress = quantity > 0 ? (totalProduced / quantity) * 100 : 0;
        const remaining = Math.max(0, quantity - totalProduced);

        let healthStatus = 'In Progress';
        if (progress >= 100 || order.status === 'Completed') healthStatus = 'Completed';
        else if (progress === 0) healthStatus = 'Not Started';
        else if (progress >= 90) healthStatus = 'Near Completion';

        return {
            ...order,
            totalProduced,
            remaining,
            progress,
            healthStatus,
            lastLogDate: relevantLogs.length > 0 ? relevantLogs[relevantLogs.length - 1].date : '-'
        };
    });

    // Filter Logic
    if (summaryFilter === 'all') return processed;
    if (summaryFilter === 'completed') return processed.filter(o => o.healthStatus === 'Completed');
    if (summaryFilter === 'not_started') return processed.filter(o => o.healthStatus === 'Not Started');
    if (summaryFilter === 'in_progress') return processed.filter(o => o.healthStatus === 'In Progress' || o.healthStatus === 'Near Completion');
    
    return processed;
  }, [packing_orders, molding_logs, summaryFilter]);


  // --- Logic 2: Daily Report (Specific Date) ---
  const dailyLogs = useMemo(() => {
    return molding_logs?.filter(log => log.date === selectedDate) || [];
  }, [molding_logs, selectedDate]);

  const dailyReportData = useMemo(() => {
    // Grouping for summary view
    const groupedData: Record<string, any> = {};

    dailyLogs.forEach(log => {
       // We will just list raw logs for editing in this version, 
       // but keeping summary calculation if needed for footer
    });
    return dailyLogs;
  }, [dailyLogs]);


  // --- Actions ---

  const handleOpenAddModal = (prefillOrder?: any) => {
    setEditingLog({
        id: '',
        date: selectedDate,
        machine: factory_machines?.[0]?.name || '',
        shift: 'เช้า', // Default shift
        quantityProduced: 0,
        quantityRejected: 0,
        status: 'In Progress',
        lotNumber: prefillOrder?.lotNumber || '',
        productName: prefillOrder?.name || '',
        orderId: prefillOrder?.id || '',
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
      // Construct full data object using captured factoryData
      const newData = {
          ...factoryData,
          molding_logs: updatedLogs,
      };
      await updateData(newData);
  };

  const handleSaveLog = async () => {
      if (!editingLog) return;

      let updatedLogs = [...(molding_logs || [])];
      
      if (editingLog.id) {
          // Update existing
          updatedLogs = updatedLogs.map(l => l.id === editingLog.id ? editingLog as MoldingLog : l);
      } else {
          // Create new
          const newLog = { ...editingLog, id: generateId() } as MoldingLog;
          updatedLogs.push(newLog);
      }

      const newData = {
          ...factoryData,
          molding_logs: updatedLogs,
      };

      await updateData(newData);
      setIsModalOpen(false);
  };

  const handleOrderSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const orderId = e.target.value;
      const order = packing_orders.find(o => o.id === orderId);
      if (order) {
          setEditingLog(prev => ({
              ...prev,
              orderId: order.id,
              lotNumber: order.lotNumber,
              productName: order.name
          }));
      }
  };


  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('prod.title')}</h2>
        <p className="text-slate-500">{t('prod.subtitle')}</p>
      </div>

      {/* 1. Active Production Orders (Smart Tracking) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{t('prod.activeSummary')}</h3>
                        <p className="text-sm text-slate-500">Overview of order progress</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-slate-200/50 p-1 rounded-lg">
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'in_progress', label: 'In Progress' },
                        { key: 'not_started', label: 'Not Started' },
                        { key: 'completed', label: 'Completed' }
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
                    {activeOrdersProgress.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-700">{order.lotNumber || '-'}</td>
                            <td className="px-6 py-4">
                                <div className="font-medium text-slate-900">{order.name}</div>
                                <div className="text-xs text-slate-500">Due: {order.dueDate}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                                    ${order.healthStatus === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                                      order.healthStatus === 'Near Completion' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                      order.healthStatus === 'Not Started' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                                      'bg-white text-slate-700 border-slate-300'}`}>
                                    {order.healthStatus}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right text-slate-500">{order.quantity.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-bold text-green-600">{order.totalProduced.toLocaleString()}</td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium text-slate-700">{(order.progress || 0).toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                        <div 
                                            className={`h-full rounded-full ${order.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min(order.progress || 0, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <button 
                                    onClick={() => handleOpenAddModal(order)}
                                    className="p-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1 mx-auto text-xs font-bold"
                                    title="Add Production Log for this Order"
                                >
                                    <Plus size={14} /> Log
                                </button>
                            </td>
                        </tr>
                    ))}
                    {activeOrdersProgress.length === 0 && (
                        <tr><td colSpan={7} className="text-center py-8 text-slate-500">No orders found for this filter.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* 2. Daily Production Log (CRUD) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                        className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0"
                    />
                </div>
                <button 
                    onClick={() => handleOpenAddModal()}
                    className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                >
                    <Plus size={16} /> Add Log
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
                                <td className="px-6 py-4 font-medium text-slate-900">{log.machine}</td>
                                <td className="px-6 py-4 text-slate-600">{log.shift}</td>
                                <td className="px-6 py-4">
                                    <div className="text-slate-900 font-medium line-clamp-1">{log.productName}</div>
                                    <div className="text-xs text-slate-500 font-mono">{log.lotNumber}</div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-blue-600 bg-blue-50/30">
                                    {(log.quantityProduced || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                        ${log.status === 'Completed' || log.status === 'เสร็จสิ้น' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {log.status}
                                     </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                   <div className="flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => handleEditLog(log)}
                                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteLog(log.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
                                    <p className="text-xs">Click "Add Log" to insert new data for {selectedDate}</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-lg">
                        {editingLog.id ? 'Edit Production Log' : 'Add Production Log'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    {/* Date & Shift */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                            <input 
                                type="date" 
                                value={editingLog.date}
                                onChange={e => setEditingLog({...editingLog, date: e.target.value})}
                                className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Shift</label>
                            <select 
                                value={editingLog.shift}
                                onChange={e => setEditingLog({...editingLog, shift: e.target.value})}
                                className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            >
                                <option value="เช้า">เช้า (Day)</option>
                                <option value="ดึก">ดึก (Night)</option>
                            </select>
                        </div>
                    </div>

                    {/* Machine */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Machine</label>
                        <select 
                            value={editingLog.machine}
                            onChange={e => setEditingLog({...editingLog, machine: e.target.value})}
                            className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        >
                            {factory_machines.map(m => (
                                <option key={m.id} value={m.name}>{m.name} ({m.location})</option>
                            ))}
                        </select>
                    </div>

                    {/* Order Selection */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Production Order</label>
                        <select 
                            value={editingLog.orderId || ''}
                            onChange={handleOrderSelectChange}
                            className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        >
                            <option value="">-- Select Order --</option>
                            {packing_orders.filter(o => o.status !== 'Cancelled').map(o => (
                                <option key={o.id} value={o.id}>
                                    {o.lotNumber} - {o.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Output Quantity */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Output Quantity (pcs)</label>
                        <input 
                            type="number" 
                            value={editingLog.quantityProduced}
                            onChange={e => setEditingLog({...editingLog, quantityProduced: parseInt(e.target.value) || 0})}
                            className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xl font-bold text-blue-600 focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Job Status</label>
                         <select 
                            value={editingLog.status}
                            onChange={e => setEditingLog({...editingLog, status: e.target.value})}
                            className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        >
                            <option value="In Progress">In Progress (กำลังผลิต)</option>
                            <option value="Completed">Completed (เสร็จสิ้น)</option>
                            <option value="Stopped">Stopped (หยุดชั่วคราว)</option>
                        </select>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveLog}
                        className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                    >
                        <Save size={18} /> Save Log
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Production;