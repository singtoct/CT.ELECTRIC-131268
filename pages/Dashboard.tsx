
import React from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import StatCard from '../components/StatCard';
import DataHealthCheck from '../components/DataHealthCheck'; // Imported
import { Package, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const { packing_orders, factory_machines, molding_logs, packing_qc_entries } = useFactoryData();
  const { t } = useTranslation();

  const totalOrders = packing_orders?.length || 0;
  const activeMachines = factory_machines?.filter(m => m.status === 'ทำงาน').length || 0;
  const totalMachines = factory_machines?.length || 0;
  const totalProduced = molding_logs?.reduce((acc, log) => acc + (log.quantityProduced || 0), 0) || 0;
  const pending = packing_qc_entries?.filter(qc => qc.status === 'Pending').length || 0;
  const passed = packing_qc_entries?.filter(qc => qc.status === 'Passed').length || 0;
  const failed = packing_qc_entries?.filter(qc => qc.status === 'Failed').length || 0;
  
  const machineStats = (molding_logs || []).reduce((acc: any, log) => {
    acc[log.machine] = (acc[log.machine] || 0) + (log.quantityProduced || 0);
    return acc;
  }, {});
  const barChartData = Object.keys(machineStats).map(key => ({
    name: key.replace('เครื่องฉีด ', 'M'),
    quantity: machineStats[key]
  })).slice(0, 8);

  const pieData = [{ name: 'Passed', value: passed }, { name: 'Pending', value: pending }, { name: 'Failed', value: failed }];
  const COLORS = ['#22c55e', '#eab308', '#ef4444'];

  return (
    <div className="space-y-4 md:space-y-6">
      
      {/* Data Health Check Widget (Top Section) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 h-full">
                <StatCard title={t('dash.totalOrders')} value={totalOrders} icon={Package} color="blue" trend="+12%" trendUp={true} />
                <StatCard title={t('dash.activeMachines')} value={`${activeMachines} / ${totalMachines}`} icon={Activity} color="green" />
             </div>
          </div>
          <div className="lg:col-span-1">
             <DataHealthCheck />
             <div className="mt-4">
                <StatCard title={t('dash.pendingQC')} value={pending} icon={AlertCircle} color="orange" trend={`${Math.round((pending / (passed+pending+failed || 1)) * 100)}% ${t('dash.ofTotal')}`} trendUp={false} />
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4">{t('dash.productionVolume')}</h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="quantity" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4">{t('dash.qcStatus')}</h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
                {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center text-[10px] md:text-sm text-slate-600">
                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full mr-1.5" style={{backgroundColor: COLORS[index]}}></div>
                        {entry.name} ({entry.value})
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100">
            <h3 className="text-base md:text-lg font-bold text-slate-800">{t('dash.recentLogs')}</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        <th className="px-6 py-4">Job ID</th>
                        <th className="px-6 py-4">{t('prod.productDetail')}</th>
                        <th className="px-6 py-4">Machine</th>
                        <th className="px-6 py-4">{t('orders.quantity')}</th>
                        <th className="px-6 py-4">{t('orders.status')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {molding_logs?.slice(0, 5)?.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{log.jobId?.substring(0, 8)}...</td>
                            <td className="px-6 py-4 text-slate-700 max-w-[200px] truncate">{log.productName}</td>
                            <td className="px-6 py-4 text-slate-600">{log.machine}</td>
                            <td className="px-6 py-4 font-mono text-slate-600">{(log.quantityProduced || 0).toLocaleString()}</td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium
                                    ${log.status === 'เสร็จสิ้น' || log.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                                      'bg-blue-100 text-blue-800'}`}>
                                    {log.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
