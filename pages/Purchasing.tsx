
import React, { useState, useMemo, useRef } from 'react';
import { useFactoryData, useFactoryActions, useApiKey } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Plus, Search, ShoppingCart, Truck, CheckCircle2, 
    X, Edit2, Trash2, Printer, ChevronDown, Package,
    DollarSign, Calendar, Factory, ChevronLeft, ChevronRight,
    BarChart3, List, PieChart as PieIcon, TrendingUp, Scale, Clock, Star,
    AlertCircle, ArrowRight, FileCheck, ClipboardCheck, ScanLine, Loader2,
    Building2, Globe, Sparkles, Filter, Save
} from 'lucide-react';
import { FactoryPurchaseOrder, PurchaseOrderItem, FactorySupplier, FactoryQuotation, InventoryItem } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

const generateId = () => Math.random().toString(36).substr(2, 9);
const ITEMS_PER_PAGE = 10;
const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

// --- Helper: Business Lookup Simulation ---
const simulateBusinessLookup = async (query: string) => {
    // Simulate API Delay
    await new Promise(r => setTimeout(r, 800));
    
    // Mock Data mimicking a DBD/Revenue Dept API response
    return {
        name: query, 
        address: `123/45 ถนนสายธุรกิจ แขวงบางนา เขตบางนา กรุงเทพมหานคร 10260`,
        taxId: Math.floor(Math.random() * 1000000000000).toString().padStart(13, '0'),
        phone: '02-xxx-xxxx',
        contactPerson: 'ฝ่ายขาย/บริการลูกค้า'
    };
};

// Restock Assistant Component
const RestockAssistant = ({ materials, onCreatePO }: { materials: InventoryItem[], onCreatePO: (item: InventoryItem) => void }) => {
    const { t } = useTranslation();
    const lowStockItems = materials.filter(m => (m.quantity || 0) < (100)); 

    if (lowStockItems.length === 0) return null;

    return (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-4 mb-3 md:mb-0">
                <div className="bg-orange-500 text-white p-3 rounded-xl shadow-lg shadow-orange-200">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <h3 className="font-black text-orange-900 text-lg">{t('pur.smartRestock')}</h3>
                    <p className="text-orange-700 text-xs font-bold">{lowStockItems.length} {t('pur.lowStockAlert')}</p>
                </div>
            </div>
            <div className="flex gap-2 overflow-x-auto max-w-full md:max-w-xl pb-2 md:pb-0 custom-scrollbar">
                {lowStockItems.slice(0, 3).map(item => (
                    <div key={item.id} className="bg-white p-3 rounded-xl border border-orange-100 flex items-center gap-3 min-w-[200px] shadow-sm">
                        <div className="flex-1">
                            <div className="font-bold text-slate-800 text-xs truncate">{item.name}</div>
                            <div className="text-red-500 text-[10px] font-black">{item.quantity} {item.unit} left</div>
                        </div>
                        <button onClick={() => onCreatePO(item)} className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors">
                            <Plus size={14}/>
                        </button>
                    </div>
                ))}
                {lowStockItems.length > 3 && (
                    <div className="flex items-center justify-center bg-white/50 rounded-xl px-4 text-orange-800 font-bold text-xs whitespace-nowrap">
                        +{lowStockItems.length - 3} more
                    </div>
                )}
            </div>
        </div>
    );
};

