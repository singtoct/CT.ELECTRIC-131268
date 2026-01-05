
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Search, Package, Calculator,
    ArrowRight, ChevronDown, ChevronUp, FilePlus2, 
    AlertOctagon, CheckCircle2, Factory, LayoutList
} from 'lucide-react';
import { ProductionDocument, MoldingLog } from '../types';

const Orders: React.FC = () => {
  const data = useFactoryData();
  const { 
      production_documents = [], 
      packing_inventory = [],
      molding_logs = []
  } = data;
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [expandedProducts, setExpandedProducts] = useState<string[]>([]);

  // --- MRP LOGIC ---
  const planningData = useMemo(() => {
      const productMap: Record<string, {
          productName: string,
          totalDemand: number,
          delivered: number,
          stock: number,
          wip: number,
          qcPending: number,
          orders: { docId: string, docNumber: string, qty: number, dueDate: string, status: string }[]
      }> = {};

      production_documents.forEach(doc => {
          if (doc.status === 'Cancelled' || doc.status === 'Draft') return;
          
          doc.items.forEach(item => {
              if (!productMap[item.productName]) {
                  const stockItem = packing_inventory.find(i => i.name === item.productName && i.isoStatus === 'Released');
                  const qcItem = packing_inventory.find(i => i.name === item.productName && i.isoStatus === 'Quarantine');
                  
                  const wipQty = molding_logs
                      .filter(l => l.productName === item.productName && (l.status === 'กำลังผลิต' || l.status === 'In Progress'))
                      .reduce((sum, l) => sum + (l.targetQuantity || 0) - (l.quantityProduced || 0), 0);

                  const completedPendingQC = molding_logs
                      .filter(l => l.productName === item.productName && l.status === 'รอนับ')
                      .reduce((sum, l) => sum + (l.quantityProduced || 0), 0);

                  productMap[item.productName] = {
                      productName: item.productName,
                      totalDemand: 0,
                      delivered: 0,
                      stock: stockItem?.quantity || 0,
                      wip: wipQty,
                      qcPending: (qcItem?.quantity || 0) + completedPendingQC,
                      orders: []
                  };
              }
              
              productMap[item.productName].totalDemand += item.quantity;
              productMap[item.productName].orders.push({
                  docId: doc.id,
                  docNumber: doc.docNumber,
                  qty: item.quantity,
                  dueDate: item.dueDate,
                  status: doc.status
              });
          });
      });

      return Object.values(productMap).sort((a, b) => b.totalDemand - a.totalDemand);
  }, [production_documents, packing_inventory, molding_logs]);

  const toggleProductExpand = (name: string) => {
    setExpandedProducts(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleCreateProductionOrder = (productName: string, quantity: number) => {
      navigate('/production-docs', { 
          state: { 
              prefillProduct: productName, 
              prefillQuantity: quantity 
          } 
      });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">แผนการผลิต (MRP Dashboard)</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[4px] mt-1">Material Requirements Planning</p>
        </div>
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-slate-500 text-xs font-bold">
            <Calculator size={16}/> <span>ระบบคำนวณอัตโนมัติจากใบสั่งซื้อ</span>
        </div>
      </div>

      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {planningData.map((plan, idx) => {
              const netRequired = Math.max(0, plan.totalDemand - plan.delivered - plan.stock - plan.wip);
              const isCritical = netRequired > 0;
              const isExpanded = expandedProducts.includes(plan.productName);

              return (
                  <div key={idx} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group hover:border-blue-200 transition-all">
                      {/* Header Summary Card */}
                      <div 
                        className="p-6 cursor-pointer"
                        onClick={() => toggleProductExpand(plan.productName)}
                      >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                              <div className="flex items-center gap-4 min-w-[250px]">
                                  <div className={`p-3 rounded-2xl ${isCritical ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                      <Package size={24} />
                                  </div>
                                  <div>
                                      <h3 className="text-lg font-black text-slate-800 group-hover:text-blue-600 transition-colors">{plan.productName}</h3>
                                      <div className="flex items-center gap-3 mt-1 text-xs font-bold text-slate-400">
                                          <span>{plan.orders.length} Active Orders</span>
                                      </div>
                                  </div>
                              </div>

                              {/* Metrics Strip */}
                              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
                                  <div className="flex flex-col p-2 rounded-xl bg-slate-50/50">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">ยอดสั่งซื้อ (Demand)</span>
                                      <span className="text-lg font-black text-slate-800">{plan.totalDemand.toLocaleString()}</span>
                                  </div>
                                  <div className="flex flex-col p-2 rounded-xl bg-blue-50/50 border border-blue-100/50">
                                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider">สต็อก (Stock)</span>
                                      <span className="text-lg font-bold text-blue-600">{plan.stock.toLocaleString()}</span>
                                  </div>
                                  <div className="flex flex-col p-2 rounded-xl bg-amber-50/50 border border-amber-100/50">
                                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">กำลังผลิต (WIP)</span>
                                      <span className="text-lg font-bold text-amber-600">{plan.wip.toLocaleString()}</span>
                                  </div>
                                  <div className="flex flex-col p-2 rounded-xl bg-purple-50/50 border border-purple-100/50">
                                      <span className="text-[9px] font-black text-purple-400 uppercase tracking-wider">รอ QC</span>
                                      <span className="text-lg font-bold text-purple-600">{plan.qcPending.toLocaleString()}</span>
                                  </div>
                                  
                                  {/* Result Column */}
                                  <div className={`col-span-2 flex items-center justify-between px-4 py-2 rounded-xl border-2 ${isCritical ? 'bg-rose-50 border-rose-100' : 'bg-green-50 border-green-100'}`}>
                                      <div className="flex flex-col text-left">
                                          <span className={`text-[9px] font-black uppercase tracking-wider ${isCritical ? 'text-rose-500' : 'text-green-500'}`}>{isCritical ? 'ต้องผลิตเพิ่ม (Shortage)' : 'เพียงพอ (Sufficient)'}</span>
                                          <span className={`text-xl font-black ${isCritical ? 'text-rose-600' : 'text-green-600'}`}>{netRequired.toLocaleString()}</span>
                                      </div>
                                      {isCritical && (
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleCreateProductionOrder(plan.productName, netRequired); }}
                                            className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-rose-700 active:scale-95 transition-all flex items-center gap-2"
                                          >
                                              <Factory size={14}/> สั่งผลิตทันที
                                          </button>
                                      )}
                                      {!isCritical && <CheckCircle2 className="text-green-400" size={24}/>}
                                  </div>
                              </div>

                              <div className="text-slate-300 group-hover:text-slate-500">
                                  {isExpanded ? <ChevronUp /> : <ChevronDown />}
                              </div>
                          </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                          <div className="bg-slate-50/50 border-t border-slate-200 p-6">
                              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <LayoutList size={14}/> รายการออเดอร์ (Order Breakdown)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {plan.orders.map((order, oIdx) => (
                                      <div key={oIdx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                          <div className="flex justify-between items-start mb-2">
                                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-black font-mono">{order.docNumber}</span>
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${order.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{order.status}</span>
                                          </div>
                                          
                                          <div className="space-y-1 mb-3">
                                              <div className="flex justify-between text-xs">
                                                  <span className="text-slate-400 font-bold">Demand:</span>
                                                  <span className="font-black text-slate-800">{order.qty.toLocaleString()}</span>
                                              </div>
                                              <div className="flex justify-between text-xs">
                                                  <span className="text-slate-400 font-bold">Due Date:</span>
                                                  <span className="font-medium text-slate-600">{order.dueDate}</span>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              );
          })}
          {planningData.length === 0 && (
              <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <Package size={48} className="mx-auto mb-4 opacity-20"/>
                  <p className="font-bold">ไม่มีข้อมูลคำสั่งซื้อในระบบ</p>
                  <p className="text-xs mt-1">กรุณาสร้างใบสั่งผลิต (PO) เพื่อเริ่มการคำนวณ MRP</p>
                  <button onClick={() => navigate('/production-docs')} className="mt-4 px-6 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all">ไปที่หน้าจัดการเอกสาร</button>
              </div>
          )}
      </div>
    </div>
  );
};

export default Orders;
