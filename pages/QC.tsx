
import React, { useState } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { Check, X, ClipboardCheck, Package, Droplet, GitMerge, Archive, AlertCircle, ArrowRight } from 'lucide-react';
import { MoldingLog, InventoryItem, Product, ProductionDocument } from '../types';

const QC: React.FC = () => {
  const data = useFactoryData();
  const { molding_logs = [], packing_inventory = [], packing_raw_materials = [], factory_products = [], production_documents = [] } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();

  const [confirmModal, setConfirmModal] = useState<{ log: MoldingLog, destination: 'Finished' | 'Component' } | null>(null);
  const pendingJobs = molding_logs.filter(log => log.status === 'รอนับ');

  const handleProcessQC = async () => {
      if (!confirmModal) return;
      const { log, destination } = confirmModal;

      // 1. Update Log Status (Molding Log)
      const updatedLogs = molding_logs.map(l => l.id === log.id ? { ...l, status: 'เสร็จสิ้น' } : l);

      // 2. Update Inventory (Add to Stock)
      let updatedFinished = [...packing_inventory];
      let updatedMaterials = [...packing_raw_materials];

      // New Inventory Item Link logic: Prefer ID from Log, fallback to Name search
      const targetProduct = factory_products.find(p => p.id === log.productId) || 
                            factory_products.find(p => p.name === log.productName);
      
      const targetProductId = targetProduct?.id || log.productId || '';

      if (destination === 'Finished') {
          // Check for existing inventory using PRODUCT ID match if available, else Name match
          const invIdx = updatedFinished.findIndex(i => 
              (i.productId && i.productId === targetProductId) || 
              (!i.productId && i.name === log.productName && i.isoStatus === 'Released')
          );

          if (invIdx >= 0) {
              updatedFinished[invIdx] = { ...updatedFinished[invIdx], quantity: (updatedFinished[invIdx].quantity || 0) + log.quantityProduced };
          } else {
              updatedFinished.push({ 
                  id: Math.random().toString(36).substr(2,9), 
                  productId: targetProductId,
                  name: log.productName, 
                  quantity: log.quantityProduced, 
                  unit: 'pcs', 
                  category: 'Finished', 
                  source: 'Produced',
                  isoStatus: 'Released', // Automatically released after QC
                  locationId: 'loc-b-1', // Default location
                  lotNumber: log.lotNumber
              });
          }
      } else {
          // Components logic...
          const rawIdx = updatedMaterials.findIndex(i => i.name === log.productName);
          if (rawIdx >= 0) {
              updatedMaterials[rawIdx] = { ...updatedMaterials[rawIdx], quantity: (updatedMaterials[rawIdx].quantity || 0) + log.quantityProduced };
          } else {
              updatedMaterials.push({ 
                  id: Math.random().toString(36).substr(2,9), 
                  name: log.productName, 
                  quantity: log.quantityProduced, 
                  unit: 'pcs', 
                  category: 'Component', 
                  source: 'Produced' 
              });
          }
      }

      // 3. Deduct Raw Materials based on BOM (Backflush)
      if (targetProduct && targetProduct.bom) {
          targetProduct.bom.forEach(bom => {
              const amountToDeduct = bom.quantityPerUnit * log.quantityProduced;
              const idx = updatedMaterials.findIndex(r => r.id === bom.materialId);
              if (idx >= 0) {
                  updatedMaterials[idx] = { ...updatedMaterials[idx], quantity: Math.max(0, (updatedMaterials[idx].quantity || 0) - amountToDeduct) };
              }
          });
      }

      // 4. Update Production Document Status (Workflow Link)
      // Check if this job completes the production order
      let updatedDocs = [...production_documents];
      let orderCompletedMessage = "";

      if (log.orderId) {
          const docIndex = updatedDocs.findIndex(d => d.id === log.orderId);
          if (docIndex >= 0) {
              const doc = updatedDocs[docIndex];
              
              // Calculate total produced for this document so far (including current log)
              const allLogsForDoc = [...molding_logs, { ...log, quantityProduced: log.quantityProduced }]; // Include current indirectly
              
              // Recalculate based on Updated Logs state (simulated)
              // We need to count the current log which is about to be 'เสร็จสิ้น'
              const producedSoFar = updatedLogs
                  .filter(l => l.orderId === doc.id && (l.status === 'เสร็จสิ้น' || l.status === 'Completed'))
                  .reduce((sum, l) => sum + l.quantityProduced, 0);

              const totalTarget = doc.items.reduce((sum, item) => sum + item.quantity, 0);

              if (producedSoFar >= totalTarget) {
                  updatedDocs[docIndex] = { ...doc, status: 'Ready to Ship', shippingStatus: 'Ready' };
                  orderCompletedMessage = `\nProduction Order ${doc.docNumber} is now COMPLETE and ready for shipping.`;
              }
          }
      }

      await updateData({ 
          ...data, 
          molding_logs: updatedLogs, 
          packing_inventory: updatedFinished, 
          packing_raw_materials: updatedMaterials,
          production_documents: updatedDocs
      });
      
      setConfirmModal(null);
      alert(`บันทึกเรียบร้อย: ${log.productName} จำนวน ${log.quantityProduced} เข้าคลังสำเร็จ${orderCompletedMessage}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">{t('qc.title')}</h2>
            <p className="text-slate-500">ตรวจสอบคุณภาพและนำสินค้าเข้าคลังที่เหมาะสม</p>
        </div>
        <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg font-bold border border-primary-200 text-sm">รอนับ & QC: {pendingJobs.length} งาน</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingJobs.map((log) => (
            <div key={log.id} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col hover:shadow-xl transition-all">
              <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">{log.lotNumber}</span>
                      <span className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded uppercase animate-pulse">Waiting QC</span>
                  </div>
                  <h4 className="font-black text-slate-800 text-lg mb-4 leading-tight">{log.productName}</h4>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                          <span className="text-[10px] text-emerald-600 uppercase block font-bold">Good (OK)</span>
                          <span className="text-2xl font-black text-emerald-700 font-mono">{log.quantityProduced.toLocaleString()}</span>
                      </div>
                      <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                          <span className="text-[10px] text-rose-600 uppercase block font-bold">Reject (NG)</span>
                          <span className="text-2xl font-black text-rose-600 font-mono">{log.quantityRejected.toLocaleString()}</span>
                      </div>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Package size={12}/> Machine: <span className="font-bold text-slate-600">{log.machine}</span>
                  </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                  <button onClick={() => setConfirmModal({ log, destination: 'Finished' })} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:bg-green-700 transition-all text-sm">
                      <Check size={18}/> Passed QC (เข้าคลัง FG)
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmModal({ log, destination: 'Component' })} className="flex-1 bg-white border border-slate-200 text-slate-600 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-50 text-xs">
                        <GitMerge size={14}/> เก็บเป็นอะไหล่
                    </button>
                    <button className="px-3 py-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 font-bold text-xs">
                        Reject All
                    </button>
                  </div>
              </div>
            </div>
        ))}
        {pendingJobs.length === 0 && (
            <div className="col-span-full py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <ClipboardCheck size={48} className="mb-4 text-slate-200"/>
                <p>ไม่มีงานที่รอตรวจสอบคุณภาพในขณะนี้</p>
                <p className="text-xs mt-2 text-slate-300">ฝ่ายผลิตยังไม่ได้ส่งมอบงาน</p>
            </div>
        )}
      </div>

      {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-6 text-center space-y-4">
                      <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${confirmModal.destination === 'Finished' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                          {confirmModal.destination === 'Finished' ? <Archive size={32}/> : <GitMerge size={32}/>}
                      </div>
                      <div>
                          <h3 className="text-xl font-black text-slate-800">ยืนยันการรับเข้าคลัง</h3>
                          <p className="text-sm text-slate-500 mt-2">คุณกำลังจะนำ <span className="font-bold text-slate-700">{confirmModal.log.productName}</span> เข้าสู่ <span className="font-bold text-primary-600">{confirmModal.destination === 'Finished' ? 'คลังสินค้าสำเร็จรูป (FG)' : 'คลังชิ้นส่วนประกอบ'}</span></p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 text-left">
                          <AlertCircle size={18} className="text-blue-500 shrink-0"/>
                          <div className="space-y-1">
                              <p className="text-[11px] text-blue-700 font-bold">System Actions:</p>
                              <ul className="text-[10px] text-blue-600 list-disc pl-3 leading-tight">
                                  <li>ตัดสต็อกวัตถุดิบ (BOM) อัตโนมัติ</li>
                                  <li>เพิ่มยอด FG ในคลัง (Link ID: {confirmModal.log.productId || 'N/A'})</li>
                                  <li>อัปเดตสถานะใบสั่งผลิต (PO Progress)</li>
                              </ul>
                          </div>
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                      <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl">ยกเลิก</button>
                      <button onClick={handleProcessQC} className="flex-1 py-3 bg-primary-600 text-white font-black rounded-xl shadow-lg hover:bg-primary-700">ยืนยัน</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default QC;