const Purchasing: React.FC = () => {
  const data = useFactoryData();
  const { 
      factory_purchase_orders = [], 
      factory_suppliers = [], 
      packing_raw_materials = [],
      factory_quotations = [],
      factory_settings
  } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();
  const { apiKey } = useApiKey();

  const [view, setView] = useState<'list' | 'analytics' | 'rfq'>('list');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPO, setCurrentPO] = useState<FactoryPurchaseOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // --- NEW ITEM CREATION STATES ---
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState<Partial<FactorySupplier>>({});
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  // --- RFQ State ---
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [materialSearch, setMaterialSearch] = useState(''); // Added Search State for Materials
  
  // --- ADD QUOTE MODAL STATE ---
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<Partial<FactoryQuotation>>({});

  // --- ANALYTICS LOGIC ---
  const analyticsData = useMemo(() => {
    const validPOs = factory_purchase_orders.filter(po => {
        const poYear = new Date(po.orderDate).getFullYear();
        return poYear === selectedYear && po.status !== 'Cancelled';
    });

    let totalSpend = 0;
    let totalItemsCount = 0;
    const materialStats: Record<string, { name: string, quantity: number, cost: number, unit: string }> = {};
    const supplierStats: Record<string, { name: string, count: number, value: number }> = {};
    const monthlySpend = Array(12).fill(0).map((_, i) => ({ name: new Date(0, i).toLocaleString('en-US', { month: 'short' }), value: 0 }));

    validPOs.forEach(po => {
        const month = new Date(po.orderDate).getMonth();
        let poTotal = 0;

        po.items.forEach(item => {
            const cost = item.quantity * item.unitPrice;
            poTotal += cost;
            totalItemsCount += item.quantity;

            if (!materialStats[item.rawMaterialId]) {
                const mat = packing_raw_materials.find(m => m.id === item.rawMaterialId);
                materialStats[item.rawMaterialId] = {
                    name: mat?.name || 'Unknown',
                    quantity: 0,
                    cost: 0,
                    unit: mat?.unit || 'unit'
                };
            }
            materialStats[item.rawMaterialId].quantity += item.quantity;
            materialStats[item.rawMaterialId].cost += cost;
        });

        if (!supplierStats[po.supplierId]) {
            const sup = factory_suppliers.find(s => s.id === po.supplierId);
            supplierStats[po.supplierId] = { name: sup?.name || 'Unknown', count: 0, value: 0 };
        }
        supplierStats[po.supplierId].count += 1;
        supplierStats[po.supplierId].value += poTotal;

        monthlySpend[month].value += poTotal;
        totalSpend += poTotal;
    });

    const topMaterials = Object.values(materialStats).sort((a, b) => b.cost - a.cost);
    const topSuppliers = Object.values(supplierStats).sort((a, b) => b.value - a.value).map(s => ({ name: s.name, value: s.value }));

    return {
        totalSpend,
        totalPO: validPOs.length,
        totalItemsCount,
        topMaterials,
        topSuppliers,
        monthlySpend
    };
  }, [factory_purchase_orders, selectedYear, packing_raw_materials, factory_suppliers]);

  const filteredPOs = useMemo(() => {
    return factory_purchase_orders.filter(po => 
        po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        factory_suppliers.find(s => s.id === po.supplierId)?.name.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  }, [factory_purchase_orders, factory_suppliers, search]);

  const totalPages = Math.ceil(filteredPOs.length / ITEMS_PER_PAGE);
  const paginatedPOs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPOs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPOs, currentPage]);

  const supplierOptions = useMemo(() => 
    factory_suppliers.map(s => ({ value: s.id, label: s.name }))
  , [factory_suppliers]);

  const materialOptions = useMemo(() => 
    packing_raw_materials.map(m => ({ value: m.id, label: m.name, subLabel: `${m.quantity} ${m.unit} in stock` }))
  , [packing_raw_materials]);

  // --- ACTIONS ---

  const handleCreateNew = (prefillMaterial?: InventoryItem) => {
    setIsCreatingSupplier(false);
    setNewSupplierForm({});
    setCurrentPO({ 
        id: generateId(), 
        poNumber: `PUR-${new Date().getFullYear()}${String(factory_purchase_orders.length + 1).padStart(3, '0')}`, 
        orderDate: new Date().toISOString().split('T')[0], 
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        supplierId: factory_suppliers[0]?.id || '', 
        status: 'Pending', 
        items: [{ rawMaterialId: prefillMaterial?.id || '', quantity: 0, unitPrice: prefillMaterial?.costPerUnit || 0 }] 
    });
    setIsModalOpen(true);
  };

  const handleBusinessLookup = async () => {
      if (!newSupplierForm.name) return;
      setIsLookupLoading(true);
      try {
          const info = await simulateBusinessLookup(newSupplierForm.name);
          setNewSupplierForm(prev => ({ ...prev, ...info }));
      } catch (e) {
          console.error(e);
      } finally {
          setIsLookupLoading(false);
      }
  };

  const handleCreateSupplier = async (name: string) => {
      setIsCreatingSupplier(true);
      setNewSupplierForm({ name: name, contactPerson: '', phone: '' });
      setIsLookupLoading(true);
      try {
          const info = await simulateBusinessLookup(name);
          setNewSupplierForm(prev => ({ ...prev, ...info }));
      } finally {
          setIsLookupLoading(false);
      }
  };

  const handleCreateMaterial = async (name: string, index: number) => {
      const newMatId = generateId();
      const newMaterial: InventoryItem = {
          id: newMatId,
          name: name,
          quantity: 0,
          unit: 'unit',
          costPerUnit: 0,
          category: 'Raw Material',
          source: 'Purchased'
      };
      await updateData({
          ...data,
          packing_raw_materials: [...packing_raw_materials, newMaterial]
      });
      if (currentPO) {
          const newItems = [...currentPO.items];
          newItems[index].rawMaterialId = newMatId;
          setCurrentPO({ ...currentPO, items: newItems });
      }
  };

  const handleSavePO = async () => {
    if (!currentPO) return;
    
    let finalSupplierId = currentPO.supplierId;
    let updatedSuppliers = [...factory_suppliers];

    if (isCreatingSupplier) {
        if (!newSupplierForm.name) { alert("กรุณาระบุชื่อซัพพลายเออร์"); return; }
        const newSupId = generateId();
        const newSup: FactorySupplier = {
            id: newSupId,
            name: newSupplierForm.name,
            contactPerson: newSupplierForm.contactPerson || '-',
            phone: newSupplierForm.phone || '-'
        };
        updatedSuppliers.push(newSup);
        finalSupplierId = newSupId;
        await updateData({ ...data, factory_suppliers: updatedSuppliers });
    }

    const poToSave = { ...currentPO, supplierId: finalSupplierId };
    
    let updatedPOs = [...factory_purchase_orders];
    const idx = updatedPOs.findIndex(p => p.id === poToSave.id);
    if (idx >= 0) updatedPOs[idx] = poToSave;
    else updatedPOs.push(poToSave);

    await updateData({ ...data, factory_purchase_orders: updatedPOs, factory_suppliers: updatedSuppliers });
    setIsModalOpen(false);
  };

  const calculateTotal = (po: FactoryPurchaseOrder) => {
    return po.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  // --- QUOTE HANDLERS ---
  const handleOpenAddQuote = () => {
      if (!selectedMaterialId) return;
      const mat = packing_raw_materials.find(m => m.id === selectedMaterialId);
      setCurrentQuote({
          id: generateId(),
          rawMaterialId: selectedMaterialId,
          quotationDate: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          supplierId: '',
          pricePerUnit: 0,
          moq: 0,
          leadTimeDays: 7,
          paymentTerm: 'Credit 30 Days',
          unit: mat?.unit || 'kg',
          note: ''
      });
      setIsQuoteModalOpen(true);
  };

  const handleSaveQuote = async () => {
      if (!currentQuote.supplierId || !currentQuote.pricePerUnit) {
          alert("กรุณาระบุซัพพลายเออร์และราคา");
          return;
      }
      
      const newQuote = currentQuote as FactoryQuotation;
      const currentQuotes = factory_quotations || [];
      await updateData({ ...data, factory_quotations: [...currentQuotes, newQuote] });
      setIsQuoteModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">ระบบจัดซื้อวัตถุดิบ</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[4px] mt-1">Purchasing & Vendor Management</p>
        </div>
        <div className="flex gap-2">
            <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex">
                 <button onClick={() => setView('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${view === 'list' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                    <List size={16}/> รายการ PO
                 </button>
                 <button onClick={() => setView('rfq')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${view === 'rfq' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Scale size={16}/> {t('pur.rfq')}
                 </button>
                 <button onClick={() => setView('analytics')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${view === 'analytics' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                    <BarChart3 size={16}/> สรุปยอดซื้อ (ปี)
                 </button>
            </div>
            {view === 'list' && (
                 <button onClick={() => handleCreateNew()} className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-sm shadow-xl hover:bg-slate-800 transition-all active:scale-95"><Plus size={20} /> ออกใบสั่งซื้อ</button>
            )}
        </div>
      </div>

      {view === 'rfq' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm h-fit">
                  <h3 className="font-black text-slate-800 mb-4">{t('pur.selectMaterial')}</h3>
                  
                  {/* Search Box for Raw Materials */}
                  <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                          type="text" 
                          placeholder="ค้นหาชื่อวัตถุดิบ..." 
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-400 outline-none"
                          value={materialSearch}
                          onChange={(e) => setMaterialSearch(e.target.value)}
                      />
                  </div>

                  <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {packing_raw_materials
                        .filter(mat => mat.name.toLowerCase().includes(materialSearch.toLowerCase()))
                        .map(mat => (
                          <button 
                            key={mat.id}
                            onClick={() => setSelectedMaterialId(mat.id)}
                            className={`w-full p-4 rounded-2xl text-left border-2 transition-all ${selectedMaterialId === mat.id ? 'bg-amber-50 border-amber-400 shadow-md' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                          >
                              <div className="flex justify-between items-start">
                                  <div className="font-black text-slate-800 text-sm">{mat.name}</div>
                                  <span className="text-[10px] text-slate-400 font-mono font-bold">Stock: {mat.quantity}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                  <Scale size={12}/> {factory_quotations.filter(q => q.rawMaterialId === mat.id).length} Quotes available
                              </div>
                          </button>
                      ))}
                      {packing_raw_materials.filter(mat => mat.name.toLowerCase().includes(materialSearch.toLowerCase())).length === 0 && (
                          <div className="text-center py-8 text-slate-400 text-xs">ไม่พบวัตถุดิบที่ค้นหา</div>
                      )}
                  </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px]">
                  {selectedMaterialId ? (
                      <div className="w-full h-full flex flex-col">
                          <div className="flex justify-between items-center mb-6">
                              <div>
                                  <h3 className="text-xl font-black text-slate-800">{packing_raw_materials.find(m => m.id === selectedMaterialId)?.name}</h3>
                                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('pur.compareTitle')}</p>
                              </div>
                              <button 
                                onClick={handleOpenAddQuote}
                                className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-black transition-all"
                              >
                                  <Plus size={16}/> {t('pur.addQuote')}
                              </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {factory_quotations.filter(q => q.rawMaterialId === selectedMaterialId).map(quote => {
                                  const supplier = factory_suppliers.find(s => s.id === quote.supplierId);
                                  const isBestPrice = !factory_quotations.filter(q => q.rawMaterialId === selectedMaterialId).some(q => q.pricePerUnit < quote.pricePerUnit);
                                  const isFastest = !factory_quotations.filter(q => q.rawMaterialId === selectedMaterialId).some(q => q.leadTimeDays < quote.leadTimeDays);

                                  return (
                                      <div key={quote.id} className="p-6 rounded-3xl border-2 border-slate-100 hover:border-blue-400 transition-all relative group bg-white shadow-sm hover:shadow-md">
                                          {(isBestPrice || isFastest) && (
                                              <div className="absolute -top-3 left-4 flex gap-2">
                                                  {isBestPrice && <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow-sm flex items-center gap-1"><DollarSign size={12}/> Best Price</span>}
                                                  {isFastest && <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow-sm flex items-center gap-1"><Truck size={12}/> Fastest</span>}
                                              </div>
                                          )}
                                          <div className="flex justify-between items-start mb-4 mt-2">
                                              <div>
                                                  <h4 className="font-black text-slate-800 text-lg">{supplier?.name}</h4>
                                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Contact: {supplier?.contactPerson}</p>
                                              </div>
                                              <div className="text-right">
                                                  <div className="text-2xl font-black text-slate-800">฿{quote.pricePerUnit}</div>
                                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Per {quote.unit}</p>
                                              </div>
                                          </div>
                                          <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                                              <div className="flex justify-between"><span>MOQ:</span> <span className="font-bold">{quote.moq.toLocaleString()} {quote.unit}</span></div>
                                              <div className="flex justify-between"><span>Lead Time:</span> <span className="font-bold">{quote.leadTimeDays} Days</span></div>
                                              <div className="flex justify-between"><span>Credit:</span> <span className="font-bold">{quote.paymentTerm}</span></div>
                                          </div>
                                          <button 
                                            onClick={() => {
                                                handleCreateNew(packing_raw_materials.find(m => m.id === selectedMaterialId));
                                                if (currentPO) setCurrentPO(prev => ({...prev!, supplierId: quote.supplierId, items: [{rawMaterialId: quote.rawMaterialId, quantity: quote.moq, unitPrice: quote.pricePerUnit}]}));
                                            }}
                                            className="w-full mt-4 bg-white border-2 border-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-all flex items-center justify-center gap-2"
                                          >
                                              <ShoppingCart size={14}/> Create PO
                                          </button>
                                      </div>
                                  );
                              })}
                              {factory_quotations.filter(q => q.rawMaterialId === selectedMaterialId).length === 0 && (
                                  <div className="col-span-full text-center py-20 text-slate-400">
                                      <p>ยังไม่มีใบเสนอราคาสำหรับวัตถุดิบนี้</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  ) : (
                      <div className="text-center text-slate-300">
                          <Scale size={64} className="mx-auto mb-4 opacity-20"/>
                          <p className="font-black uppercase tracking-widest text-sm">เลือกวัตถุดิบทางซ้ายมือ<br/>เพื่อเปรียบเทียบราคา</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {view === 'analytics' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                      <div className="p-4 bg-blue-50 rounded-full text-blue-600 mb-2"><DollarSign size={32}/></div>
                      <h4 className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total Spend ({selectedYear})</h4>
                      <div className="text-3xl font-black text-slate-800 mt-1">฿{analyticsData.totalSpend.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                      <div className="p-4 bg-emerald-50 rounded-full text-emerald-600 mb-2"><Package size={32}/></div>
                      <h4 className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total Items Purchased</h4>
                      <div className="text-3xl font-black text-slate-800 mt-1">{analyticsData.totalItemsCount.toLocaleString()} <span className="text-sm text-slate-400 font-bold">Units</span></div>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                      <div className="p-4 bg-purple-50 rounded-full text-purple-600 mb-2"><FileCheck size={32}/></div>
                      <h4 className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total POs Issued</h4>
                      <div className="text-3xl font-black text-slate-800 mt-1">{analyticsData.totalPO} <span className="text-sm text-slate-400 font-bold">Orders</span></div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                      <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><BarChart3 className="text-blue-500"/> ยอดซื้อรายเดือน (Monthly Spend)</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={analyticsData.monthlySpend}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}}/>
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(val) => `${val/1000}k`}/>
                                  <Tooltip cursor={{fill: '#f8fafc'}} formatter={(val: number) => `฿${val.toLocaleString()}`}/>
                                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                      <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><PieIcon className="text-amber-500"/> สัดส่วนตาม Supplier</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={analyticsData.topSuppliers} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={5}>
                                      {analyticsData.topSuppliers.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip formatter={(val: number) => `฿${val.toLocaleString()}`}/>
                                  <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {view === 'list' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Smart Restock Assistant */}
            <RestockAssistant materials={packing_raw_materials} onCreatePO={handleCreateNew} />

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="ค้นหาเลขที่ PO หรือซัพพลายเออร์..." className="w-full pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary-50 transition-all outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronLeft size={20}/></button>
                        <span className="text-sm font-black text-slate-600">หน้า {currentPage} จาก {totalPages || 1}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronRight size={20}/></button>
                    </div>
                </div>
                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5">PO Number</th>
                                <th className="px-6 py-5">Supplier</th>
                                <th className="px-6 py-5">Date</th>
                                <th className="px-6 py-5 text-right">Total Amount</th>
                                <th className="px-6 py-5 text-center">Status</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedPOs.map((po) => {
                                const supplier = factory_suppliers.find(s => s.id === po.supplierId);
                                const total = calculateTotal(po);
                                return (
                                    <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-black text-slate-800 font-mono">{po.poNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-600">{supplier?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-slate-500">{po.orderDate}</td>
                                        <td className="px-6 py-4 text-right font-black text-slate-800">฿{total.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase flex items-center justify-center gap-1 w-fit mx-auto ${po.status === 'Received' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{po.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => { setCurrentPO({...po}); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* PO CREATE MODAL */}
      {isModalOpen && currentPO && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
                  <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">รายละเอียดใบสั่งซื้อ</h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><X size={28}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto px-10 py-8 space-y-6 max-h-[70vh]">
                      {/* Supplier Section with "Create New" Capability */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className={`transition-all ${isCreatingSupplier ? 'col-span-2 bg-amber-50 p-6 rounded-2xl border border-amber-100' : ''}`}>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
                                  <Building2 size={14}/> ซัพพลายเออร์ (Supplier)
                              </label>
                              
                              {!isCreatingSupplier ? (
                                  <SearchableSelect 
                                    options={supplierOptions} 
                                    value={currentPO.supplierId} 
                                    onChange={val => setCurrentPO({...currentPO, supplierId: val})} 
                                    onCreate={(newName) => handleCreateSupplier(newName)}
                                    placeholder="ค้นหา หรือ พิมพ์ชื่อเพื่อเพิ่มใหม่..."
                                  />
                              ) : (
                                  <div className="space-y-4">
                                      <div className="flex justify-between items-center">
                                          <div className="flex items-center gap-2 text-amber-700 font-bold">
                                              <Plus size={18}/> เพิ่มซัพพลายเออร์ใหม่
                                          </div>
                                          <button onClick={() => setIsCreatingSupplier(false)} className="text-xs text-slate-400 hover:text-slate-600 underline">กลับไปเลือกที่มีอยู่</button>
                                      </div>
                                      
                                      {/* Business Lookup Button */}
                                      <div className="flex gap-2">
                                          <input 
                                            type="text" 
                                            value={newSupplierForm.name || ''} 
                                            onChange={e => setNewSupplierForm({...newSupplierForm, name: e.target.value})} 
                                            className="flex-1 px-4 py-2 border border-amber-200 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                                            placeholder="ระบุชื่อบริษัท..."
                                          />
                                          <button 
                                            onClick={handleBusinessLookup}
                                            disabled={isLookupLoading}
                                            className="px-4 py-2 bg-white border border-amber-200 text-amber-600 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-amber-100 transition-all"
                                          >
                                              {isLookupLoading ? <Loader2 size={16} className="animate-spin"/> : <Globe size={16}/>}
                                              {isLookupLoading ? "กำลังค้นหา..." : "ดึงข้อมูลนิติบุคคล"}
                                          </button>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                          <input 
                                            type="text" 
                                            value={newSupplierForm.taxId || ''} 
                                            onChange={e => setNewSupplierForm({...newSupplierForm, taxId: e.target.value})} 
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" 
                                            placeholder="เลขผู้เสียภาษี (Tax ID)" 
                                          />
                                          <input 
                                            type="text" 
                                            value={newSupplierForm.phone || ''} 
                                            onChange={e => setNewSupplierForm({...newSupplierForm, phone: e.target.value})} 
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" 
                                            placeholder="เบอร์โทรศัพท์" 
                                          />
                                      </div>
                                      <textarea 
                                        value={newSupplierForm.address || ''} 
                                        onChange={e => setNewSupplierForm({...newSupplierForm, address: e.target.value})} 
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm h-20 resize-none" 
                                        placeholder="ที่อยู่..."
                                      />
                                  </div>
                              )}
                          </div>

                          {!isCreatingSupplier && (
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">สถานะ</label>
                                  <select value={currentPO.status} onChange={e => setCurrentPO({...currentPO, status: e.target.value as any})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-primary-500">
                                      <option value="Pending">Pending (รออนุมัติ)</option>
                                      <option value="Shipped">Shipped (กำลังส่ง)</option>
                                      <option value="Received">Received (ได้รับแล้ว)</option>
                                      <option value="Cancelled">Cancelled (ยกเลิก)</option>
                                  </select>
                              </div>
                          )}
                      </div>

                      {/* Line Items */}
                      <div className="space-y-4 pt-4">
                          <div className="flex items-center justify-between">
                              <h4 className="font-black text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                                  <Package size={16}/> รายการวัตถุดิบ (Items)
                              </h4>
                              <button onClick={() => setCurrentPO({...currentPO, items: [...currentPO.items, { rawMaterialId: '', quantity: 0, unitPrice: 0 }]})} className="text-primary-600 text-xs font-black hover:underline flex items-center gap-1">
                                  <Plus size={14}/> เพิ่มรายการ
                              </button>
                          </div>
                          
                          {currentPO.items.map((item, idx) => (
                              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-end gap-4 animate-in slide-in-from-left-2">
                                  <div className="flex-[2]">
                                      <label className="block text-[9px] font-bold text-slate-400 mb-1">วัตถุดิบ (Material)</label>
                                      <SearchableSelect 
                                        options={materialOptions} 
                                        value={item.rawMaterialId} 
                                        onChange={val => { const newItems = [...currentPO.items]; newItems[idx].rawMaterialId = val; setCurrentPO({...currentPO, items: newItems}); }} 
                                        onCreate={(newName) => handleCreateMaterial(newName, idx)}
                                        placeholder="เลือก หรือ พิมพ์เพิ่มใหม่..."
                                      />
                                  </div>
                                  <div className="flex-1">
                                      <label className="block text-[9px] font-bold text-slate-400 mb-1">จำนวน</label>
                                      <input type="number" value={item.quantity || ''} onChange={e => { const newItems = [...currentPO.items]; newItems[idx].quantity = parseFloat(e.target.value) || 0; setCurrentPO({...currentPO, items: newItems}); }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-black text-right outline-none focus:border-primary-500" placeholder="0" />
                                  </div>
                                  <div className="flex-1">
                                      <label className="block text-[9px] font-bold text-slate-400 mb-1">ราคา/หน่วย</label>
                                      <input type="number" value={item.unitPrice || ''} onChange={e => { const newItems = [...currentPO.items]; newItems[idx].unitPrice = parseFloat(e.target.value) || 0; setCurrentPO({...currentPO, items: newItems}); }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-black text-right text-emerald-600 outline-none focus:border-emerald-500" placeholder="0.00" />
                                  </div>
                                  <button onClick={() => setCurrentPO({...currentPO, items: currentPO.items.filter((_, i) => i !== idx)})} className="p-2.5 text-rose-300 hover:text-rose-500 bg-white border border-slate-200 hover:border-rose-200 rounded-xl transition-all">
                                      <Trash2 size={18}/>
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ยอดรวมสุทธิ</span>
                          <span className="text-3xl font-black text-slate-800 font-mono">฿{calculateTotal(currentPO).toLocaleString()}</span>
                      </div>
                      <div className="flex gap-4">
                          <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-500 font-black hover:bg-slate-200 rounded-2xl transition-all">ยกเลิก</button>
                          <button onClick={handleSavePO} className="px-12 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2">
                              <CheckCircle2 size={20}/> บันทึก PO
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ADD QUOTE MODAL */}
      {isQuoteModalOpen && currentQuote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in duration-200">
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 tracking-tight">เพิ่มใบเสนอราคา</h3>
                          <p className="text-xs text-slate-500 font-bold">
                              สำหรับ: {packing_raw_materials.find(m => m.id === currentQuote.rawMaterialId)?.name}
                          </p>
                      </div>
                      <button onClick={() => setIsQuoteModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><X size={24}/></button>
                  </div>
                  
                  <div className="p-8 space-y-5 flex-1 overflow-y-auto">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Supplier</label>
                          <SearchableSelect 
                              options={supplierOptions}
                              value={currentQuote.supplierId}
                              onChange={(val) => setCurrentQuote({...currentQuote, supplierId: val})}
                              placeholder="เลือกซัพพลายเออร์..."
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ราคา / หน่วย ({currentQuote.unit})</label>
                              <input 
                                type="number" 
                                value={currentQuote.pricePerUnit} 
                                onChange={e => setCurrentQuote({...currentQuote, pricePerUnit: parseFloat(e.target.value)})}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl font-black text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-right"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">MOQ (ขั้นต่ำ)</label>
                              <input 
                                type="number" 
                                value={currentQuote.moq} 
                                onChange={e => setCurrentQuote({...currentQuote, moq: parseFloat(e.target.value)})}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-right"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lead Time (วัน)</label>
                              <input 
                                type="number" 
                                value={currentQuote.leadTimeDays} 
                                onChange={e => setCurrentQuote({...currentQuote, leadTimeDays: parseInt(e.target.value)})}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Credit Term</label>
                              <input 
                                type="text" 
                                value={currentQuote.paymentTerm} 
                                onChange={e => setCurrentQuote({...currentQuote, paymentTerm: e.target.value})}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ราคาใช้ได้ถึง (Valid Until)</label>
                          <input 
                            type="date" 
                            value={currentQuote.validUntil} 
                            onChange={e => setCurrentQuote({...currentQuote, validUntil: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">หมายเหตุ</label>
                          <textarea 
                            rows={2}
                            value={currentQuote.note || ''} 
                            onChange={e => setCurrentQuote({...currentQuote, note: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            placeholder="เงื่อนไขเพิ่มเติม..."
                          />
                      </div>
                  </div>

                  <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setIsQuoteModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">ยกเลิก</button>
                      <button onClick={handleSaveQuote} className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-black transition-all flex items-center gap-2">
                          <Save size={18}/> บันทึกใบเสนอราคา
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Purchasing;
