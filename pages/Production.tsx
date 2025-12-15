import React, { useState, useMemo } from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { Cpu, Clock, Calendar, FileText, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';

const Production: React.FC = () => {
  const { factory_machines, molding_logs, packing_orders } = useFactoryData();
  const { t } = useTranslation();
  
  // Set default date to 2025-12-12 for demo purposes
  const [selectedDate, setSelectedDate] = useState<string>('2025-12-12');

  // Helper to get active job for cards
  const getMachineStatus = (machineName: string) => {
     const activeLog = molding_logs?.find(log => log.machine === machineName && (log.status === 'ทำงาน' || log.status === 'In Progress'));
     return activeLog;
  };

  // --- Logic 1: Overall Active PO Progress ---
  const activeOrdersProgress = useMemo(() => {
    // Filter only Open or In Progress orders
    const activeOrders = packing_orders?.filter(o => o.status === 'Open' || o.status === 'In Progress') || [];

    return activeOrders.map(order => {
        // Calculate TOTAL produced for this order from ALL history logs
        const relevantLogs = molding_logs?.filter(log => 
            (log.orderId === order.id) || 
            (order.lotNumber && log.lotNumber === order.lotNumber)
        ) || [];

        const totalProduced = relevantLogs.reduce((sum, log) => sum + (log.quantityProduced || 0), 0);
        const quantity = order.quantity || 0;
        const progress = quantity > 0 ? (totalProduced / quantity) * 100 : 0;
        const remaining = Math.max(0, quantity - totalProduced);

        // Determine status based on progress
        let healthStatus = 'Normal';
        if (progress >= 100) healthStatus = 'Completed';
        else if (progress >= 90) healthStatus = 'Near Completion';
        else if (progress === 0) healthStatus = 'Not Started';

        return {
            ...order,
            quantity, // ensure number
            totalProduced,
            remaining,
            progress,
            healthStatus,
            lastLogDate: relevantLogs.length > 0 ? relevantLogs[relevantLogs.length - 1].date : '-'
        };
    }).sort((a, b) => b.progress - a.progress); // Sort by progress (most complete first)
  }, [packing_orders, molding_logs]);


  // --- Logic 2: Daily Report (Specific Date) ---
  const dailyReportData = useMemo(() => {
    const todaysLogs = molding_logs?.filter(log => log.date === selectedDate) || [];

    const groupedData: Record<string, {
      machine: string;
      lotNumber: string;
      productName: string;
      producedToday: number;
      orderId?: string;
    }> = {};

    todaysLogs.forEach(log => {
      const key = `${log.machine}|${log.lotNumber || log.jobId}`;
      if (!groupedData[key]) {
        groupedData[key] = {
          machine: log.machine,
          lotNumber: log.lotNumber,
          productName: log.productName,
          producedToday: 0,
          orderId: log.orderId
        };
      }
      groupedData[key].producedToday += (log.quantityProduced || 0);
    });

    return Object.values(groupedData).map(item => {
      const order = packing_orders?.find(o => o.id === item.orderId || (item.lotNumber && o.lotNumber === item.lotNumber));
      const target = order ? (order.quantity || 0) : 0;

      const allLogsForJob = molding_logs?.filter(log => 
        (log.orderId === item.orderId) || 
        (item.lotNumber && log.lotNumber === item.lotNumber)
      ) || [];
      
      const totalAccumulated = allLogsForJob.reduce((sum, log) => sum + (log.quantityProduced || 0), 0);

      return {
        ...item,
        target,
        totalAccumulated,
        progress: target > 0 ? (totalAccumulated / target) * 100 : 0
      };
    });
  }, [molding_logs, packing_orders, selectedDate]);


  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('prod.title')}</h2>
        <p className="text-slate-500">{t('prod.subtitle')}</p>
      </div>

      {/* 1. Machine Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {factory_machines?.map((machine) => {
           const isWorking = machine.status === 'ทำงาน';
           const currentJob = getMachineStatus(machine.name);

           return (
            <div key={machine.id} className={`rounded-xl border-l-4 p-5 shadow-sm bg-white ${isWorking ? 'border-l-green-500' : 'border-l-slate-300'}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${isWorking ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{machine.name}</h4>
                    <p className="text-xs text-slate-500">{machine.location}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${isWorking ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                  {machine.status}
                </span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                 {currentJob ? (
                    <>
                        <div className="text-xs text-slate-500 flex justify-between">
                            <span>PO No:</span>
                            <span className="font-mono text-slate-700 font-bold">{currentJob.lotNumber || 'N/A'}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                            <span className="block mb-1">Product:</span>
                            <span className="font-medium text-slate-800 line-clamp-1" title={currentJob.productName}>{currentJob.productName}</span>
                        </div>
                         <div className="text-xs text-slate-500 flex justify-between items-center mt-2">
                             <span className="flex items-center gap-1"><Clock size={12}/> {t('prod.shift')}: {currentJob.shift}</span>
                             <span className="font-mono font-bold text-primary-600">{(currentJob.quantityProduced || 0).toLocaleString()} pcs</span>
                         </div>
                    </>
                 ) : (
                    <div className="text-sm text-slate-400 italic py-2 flex items-center justify-center">
                        No active job logged
                    </div>
                 )}
              </div>
            </div>
           );
        })}
      </div>

      {/* 2. NEW: Active Production Orders (Smart Tracking) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-3">
                <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                    <BarChart3 size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">{t('prod.activeSummary')}</h3>
                    <p className="text-sm text-slate-500">{t('prod.activeSummarySub')} ({activeOrdersProgress.length})</p>
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
                        <th className="px-6 py-4 text-right text-red-600">{t('prod.remaining')}</th>
                        <th className="px-6 py-4 w-1/4">{t('prod.progress')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {activeOrdersProgress.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-700">{order.lotNumber}</td>
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
                                    {order.healthStatus === 'Completed' && <CheckCircle2 size={12} />}
                                    {order.healthStatus === 'Not Started' && <AlertCircle size={12} />}
                                    {order.healthStatus}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right text-slate-500">{order.quantity.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-bold text-green-600">{order.totalProduced.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-medium text-red-500">
                                {order.remaining > 0 ? order.remaining.toLocaleString() : '-'}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium text-slate-700">{(order.progress || 0).toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                order.progress >= 100 ? 'bg-green-500' : 
                                                order.progress > 50 ? 'bg-blue-500' : 
                                                'bg-orange-400'
                                            }`}
                                            style={{ width: `${Math.min(order.progress || 0, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {activeOrdersProgress.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                {t('prod.noActive')}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* 3. Daily Production Report (Specific Date) */}
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
            
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <Calendar size={16} className="text-slate-500 ml-2" />
                <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0"
                />
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">Machine</th>
                        <th className="px-6 py-4">{t('prod.poNumber')}</th>
                        <th className="px-6 py-4">{t('prod.productDetail')}</th>
                        <th className="px-6 py-4 text-right bg-blue-50/50 text-blue-700">{t('prod.outputToday')}</th>
                        <th className="px-6 py-4 text-right">{t('prod.accumulated')}</th>
                        <th className="px-6 py-4">{t('prod.statusToday')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {dailyReportData.length > 0 ? (
                        dailyReportData.map((row, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900">{row.machine}</td>
                                <td className="px-6 py-4 font-mono text-slate-600">{row.lotNumber}</td>
                                <td className="px-6 py-4 text-slate-700">{row.productName}</td>
                                <td className="px-6 py-4 text-right font-bold text-blue-600 bg-blue-50/30 text-base">
                                    {(row.producedToday || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="text-slate-900 font-medium">{(row.totalAccumulated || 0).toLocaleString()}</div>
                                    <div className="text-xs text-slate-500">{t('dash.ofTotal')} {row.target > 0 ? row.target.toLocaleString() : '-'}</div>
                                </td>
                                <td className="px-6 py-4 w-40">
                                   <div className="text-xs text-right text-slate-500">
                                      {(row.progress || 0).toFixed(1)}% Done
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
                                    <p className="text-xs">Try selecting a different date (e.g., 2025-12-12)</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
                {dailyReportData.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                        <tr>
                            <td colSpan={3} className="px-6 py-4 text-right">{t('prod.dailyTotal')}</td>
                            <td className="px-6 py-4 text-right text-blue-700">
                                {dailyReportData.reduce((sum, row) => sum + (row.producedToday || 0), 0).toLocaleString()}
                            </td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
      </div>
    </div>
  );
};

export default Production;