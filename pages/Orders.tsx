import React, { useState } from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { Search, Filter } from 'lucide-react';

const Orders: React.FC = () => {
  const { packing_orders } = useFactoryData();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filteredOrders = packing_orders?.filter(order => 
    order.name?.toLowerCase().includes(search.toLowerCase()) ||
    order.lotNumber?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('orders.title')}</h2>
          <p className="text-slate-500">{t('orders.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t('orders.search')}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full md:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2">
            <Filter size={18} />
            {t('orders.filter')}
          </button>
        </div>
      </div>

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
                  <td className="px-6 py-4 font-mono text-slate-500">{order.lotNumber || '-'}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{order.name}</td>
                  <td className="px-6 py-4 text-slate-600">{order.color}</td>
                  <td className="px-6 py-4 text-right font-mono">{(order.quantity || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-500">{order.dueDate}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${order.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                        order.status === 'Open' ? 'bg-blue-100 text-blue-800' : 
                        order.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'}`}>
                      {order.status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {t('orders.noFound')}
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