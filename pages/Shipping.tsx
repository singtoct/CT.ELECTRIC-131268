
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { Truck, CheckCircle, Calendar, FileText, Package, AlertOctagon, X, Save } from 'lucide-react';
import { ProductionDocument, InventoryItem } from '../types';

const Shipping: React.FC = () => {
  const { production_documents = [], packing_inventory = [] } = useFactoryData();
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();
  const data = useFactoryData();

  const [shippingModal, setShippingModal] = useState<ProductionDocument | null>(null);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');

  // Filter orders that are ready to ship or completed
  const shippingQueue = useMemo(() => {
      return production_documents
          .filter(doc => 
              doc.status === 'Ready to Ship' || 
              doc.status === 'Completed' || 
              doc.status === 'Approved' // Sometimes partial shipping is allowed
          )
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [production_documents]);

  const handleOpenShipping = (doc: ProductionDocument) => {
      setShippingModal(doc);
      // Auto-select first available inventory lot for the product
      const item = doc.items[0];
      const inv = packing_inventory.find(i => i.name === item.productName && (i.quantity || 0) > 0);
      if (inv) setSelectedInventoryId(inv.id);
  };

  const handleDispatch = async () => {
      if (!shippingModal) return;
      if (!selectedInventoryId) {
          alert("กรุณาเลือก Lot สินค้าที่จะตัดจ่าย");
          return;
      }

      const invItem = packing_inventory.find(i => i.id === selectedInventoryId);
      if (!invItem) return;

      const orderItem = shippingModal.items[0];
      const shipQty = orderItem.quantity; // Assuming full ship for simplicity, can be partial in future

      if ((invItem.quantity || 0) < shipQty) {
          alert(`สินค้าในคลังไม่พอ (มี ${invItem.quantity}, ต้องการ ${shipQty})`);
          return;
      }

      // 1. Deduct Inventory
      const updatedInventory = packing_inventory.map(i => 
          i.id === selectedInventoryId 
          ? { ...i, quantity: i.quantity - shipQty } 
          : i
      );

      // 2. Update Document Status
      const updatedDocs = production_documents.map(d => 
          d.id === shippingModal.id 
          ? { 
              ...d, 
              status: 'Completed', 
              shippingStatus: 'Completed', 
              items: d.items.map(i => ({...i, deliveredQuantity: shipQty})) 
            } as ProductionDocument
          : d
      );

      await updateData({ ...data, packing_inventory: updatedInventory, production_documents: updatedDocs });
      setShippingModal(null);
      alert(`Dispatch Successful! Order ${shippingModal.docNumber} marked as Completed.`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">{t('nav.shipping')}</h2>
            <p className="text-slate-500 text-sm">จัดการการจัดส่งสินค้า (Dispatch & DO)</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold text-xs border border-blue-100 flex items-center gap-2">
            <Truck size={16}/> รอจัดส่ง: {shippingQueue.filter(d => d.status !== 'Completed').length} Orders
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                    <th className="px-6 py-4">PO Number</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Product Detail</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {shippingQueue.map(doc => {
                    const item = doc.items[0];
                    const isReady = doc.status === 'Ready to Ship';
                    const isCompleted = doc.status === 'Completed';

                    return (
                        <tr key={doc.id} className={`hover:bg-slate-50 transition-colors ${isCompleted ? 'bg-slate-50/50 opacity-60' : ''}`}>
                            <td className="px-6 py-4">
                                <span className="font-mono font-black text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">{doc.docNumber}</span>
                                <div className="text-[10px] text-slate-400 mt-1">{doc.date}</div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-800">{doc.customerName || 'Unknown'}</td>
                            <td className="px-6 py-4">
                                <div className="font-medium text-slate-900">{item.productName}</div>
                                <div className="text-xs text-slate-500">Qty: {item.quantity.toLocaleString()} {item.unit}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border inline-flex items-center gap-1
                                    ${isCompleted ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                                      isReady ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                      'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                    {isCompleted ? <CheckCircle size={10}/> : <Truck size={10}/>}
                                    {doc.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {!isCompleted && (
                                    <button 
                                        onClick={() => handleOpenShipping(doc)}
                                        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition-all shadow-md flex items-center gap-2 mx-auto active:scale-95"
                                    >
                                        <Truck size={14} /> Dispatch
                                    </button>
                                )}
                                {isCompleted && <span className="text-xs font-bold text-green-600 flex items-center justify-center gap-1"><CheckCircle size={14}/> Shipped</span>}
                            </td>
                        </tr>
                    );
                })}
                {shippingQueue.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-400">ไม่มีรายการรอจัดส่ง</td></tr>
                )}
            </tbody>
        </table>
      </div>

      {/* Dispatch Modal */}
      {shippingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-xl font-black text-slate-800">Dispatch Order</h3>
                          <p className="text-xs text-slate-500 font-bold">{shippingModal.docNumber}</p>
                      </div>
                      <button onClick={() => setShippingModal(null)} className="p-2 text-slate-300 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  
                  <div className="p-8 space-y-6">
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                          <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-2">Order Summary</h4>
                          <div className="flex justify-between items-end">
                              <div>
                                  <p className="font-bold text-slate-800">{shippingModal.items[0].productName}</p>
                                  <p className="text-xs text-slate-500">Customer: {shippingModal.customerName}</p>
                              </div>
                              <div className="text-xl font-black text-blue-700">{shippingModal.items[0].quantity.toLocaleString()} <span className="text-xs font-bold">Units</span></div>
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Stock Lot (FIFO)</label>
                          <select 
                            value={selectedInventoryId}
                            onChange={(e) => setSelectedInventoryId(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                              <option value="">-- Select Inventory --</option>
                              {packing_inventory
                                  .filter(i => i.name === shippingModal.items[0].productName && (i.quantity || 0) > 0)
                                  .map(inv => (
                                      <option key={inv.id} value={inv.id}>
                                          Lot: {inv.lotNumber} | Available: {inv.quantity} {inv.unit} | Loc: {inv.locationId}
                                      </option>
                                  ))
                              }
                          </select>
                          {packing_inventory.filter(i => i.name === shippingModal.items[0].productName && (i.quantity || 0) > 0).length === 0 && (
                              <div className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                                  <AlertOctagon size={12}/> No stock available for this product. Ensure QC is passed.
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setShippingModal(null)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
                      <button 
                        onClick={handleDispatch}
                        disabled={!selectedInventoryId}
                        className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          <Truck size={18}/> Confirm Dispatch
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Shipping;
