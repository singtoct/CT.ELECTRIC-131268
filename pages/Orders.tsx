import React, { useState } from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { Search, Filter, Calendar, Package } from 'lucide-react';

const Orders: React.FC = () => {
  const { packing_orders } = useFactoryData();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filteredOrders = packing_orders?.filter(order => 
      (order.name?.toLowerCase().includes(search.toLowerCase()) || 
       order.lotNumber?.toLowerCase().includes(search.toLowerCase()) ||
       order.customerId?.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('orders.title')}</h2>
          <p className="text-slate-500">{t('orders.subtitle')}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t('orders.search')}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full bg-slate-50 text-slate-900"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <button className="flex items-center gap-2 text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg font-medium transition-colors">
            <Filter size={18} />
            {t('orders.filter')}
          </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">{t('orders.lotNo')}</th>
                        <th className="px-6 py-4">{t('orders.productName')}</th>
                        <th className="px-6 py-4">{t('orders.color')}</th>
                        <th className="px-6 py-4 text-right">{t('orders.quantity')}</th>
                        <th className="px-6 py-4">{t('orders.dueDate')}</th>
                        <th className="px-6 py-4">{t('orders.status')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono font-medium text-slate-600">
                                {order.lotNumber || '-'}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Package size={16} />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900">{order.name}</div>
                                        <div className="text-xs text-slate-500">Cust: {order.customerId?.substring(0,8)}...</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-xs font-medium">
                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                    {order.color}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                                {(order.quantity || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} />
                                    {order.dueDate}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                    ${order.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                                      order.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                      'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                    {order.status || 'Open'}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Package size={32} className="text-slate-300" />
                                    <p>{t('orders.noFound')}</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Orders;