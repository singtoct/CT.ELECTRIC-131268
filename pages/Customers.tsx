
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Users, Phone, MapPin, ShoppingBag, Plus, Search, 
    Edit2, Trash2, X, Save, Building2, UserCircle, History,
    TrendingUp, Mail
} from 'lucide-react';
import { FactoryCustomer } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const Customers: React.FC = () => {
  const data = useFactoryData();
  const { 
      factory_customers = [], 
      packing_orders = [], 
      production_documents = [] 
  } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<FactoryCustomer | null>(null);
  const [search, setSearch] = useState('');

  // --- LOGIC: Merge Customer Data with Order Stats ---
  const customerStats = useMemo(() => {
      const stats: Record<string, { totalOrders: number, totalRevenue: number, lastOrderDate: string }> = {};

      // 1. Calculate from Packing Orders (Old System)
      packing_orders.forEach(order => {
          if (!order.customerId) return;
          // Try to match by ID or Name (fuzzy match)
          const key = order.customerId; 
          if (!stats[key]) stats[key] = { totalOrders: 0, totalRevenue: 0, lastOrderDate: '' };
          
          stats[key].totalOrders += 1;
          stats[key].totalRevenue += (order.quantity * order.salePrice);
          if (order.dueDate > stats[key].lastOrderDate) stats[key].lastOrderDate = order.dueDate;
      });

      // 2. Calculate from Production Documents (New System)
      production_documents.forEach(doc => {
          // Here we match by Name mostly as doc stores customerName
          // We will try to map it to an ID later in the render loop
      });

      return stats;
  }, [packing_orders, production_documents]);

  const filteredCustomers = useMemo(() => {
      let customers = [...factory_customers];
      
      // If no customers exist, maybe show derived ones? 
      // For now, let's strictly use the factory_customers list for management,
      // but you can add an "Import from Orders" feature later if needed.
      
      return customers.filter(c => 
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.contactPerson.toLowerCase().includes(search.toLowerCase())
      );
  }, [factory_customers, search]);

  // --- ACTIONS ---

  const handleSave = async () => {
      if (!currentCustomer) return;
      if (!currentCustomer.name) { alert("กรุณาระบุชื่อลูกค้า"); return; }

      let updatedCustomers = [...factory_customers];
      if (currentCustomer.id) {
          // Edit
          updatedCustomers = updatedCustomers.map(c => c.id === currentCustomer.id ? currentCustomer : c);
      } else {
          // Add
          const newCustomer = { ...currentCustomer, id: generateId() };
          updatedCustomers.push(newCustomer);
      }

      await updateData({ ...data, factory_customers: updatedCustomers });
      setIsModalOpen(false);
      setCurrentCustomer(null);
  };

  const handleDelete = async (id: string) => {
      if (!confirm("ยืนยันการลบข้อมูลลูกค้า? ประวัติการสั่งซื้อจะยังคงอยู่")) return;
      const updatedCustomers = factory_customers.filter(c => c.id !== id);
      await updateData({ ...data, factory_customers: updatedCustomers });
  };

  const openModal = (customer?: FactoryCustomer) => {
      if (customer) {
          setCurrentCustomer({ ...customer });
      } else {
          setCurrentCustomer({
              id: '',
              name: '',
              address: '',
              contactPerson: '',
              phone: ''
          });
      }
      setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t('nav.customers')}</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[4px] mt-1">Client Relationship Management</p>
        </div>
        <button 
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"
        >
            <Plus size={20} /> เพิ่มลูกค้าใหม่
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อบริษัท หรือ ผู้ติดต่อ..." 
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary-50 transition-all outline-none shadow-sm" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCustomers.map((cust) => {
            // Find stats for this customer
            // Strategy: Match ID first, then Name
            const stat = customerStats[cust.id] || Object.values(customerStats).find((_, idx) => Object.keys(customerStats)[idx] === cust.id) || { totalOrders: 0, totalRevenue: 0, lastOrderDate: '-' };
            
            // Fallback match by name for stats derived from old orders that might not have ID linked
            const derivedStat = packing_orders.reduce((acc, o) => {
                 if (o.customerId === cust.id || (o as any).customerName === cust.name) {
                     acc.totalOrders++;
                     acc.totalRevenue += (o.quantity * o.salePrice);
                 }
                 return acc;
            }, { totalOrders: 0, totalRevenue: 0 });

            const finalStats = stat.totalOrders > 0 ? stat : derivedStat;

            return (
                <div key={cust.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button onClick={() => openModal(cust)} className="p-2 bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded-xl"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(cust.id)} className="p-2 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl"><Trash2 size={16}/></button>
                    </div>

                    <div className="flex items-start gap-4 mb-6">
                        <div className="h-16 w-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center text-slate-500 font-black text-2xl shadow-inner border border-white">
                            {cust.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-black text-lg text-slate-800 line-clamp-1" title={cust.name}>{cust.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-medium">
                                <UserCircle size={14}/> {cust.contactPerson || '-'}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-medium">
                                <Phone size={14}/> {cust.phone || '-'}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0"/>
                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{cust.address || 'ไม่ระบุที่อยู่'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-1">ยอดคำสั่งซื้อ</span>
                                <div className="flex items-center gap-2">
                                    <ShoppingBag size={16} className="text-blue-600"/>
                                    <span className="text-lg font-black text-blue-800">{finalStats.totalOrders}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                <span className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wide mb-1">ยอดซื้อรวม (LTV)</span>
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={16} className="text-emerald-600"/>
                                    <span className="text-sm font-black text-emerald-800 truncate">฿{finalStats.totalRevenue.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
        
        {filteredCustomers.length === 0 && (
            <div className="col-span-full py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-center">
                <Users size={64} className="mb-4 opacity-20"/>
                <p className="font-bold text-lg text-slate-600">ยังไม่มีข้อมูลลูกค้า</p>
                <p className="text-sm">เริ่มเพิ่มฐานข้อมูลลูกค้าของคุณได้เลย</p>
                <button 
                    onClick={() => openModal()}
                    className="mt-6 px-6 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-all"
                >
                    เพิ่มลูกค้าคนแรก
                </button>
            </div>
        )}
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && currentCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">
                          {currentCustomer.id ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"><X size={24}/></button>
                  </div>
                  
                  <div className="p-8 space-y-5 flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ชื่อบริษัท / ลูกค้า <span className="text-red-500">*</span></label>
                          <div className="relative">
                              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                              <input 
                                  type="text" 
                                  value={currentCustomer.name} 
                                  onChange={e => setCurrentCustomer({...currentCustomer, name: e.target.value})} 
                                  placeholder="ระบุชื่อลูกค้า..."
                                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ผู้ติดต่อ</label>
                              <div className="relative">
                                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                  <input 
                                      type="text" 
                                      value={currentCustomer.contactPerson} 
                                      onChange={e => setCurrentCustomer({...currentCustomer, contactPerson: e.target.value})} 
                                      placeholder="ชื่อผู้ติดต่อ..."
                                      className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">เบอร์โทรศัพท์</label>
                              <div className="relative">
                                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                  <input 
                                      type="text" 
                                      value={currentCustomer.phone} 
                                      onChange={e => setCurrentCustomer({...currentCustomer, phone: e.target.value})} 
                                      placeholder="0xx-xxx-xxxx"
                                      className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                                  />
                              </div>
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ที่อยู่จัดส่ง / ออกบิล</label>
                          <div className="relative">
                              <MapPin className="absolute left-4 top-4 text-slate-400" size={18}/>
                              <textarea 
                                  rows={3}
                                  value={currentCustomer.address} 
                                  onChange={e => setCurrentCustomer({...currentCustomer, address: e.target.value})} 
                                  placeholder="ระบุที่อยู่..."
                                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                              />
                          </div>
                      </div>
                  </div>

                  <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">ยกเลิก</button>
                      <button onClick={handleSave} className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-black transition-all flex items-center gap-2">
                          <Save size={18}/> บันทึกข้อมูล
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Customers;
