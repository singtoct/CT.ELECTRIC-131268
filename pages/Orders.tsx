
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Search, Package, Calculator,
    ArrowRight, ChevronDown, ChevronUp, FilePlus2, 
    AlertOctagon, CheckCircle2, Factory, LayoutList,
    PlusCircle, Play, PauseCircle, MoreHorizontal, X, Save, Clock, Truck
} from 'lucide-react';
import { ProductionDocument, MoldingLog } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const Orders: React.FC = () => {
  const data = useFactoryData();
  const { production_documents = [], packing_inventory = [], molding_logs = [], factory_products = [], factory_machines = [] } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [expandedProducts, setExpandedProducts] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  
  // Quick Log Modal State
  const [quickLogModal, setQuickLogModal] = useState<{
      docId: string, 
      productName: string, 
      productId: string,
      docNumber: string,
      target: number,
      produced: number
  } | null>(null);
  const [logForm, setLogForm] = useState({ qty: 0, machine: '', status: 'กำลังผลิต' });

  const planningData = useMemo(() => {
      const productMap: Record<string, {
          productId?: string, productName: string, totalDemand: number, delivered: number, stock: number, wip: number, qcPending: number,
          orders: { docId: string, docNumber: string, qty: number, produced: number, delivered: number, dueDate: string, status: string, customer: string }[]
      }> = {};

      production_documents.forEach(doc => {
          if (doc.status === 'Cancelled' || doc.status === 'Draft') return;
          
          doc.items.forEach(item => {
              // Filter by search
              if (search && !item.productName.toLowerCase().includes(search.toLowerCase()) && !doc.docNumber.toLowerCase().includes(search.toLowerCase())) return;

              // Calculate Produced Amount for this specific Order Item
              const producedForOrder = molding_logs
                  .filter(l => l.orderId === doc.id && l.productName === item.productName)
                  .reduce((sum, l) => sum + (l.quantityProduced || 0), 0);

              if (!productMap[item.productName]) {
                  const stockItem = packing_inventory.find(i => i.name === item.productName && i.isoStatus === 'Released');
                  const qcItem = packing_inventory.find(i => i.name === item.productName && i.isoStatus === 'Quarantine');
                  const wipQty = molding_logs.filter(l => l.productName === item.productName && (l.status === 'กำลังผลิต' || l.status === 'In Progress')).reduce((sum, l) => sum + (l.targetQuantity || 0) - (l.quantityProduced || 0), 0);
                  const completedPendingQC = molding_logs.filter(l => l.productName === item.productName && l.status === 'รอนับ').reduce((sum, l) => sum + (l.quantityProduced || 0), 0);
                  
                  const resolvedProductId = item.productId || factory_products.find(p => p.name === item.productName)?.id;

                  productMap[item.productName] = {
                      productId: resolvedProductId,
                      productName: item.productName, totalDemand: 0, delivered: 0, stock: stockItem?.quantity || 0,
                      wip: wipQty, qcPending: (qcItem?.quantity || 0) + completedPendingQC, orders: []
                  };
              }
              productMap[item.productName].totalDemand += item.quantity;
              
              productMap[item.productName].orders.push({ 
                  docId: doc.id, 
                  docNumber: doc.docNumber, 
                  qty: item.quantity, 
                  produced: producedForOrder,
                  delivered: item.deliveredQuantity || 0,
                  dueDate: item.dueDate, 
                  status: doc.status,
                  customer: doc.customerName
              });
          });
      });
      return Object.values(productMap).sort((a, b) => b.totalDemand - a.totalDemand);
  }, [production_documents, packing_inventory, molding_logs, factory_products, search]);

  const toggleProductExpand = (name: string) => {
    setExpandedProducts(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleCreateProductionOrder = (productName: string, productId: string | undefined, quantity: number) => {
      navigate('/production-docs', { state: { prefillProduct: productName, prefillProductId: productId, prefillQuantity: quantity } });
  };

  // --- QUICK ACTIONS ---

  const handleOpenQuickLog = (order: any, productName: string, productId?: string) => {
      setQuickLogModal({
          docId: order.docId,
          docNumber: order.docNumber,
          productName: productName,
          productId: productId || '',
          target: order.qty,
          produced: order.produced
      });
      // Default machine selection
      const defaultMachine = factory_machines.find(m => m.status === 'ทำงาน')?.name || factory_machines[0]?.name || '';
      setLogForm({ qty: 0, machine: defaultMachine, status: 'กำลังผลิต' });
  };

  const handleSaveQuickLog = async () => {
      if (!quickLogModal) return;
      if (logForm.qty <= 0) { alert("กรุณาระบุจำนวนที่ผลิตได้"); return; }

      const newLog: MoldingLog = {
          id: generateId(),
          jobId: `QL-${Date.now().toString().slice(-6)}`,
          orderId: quickLogModal.docId,
          lotNumber: quickLogModal.docNumber,
          productName: quickLogModal.productName,
          productId: quickLogModal.productId,
          machine: logForm.machine,
          date: new Date().toISOString().split('T')[0],
          shift: 'Quick',
          quantityProduced: logForm.qty,
          quantityRejected: 0,
          targetQuantity: quickLogModal.target,
          status: logForm.status,
          operatorName: 'Admin (Quick)',
          startTime: new Date().toISOString()
      };

      // Update Machine Status if selected
      const updatedMachines = factory_machines.map(m => 
          m.name === logForm.machine ? { ...m, status: 'ทำงาน' } : m
      );

      // Update Document Status logic (Simulated check)
      const totalProducedNow = quickLogModal.produced + logForm.qty;
      let updatedDocs = production_documents;
      
      if (totalProducedNow >= quickLogModal.target) {
          // Auto update doc status if complete? Maybe optional.
          // For now let's just save the log.
      }

      // If status is 'รอนับ' -> Auto add to QC Pending? (Logic handled in QC page mostly)

      await updateData({ 
          ...data, 
          molding_logs: [...molding_logs, newLog],
          factory_machines: updatedMachines
      });

      setQuickLogModal(null);
  };

  const handleChangeOrderStatus = async (docId: string, newStatus: string) => {
      const updatedDocs = production_documents.map(d => d.id === docId ? { ...d, status: newStatus } : d);
      await updateData({ ...data, production_documents: updatedDocs });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t('mrp.title')} & Control</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[4px] mt-1">Production Command Center</p>
        </div>
        <div className="flex gap-2">
            <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="ค้นหาออเดอร์ / สินค้า..." 
                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary-50 outline-none"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
            <button 
                onClick={() => navigate('/production-docs')} 
                className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md"
            >
                <FilePlus2 size={16}/> สร้างออเดอร์ใหม่
            </button>
        </div>
      </div>

      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {planningData.map((plan, idx) => {
              const netRequired = Math.max(0, plan.totalDemand - plan.delivered - plan.stock - plan.wip);
              const isCritical = netRequired > 0;
              const isExpanded = expandedProducts.includes(plan.productName);

              return (
                  <div key={idx} className={`bg-white rounded-3xl shadow-sm border transition-all ${isCritical ? 'border-amber-200 shadow-amber-50' : 'border-slate-200'}`}>
                      {/* Product Summary Header */}
                      <div className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => toggleProductExpand(plan.productName)}>
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                              <div className="flex items-center gap-4 min-w-[250px]">
                                  <div className={`p-3 rounded-2xl ${isCritical ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}><Package size={24} /></div>
                                  <div>
                                      <h3 className="text-lg font-black text-slate-800 hover:text-blue-600 transition-colors">{plan.productName}</h3>
                                      <div className="flex items-center gap-3 mt-1 text-xs font-bold text-slate-400">
                                          <span>{plan.orders.length} Active Jobs</span>
                                          {plan.stock > 0 && <span className="text-emerald-600 bg-emerald-50 px-1.5 rounded">Stock: {plan.stock.toLocaleString()}</span>}
                                      </div>
                                  </div>
                              </div>
                              
                              {/* Status Indicators */}
                              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">ยอดสั่ง (Demand)</span>
                                      <span className="text-base font-black text-slate-800">{plan.totalDemand.toLocaleString()}</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 border border-blue-100">
                                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider">WIP (ผลิตอยู่)</span>
                                      <span className="text-base font-black text-blue-700">{plan.wip.toLocaleString()}</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-50 border border-purple-100">
                                      <span className="text-[9px] font-black text-purple-400 uppercase tracking-wider">QC (รอนับ)</span>
                                      <span className="text-base font-black text-purple-700">{plan.qcPending.toLocaleString()}</span>
                                  </div>
                                  
                                  {/* Action Button for shortage */}
                                  <div className="flex items-center justify-center">
                                      {isCritical ? (
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleCreateProductionOrder(plan.productName, plan.productId, netRequired); }}
                                            className="w-full h-full bg-amber-500 text-white rounded-xl font-bold text-xs shadow-md hover:bg-amber-600 active:scale-95 transition-all flex flex-col items-center justify-center"
                                          >
                                              <AlertOctagon size={16} className="mb-1"/>
                                              <span>ขาด {netRequired.toLocaleString()}</span>
                                          </button>
                                      ) : (
                                          <div className="w-full h-full bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex flex-col items-center justify-center font-bold text-xs">
                                              <CheckCircle2 size={18} className="mb-1"/>
                                              <span>พอแล้ว</span>
                                          </div>
                                      )}
                                  </div>
                              </div>
                              <div className="text-slate-300 self-center">{isExpanded ? <ChevronUp /> : <ChevronDown />}</div>
                          </div>
                      </div>

                      {/* Interactive Order List (The "Command Center" Part) */}
                      {isExpanded && (
                          <div className="bg-slate-50 border-t border-slate-200 p-6 rounded-b-3xl">
                              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><LayoutList size={14}/> รายการสั่งผลิตย่อย (Job Breakdown)</h4>
                              <div className="space-y-3">
                                  {plan.orders.map((order, oIdx) => {
                                      const progress = order.qty > 0 ? (order.produced / order.qty) * 100 : 0;
                                      const isCompleted = progress >= 100;
                                      const isReadyToShip = order.status === 'Ready to Ship';
                                      
                                      return (
                                          <div key={oIdx} className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row items-center gap-4 transition-all ${isCompleted ? 'border-slate-200 opacity-80' : 'border-blue-200 ring-1 ring-blue-50'} ${isReadyToShip ? 'border-green-400 ring-1 ring-green-100' : ''}`}>
                                              {/* Info Column */}
                                              <div className="flex-1 w-full">
                                                  <div className="flex items-center justify-between mb-2">
                                                      <div className="flex items-center gap-2">
                                                          <span className="bg-slate-800 text-white px-2 py-1 rounded text-[10px] font-black font-mono">{order.docNumber}</span>
                                                          <span className="text-xs font-bold text-slate-600">{order.customer || 'ลูกค้าทั่วไป'}</span>
                                                      </div>
                                                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                                          <Clock size={10}/> Due: {order.dueDate}
                                                      </div>
                                                  </div>
                                                  
                                                  {/* Progress Bar */}
                                                  <div className="relative pt-2">
                                                      <div className="flex justify-between items-end text-xs mb-1">
                                                          <span className="font-bold text-slate-500">
                                                              ผลิตแล้ว: <b className="text-blue-600 text-sm">{order.produced.toLocaleString()}</b> 
                                                              <span className="mx-1 text-slate-300">/</span> 
                                                              เป้าหมาย: {order.qty.toLocaleString()}
                                                          </span>
                                                          <span className="font-black text-blue-600">{progress.toFixed(0)}%</span>
                                                      </div>
                                                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                                          <div className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} style={{width: `${Math.min(progress, 100)}%`}}></div>
                                                      </div>
                                                  </div>
                                              </div>

                                              {/* Actions Column */}
                                              <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                                                  {/* Status Selector */}
                                                  <div className="relative group">
                                                      <button className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 border transition-all ${
                                                          order.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                                          order.status === 'In Progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                          order.status === 'Ready to Ship' ? 'bg-green-600 text-white border-green-600' :
                                                          'bg-slate-100 text-slate-600 border-slate-200'
                                                      }`}>
                                                          {order.status === 'In Progress' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>}
                                                          {order.status} <ChevronDown size={10}/>
                                                      </button>
                                                      <div className="absolute right-0 bottom-full mb-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl hidden group-hover:block z-20 py-1">
                                                          {['Approved', 'In Progress', 'Material Checking', 'Ready to Ship', 'Completed', 'Cancelled'].map(st => (
                                                              <button 
                                                                key={st} 
                                                                onClick={() => handleChangeOrderStatus(order.docId, st)}
                                                                className="block w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-slate-50 text-slate-700"
                                                              >
                                                                  {st}
                                                              </button>
                                                          ))}
                                                      </div>
                                                  </div>

                                                  {/* Quick Log Button */}
                                                  <button 
                                                    onClick={() => handleOpenQuickLog(order, plan.productName, plan.productId)}
                                                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-95"
                                                    title="Quick Production Log"
                                                  >
                                                      <PlusCircle size={18}/>
                                                  </button>
                                                  
                                                  {/* Shipping shortcut */}
                                                  <button 
                                                    onClick={() => navigate('/shipping')}
                                                    className="bg-white text-slate-400 border border-slate-200 p-2 rounded-lg hover:text-slate-600 hover:bg-slate-50 transition-all"
                                                    title="Go to Shipping"
                                                  >
                                                      <Truck size={18}/>
                                                  </button>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      )}
                  </div>
              );
          })}
          {planningData.length === 0 && (
              <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <Package size={48} className="mx-auto mb-4 opacity-20"/>
                  <p className="font-bold">{t('mrp.noData')}</p>
              </div>
          )}
      </div>

      {/* QUICK LOG MODAL */}
      {quickLogModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-lg font-black text-slate-800">บันทึกยอดด่วน (Quick Log)</h3>
                          <p className="text-xs text-slate-500 font-bold">{quickLogModal.docNumber} | {quickLogModal.productName}</p>
                      </div>
                      <button onClick={() => setQuickLogModal(null)} className="p-2 text-slate-300 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
                          <p className="text-xs text-blue-600 font-bold uppercase mb-1">เป้าหมายที่เหลือ</p>
                          <p className="text-3xl font-black text-blue-700">{Math.max(0, quickLogModal.target - quickLogModal.produced).toLocaleString()} <span className="text-sm">pcs</span></p>
                      </div>
                      
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">จำนวนที่ผลิตเสร็จวันนี้</label>
                          <input 
                            type="number" 
                            autoFocus
                            value={logForm.qty || ''} 
                            onChange={e => setLogForm({...logForm, qty: parseInt(e.target.value) || 0})}
                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-xl font-black text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none"
                            placeholder="0"
                          />
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">เครื่องจักร</label>
                          <select 
                            value={logForm.machine}
                            onChange={e => setLogForm({...logForm, machine: e.target.value})}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-700 bg-white"
                          >
                              {factory_machines.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                          </select>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">สถานะงาน (Job Status)</label>
                          <select 
                            value={logForm.status}
                            onChange={e => setLogForm({...logForm, status: e.target.value})}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-700 bg-white"
                          >
                              <option value="กำลังผลิต">กำลังผลิต (In Progress)</option>
                              <option value="รอนับ">ผลิตเสร็จ/รอนับ (Pending QC)</option>
                          </select>
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                      <button onClick={() => setQuickLogModal(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-all">ยกเลิก</button>
                      <button onClick={handleSaveQuickLog} className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                          <Save size={18}/> บันทึกทันที
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Orders;
