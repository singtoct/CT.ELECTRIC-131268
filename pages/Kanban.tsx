import React from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { PackingOrder } from '../types';

const KanbanColumn = ({ title, color, orders, count }: { title: string, color: string, orders: PackingOrder[], count: number }) => (
    <div className="flex-1 min-w-[280px] bg-slate-100 rounded-xl p-4 flex flex-col h-full">
        <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${color}`}>
            <h3 className="font-bold text-slate-700">{title}</h3>
            <span className="bg-white text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">{count}</span>
        </div>
        <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar pr-1">
            {orders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{order.lotNumber || 'NO-LOT'}</span>
                        <span className="text-xs text-slate-400">{order.dueDate}</span>
                    </div>
                    <h4 className="font-medium text-slate-800 text-sm line-clamp-2 mb-2">{order.name}</h4>
                    <div className="flex justify-between items-end">
                        <div className="text-xs text-slate-500">
                            Qty: <span className="font-bold text-slate-700">{order.quantity.toLocaleString()}</span>
                        </div>
                        <div className="text-xs px-2 py-1 rounded bg-slate-50 text-slate-500 border border-slate-100">
                            {order.color}
                        </div>
                    </div>
                </div>
            ))}
            {orders.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8 italic">No orders</div>
            )}
        </div>
    </div>
);

const Kanban: React.FC = () => {
  const { packing_orders } = useFactoryData();
  const { t } = useTranslation();

  const openOrders = packing_orders.filter(o => !o.status || o.status === 'Open');
  const inProgressOrders = packing_orders.filter(o => o.status === 'In Progress' || o.status === 'Working');
  // Mocking QC status based on random logic or if status is 'QC' (since data might not have it explicitly set yet)
  const qcOrders = packing_orders.filter(o => o.status === 'Pending QC'); 
  const completedOrders = packing_orders.filter(o => o.status === 'Completed');

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{t('nav.kanban')}</h2>
        <p className="text-slate-500">Visual production flow</p>
      </div>
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        <KanbanColumn title="Backlog / Open" color="border-slate-400" orders={openOrders} count={openOrders.length} />
        <KanbanColumn title="In Production" color="border-blue-500" orders={inProgressOrders} count={inProgressOrders.length} />
        <KanbanColumn title="Quality Control" color="border-yellow-500" orders={qcOrders} count={qcOrders.length} />
        <KanbanColumn title="Ready to Ship" color="border-green-500" orders={completedOrders} count={completedOrders.length} />
      </div>
    </div>
  );
};

export default Kanban;
