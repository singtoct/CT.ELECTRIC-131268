
import React, { useState } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { Check, X, ClipboardCheck, Package, Droplet, GitMerge, Archive, AlertCircle } from 'lucide-react';
import { MoldingLog, InventoryItem, Product } from '../types';

const QC: React.FC = () => {
  const data = useFactoryData();
  const { molding_logs = [], packing_inventory = [], packing_raw_materials = [], factory_products = [] } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();

  const [confirmModal, setConfirmModal] = useState<{ log: MoldingLog, destination: 'Finished' | 'Component' } | null>(null);
  const pendingJobs = molding_logs.filter(log => log.status === 'รอนับ');

  const handleProcessQC = async () => {
      if (!confirmModal) return;
      const { log, destination } = confirmModal;

      // 1. Update Log Status
      const updatedLogs = molding_logs.map(l => l.id === log.id ? { ...l, status: 'เสร็จสิ้น' } : l);

      // 2. Update Inventory
      let updatedFinished = [...packing_inventory];
      let updatedMaterials = [...packing_raw_materials];

      if (destination === 'Finished') {
          const invIdx = updatedFinished.findIndex(i => i.name === log.productName);
          if (invIdx >= 0) {
              // Fix: Corrected typo from 'finishedIdx' to 'invIdx'
              updatedFinished[invIdx] = { ...updatedFinished[invIdx], quantity: (updatedFinished[invIdx].quantity || 0) + log.quantityProduced };
          } else {
              updatedFinished.push({ id: Math.random().toString(36).substr(2,9), name: log.productName, quantity: log.quantityProduced, unit: 'pcs', category: 'Finished', source: 'Produced' });
          }
      } else {
          const rawIdx = updatedMaterials.findIndex(i => i.name === log.productName);
          if (rawIdx >= 0) {
              updatedMaterials[rawIdx] = { ...updatedMaterials[rawIdx], quantity: (updatedMaterials[rawIdx].quantity || 0) + log.quantityProduced, category: 'Component', source: 'Produced' };
          } else {
              updatedMaterials.push({ id: Math.random().toString(36).substr(2,9), name: log.productName, quantity: log.quantityProduced, unit: 'pcs', category: 'Component', source: 'Produced' });
          }
      }

      // 3. Deduct BOM
      const product = factory_products.find(p => p.name === log.productName || p.id === log.productId);
      if (product && product.bom) {
          product.bom.forEach(bom => {
              const amountToDeduct = bom.quantityPerUnit * log.quantityProduced;
              const idx = updatedMaterials.findIndex(r => r.id === bom.materialId);
              if (idx >= 0) {
                  updatedMaterials[idx] = { ...updatedMaterials[idx], quantity: Math.max(0, (updatedMaterials[idx].quantity || 0) - amountToDeduct) };
              }
          });
      }

      await updateData({ ...data, molding_logs: updatedLogs, packing_inventory: updatedFinished, packing_raw_materials: updatedMaterials });
      setConfirmModal(null);
      alert(`บันทึกเรียบร้อย: ${log.productName} จำนวน ${log.quantityProduced} เข้าคลัง ${destination === 'Finished' ? 'สินค้าสำเร็จรูป' : 'ชิ้นส่วนประกอบ'} เรียบร้อยแล้ว`);
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
            <div key={log.id} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{log.jobId}</span>
                      <span className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Waiting QC</span>
                  </div>
                  <h4 className="font-black text-slate-800 text-lg mb-4">{log.productName}</h4>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">ยอดผลิตได้</span>
                          <span className="text-xl font-black text-primary-600 font-mono">{log.quantityProduced.toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">ของเสีย</span>
                          <span className="text-xl font-black text-red-500 font-mono">{log.quantityRejected.toLocaleString()}</span>
                      </div>
                  </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                  <button onClick={() => setConfirmModal({ log, destination: 'Finished' })} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100"><Archive size={18}/> เข้าคลังสินค้าสำเร็จรูป</button>
                  <button onClick={() => setConfirmModal({ log, destination: 'Component' })} className="w-full bg-orange-500 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-100"><GitMerge size={18}/> เข้าคลังชิ้นส่วน (รอประกอบ)</button>
              </div>
            </div>
        ))}
        {pendingJobs.length === 0 && (
            <div className="col-span-full py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <ClipboardCheck size={48} className="mb-4 text-slate-200"/>
                <p>ไม่มีงานที่รอตรวจสอบคุณภาพในขณะนี้</p>
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
                          <p className="text-sm text-slate-500 mt-2">คุณกำลังจะนำ <span className="font-bold text-slate-700">{confirmModal.log.productName}</span> เข้าสู่ <span className="font-bold text-primary-600">{confirmModal.destination === 'Finished' ? 'คลังสินค้าสำเร็จรูป' : 'คลังชิ้นส่วนประกอบ'}</span></p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 text-left">
                          <AlertCircle size={18} className="text-blue-500 shrink-0"/>
                          <p className="text-[11px] text-blue-700 italic">ระบบจะหักวัตถุดิบ (เม็ดพลาสติก) ออกจากคลังโดยอัตโนมัติตามสูตรผลิตที่ตั้งไว้</p>
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                      <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl">ยกเลิก</button>
                      <button onClick={handleProcessQC} className="flex-1 py-3 bg-primary-600 text-white font-black rounded-xl shadow-lg">ยืนยัน</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default QC;
