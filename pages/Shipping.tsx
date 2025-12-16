import React from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { Truck, CheckCircle, Calendar } from 'lucide-react';

const Shipping: React.FC = () => {
  const { packing_orders } = useFactoryData();
  const { t } = useTranslation();

  // Assuming completed orders are ready to ship or shipped
  const readyToShip = packing_orders.filter(o => o.status === 'Completed' || o.status === 'Ready');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('nav.shipping')}</h2>
        <p className="text-slate-500">Manage order delivery</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                    <th className="px-6 py-4">Lot No.</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4 text-right">Qty to Ship</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4 text-center">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {readyToShip.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono text-slate-600">{order.lotNumber}</td>
                        <td className="px-6 py-4 text-slate-900">
                            Cust-{order.customerId ? order.customerId.substring(0,4) : '???'}
                        </td>
                        <td className="px-6 py-4 font-medium">{order.name}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-700">{order.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 text-slate-500">{order.dueDate}</td>
                        <td className="px-6 py-4 text-center">
                            <button className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-700 flex items-center gap-2 mx-auto">
                                <Truck size={14} /> Create DO
                            </button>
                        </td>
                    </tr>
                ))}
                {readyToShip.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">No orders ready for shipping.</td></tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default Shipping;