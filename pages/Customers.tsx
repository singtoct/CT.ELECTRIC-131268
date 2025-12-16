import React from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { Users, Phone, MapPin, ShoppingBag } from 'lucide-react';

const Customers: React.FC = () => {
  const { packing_orders } = useFactoryData();
  const { t } = useTranslation();

  // Aggregate orders by Customer ID to create a "Customer Database" view
  const customers = packing_orders.reduce((acc: any[], order) => {
      // Safety Check: Skip orders without valid customerId
      if (!order.customerId) return acc;

      const existing = acc.find(c => c.id === order.customerId);
      if (existing) {
          existing.totalOrders += 1;
          existing.totalValue += (order.quantity * order.salePrice);
          existing.lastOrder = order.dueDate > existing.lastOrder ? order.dueDate : existing.lastOrder;
      } else {
          // Safe substring usage
          const shortId = order.customerId.length > 6 ? order.customerId.substring(0,6) : order.customerId;
          
          acc.push({
              id: order.customerId,
              name: `Customer ${shortId.toUpperCase()}`, // Mock Name
              totalOrders: 1,
              totalValue: (order.quantity * order.salePrice),
              lastOrder: order.dueDate,
              status: 'Active'
          });
      }
      return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('nav.customers')}</h2>
        <p className="text-slate-500">Derived from order history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((cust) => (
            <div key={cust.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 bg-primary-50 rounded-full flex items-center justify-center text-primary-600">
                        <Users size={24} />
                    </div>
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">{cust.status}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-1">{cust.name}</h3>
                <p className="text-xs text-slate-400 font-mono mb-4">ID: {cust.id}</p>
                
                <div className="space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 flex items-center gap-2"><ShoppingBag size={14}/> Total Orders</span>
                        <span className="font-medium text-slate-800">{cust.totalOrders}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 flex items-center gap-2">💰 Lifetime Value</span>
                        <span className="font-bold text-green-600">฿{cust.totalValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 flex items-center gap-2"><ClockIcon/> Last Active</span>
                        <span className="text-slate-800">{cust.lastOrder}</span>
                    </div>
                </div>
            </div>
        ))}
        {customers.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                No customer data found in orders.
            </div>
        )}
      </div>
    </div>
  );
};

// Simple Icon helper
const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
)

export default Customers;