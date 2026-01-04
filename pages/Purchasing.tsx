
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Plus, Search, ShoppingCart, Truck, CheckCircle2, 
    X, Edit2, Trash2, Printer, ChevronDown, Package,
    DollarSign, Calendar, Factory, ChevronLeft, ChevronRight,
    BarChart3, List, PieChart as PieIcon, TrendingUp, Scale, Clock, Star
} from 'lucide-react';
import { FactoryPurchaseOrder, PurchaseOrderItem, FactorySupplier, FactoryQuotation } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts';

const generateId = () => Math.random().toString(36).substr(2, 9);
const ITEMS_PER_PAGE = 10;
const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

const Purchasing: React.FC = () => {
  const data = useFactoryData();
  const { 
      factory_purchase_orders = [], 
      factory_suppliers = [], 
      packing_raw_materials = [],
      factory_quotations = []
  } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();

  const [view, setView] = useState<'list' | 'analytics' | 'rfq'>('list');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPO, setCurrentPO] = useState<FactoryPurchaseOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // --- RFQ State ---
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<FactoryQuotation | null>(null);

  // --- ANALYTICS LOGIC ---
  const analyticsData = useMemo(() => {
    // Filter POs by Year and Status (Received/Shipped counts as cost incurred usually, but let's take Received for actual stock)
    // Assuming Boss wants to know what we actually bought (Approved/Received)
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

            // Material Aggregation
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

        // Supplier Aggregation
        if (!supplierStats[po.supplierId]) {
            const sup = factory_suppliers.find(s => s.id === po.supplierId);
            supplierStats[po.supplierId] = { name: sup?.name || 'Unknown', count: 0, value: 0 };
        }
        supplierStats[po.supplierId].count += 1;
        supplierStats[po.supplierId].value += poTotal;

        // Monthly Aggregation
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
  // -----------------------

  // --- RFQ LOGIC ---
  const activeQuotations = useMemo(() => {
      if (!selectedMaterialId) return [];
      return factory_quotations.filter(q => q.rawMaterialId === selectedMaterialId);
  }, [selectedMaterialId, factory_quotations]);

  const bestPriceQuote = useMemo(() => {
      if (activeQuotations.length === 0) return null;
      return activeQuotations.reduce((prev, curr) => prev.pricePerUnit < curr.pricePerUnit ? prev : curr);
  }, [activeQuotations]);

  const fastestLeadTimeQuote = useMemo(() => {
      if (activeQuotations.length === 0) return null;
      return activeQuotations.reduce((prev, curr) => prev.leadTimeDays < curr.leadTimeDays ? prev : curr);
  }, [activeQuotations]);
  // -----------------

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

  const handleCreateNew = () => {
    setCurrentPO({ id: generateId(), poNumber: `PUR-${new Date().getFullYear()}${String(factory_purchase_orders.length + 1).padStart(3, '0')}`, orderDate: new Date().toISOString().split('T')[0], expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], supplierId: factory_suppliers[0]?.id || '', status: 'Pending', items: [{ rawMaterialId: '', quantity: 0, unitPrice: 0 }] });
    setIsModalOpen(true);
  };

  const handleSavePO = async () => {
    if (!currentPO) return;
    let updatedPOs = [...factory_purchase_orders];
    const idx = updatedPOs.findIndex(p => p.id === currentPO.id);
    if (idx >= 0) updatedPOs[idx] = currentPO;
    else updatedPOs.push(currentPO);
    await updateData({ ...data, factory_purchase_orders: updatedPOs });
    setIsModalOpen(false);
  };

  const handleReceiveStock = async (po: FactoryPurchaseOrder) => {
    if (!window.confirm("Confirm receiving all items in this PO? Stock will be added to inventory.")) return;
    const updatedPOs = factory_purchase_orders.map(p => p.id === po.id ? { ...p, status: 'Received' } : p);
    const updatedMaterials = [...packing_raw_materials];
    po.items.forEach(item => {
        const matIdx = updatedMaterials.findIndex(m => m.id === item.rawMaterialId);
        if (matIdx >= 0) {
            // Update Cost Per Unit to Latest Price or Average? Keeping it simple: Latest Price
            updatedMaterials[matIdx] = { 
                ...updatedMaterials[matIdx], 
                quantity: (updatedMaterials[matIdx].quantity || 0) + item.quantity, 
                costPerUnit: item.unitPrice 
            };
        }
    });
    await updateData({ ...data, factory_purchase_orders: updatedPOs, packing_raw_materials: updatedMaterials });
    alert("Stock updated successfully!");
  };

  const handleSaveQuote = async () => {
      if (!currentQuote) return;
      let updatedQuotes = [...(factory_quotations || [])];
      
      // If setting as preferred, unset others for this material
      if (currentQuote.isPreferred) {
          updatedQuotes = updatedQuotes.map(q => q.rawMaterialId === currentQuote.rawMaterialId ? { ...q, isPreferred: false } : q);
      }

      const idx = updatedQuotes.findIndex(q => q.id === currentQuote.id);
      if (idx >= 0) updatedQuotes[idx] = currentQuote;
      else updatedQuotes.push(currentQuote);

      await updateData({ ...data, factory_quotations: updatedQuotes });
      setIsQuoteModalOpen(false);
  };

  const deleteQuote = async (id: string) => {
      if (!confirm("Delete this quotation?")) return;
      await updateData({ ...data, factory_quotations: factory_quotations.filter(q => q.id !== id) });
  };

  const calculateTotal = (po: FactoryPurchaseOrder) => {
    return po.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
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
                 <button onClick={handleCreateNew} className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-sm shadow-xl hover:bg-slate-800 transition-all active:scale-95"><Plus size={20} /> ออกใบสั่งซื้อ</button>
            )}
        </div>
      </div>

      {view === 'rfq' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <style type="text/css" media="print">{`
                  @page { size: landscape; margin: 10mm; }
                  .print-hidden { display: none !important; }
              `}</style>

              <div className="print-hidden flex flex-col md:flex-row gap-6">
                  {/* Left: Material List */}
                  <div className="w-full md:w-80 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[70vh]">
                      <div className="p-6 border-b border-slate-100 bg-slate-50">
                          <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">เลือกวัตถุดิบเทียบราคา</h3>
                      </div>
                      <div className="p-4 border-b border-slate-100">
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                              <input 
                                  type="text" 
                                  placeholder="ค้นหา..." 
                                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                                  value={search}
                                  onChange={(e) => setSearch(e.target.value)}
                              />
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                          {packing_raw_materials.filter(m => m.name.toLowerCase().includes(search.toLowerCase())).map(mat => {
                              const quoteCount = factory_quotations.filter(q => q.rawMaterialId === mat.id).length;
                              return (
                                  <button 
                                      key={mat.id} 
                                      onClick={() => setSelectedMaterialId(mat.id)}
                                      className={`w-full text-left p-4 rounded-xl border transition-all group ${selectedMaterialId === mat.id ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white border-slate-100 hover:border-amber-300'}`}
                                  >
                                      <div className="font-bold text-sm truncate">{mat.name}</div>
                                      <div className={`text-xs mt-1 flex justify-between ${selectedMaterialId === mat.id ? 'text-amber-100' : 'text-slate-400'}`}>
                                          <span>Stock: {mat.quantity}</span>
                                          <span className="font-black flex items-center gap-1"><Scale size={12}/> {quoteCount} Quotes</span>
                                      </div>
                                  </button>
                              );
                          })}
                      </div>
                  </div>

                  {/* Right: Comparison Table */}
                  <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      {selectedMaterialId ? (
                          <>
                              <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center print-hidden">
                                  <div>
                                      <h3 className="text-2xl font-black text-slate-800">{t('pur.compareTitle')}</h3>
                                      <p className="text-sm text-slate-500 font-medium mt-1">{packing_raw_materials.find(m => m.id === selectedMaterialId)?.name}</p>
                                  </div>
                                  <div className="flex gap-3">
                                      <button onClick={() => window.print()} className="bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-50 flex items-center gap-2">
                                          <Printer size={16}/> Print Summary
                                      </button>
                                      <button 
                                          onClick={() => {
                                              setCurrentQuote({
                                                  id: generateId(),
                                                  rawMaterialId: selectedMaterialId,
                                                  supplierId: '',
                                                  pricePerUnit: 0,
                                                  moq: 0,
                                                  unit: 'kg',
                                                  leadTimeDays: 7,
                                                  paymentTerm: 'Credit 30 Days',
                                                  quotationDate: new Date().toISOString().split('T')[0],
                                                  validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                                  note: '',
                                                  isPreferred: false
                                              });
                                              setIsQuoteModalOpen(true);
                                          }}
                                          className="bg-amber-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-amber-600 shadow-lg shadow-amber-200 flex items-center gap-2"
                                      >
                                          <Plus size={16}/> {t('pur.addQuote')}
                                      </button>
                                  </div>
                              </div>

                              <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                                  {activeQuotations.length > 0 ? (
                                      <div className="w-full">
                                          {/* Title for Print */}
                                          <div className="hidden print:block mb-6">
                                              <h1 className="text-2xl font-black">{t('pur.compareTitle')}</h1>
                                              <p className="text-lg">Product: {packing_raw_materials.find(m => m.id === selectedMaterialId)?.name}</p>
                                          </div>

                                          <table className="w-full border-collapse">
                                              <thead>
                                                  <tr>
                                                      <th className="p-4 text-left border-b-2 border-slate-100 w-1/4">
                                                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Comparison Criteria</span>
                                                      </th>
                                                      {activeQuotations.map(q => {
                                                          const supplierName = factory_suppliers.find(s => s.id === q.supplierId)?.name || 'Unknown';
                                                          return (
                                                              <th key={q.id} className={`p-4 text-center border-b-2 border-slate-100 min-w-[200px] relative ${q.isPreferred ? 'bg-amber-50 border-amber-200' : ''}`}>
                                                                  {q.isPreferred && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">SELECTED</div>}
                                                                  <div className="font-black text-slate-800 text-lg">{supplierName}</div>
                                                                  <div className="text-[10px] font-bold text-slate-400 mt-1">{q.quotationDate}</div>
                                                                  <div className="print-hidden absolute top-2 right-2 flex gap-1">
                                                                     <button onClick={() => { setCurrentQuote(q); setIsQuoteModalOpen(true); }} className="p-1 text-slate-300 hover:text-blue-500"><Edit2 size={12}/></button>
                                                                     <button onClick={() => deleteQuote(q.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                                                                  </div>
                                                              </th>
                                                          );
                                                      })}
                                                  </tr>
                                              </thead>
                                              <tbody className="text-sm">
                                                  {/* Price Row */}
                                                  <tr>
                                                      <td className="p-4 border-b border-slate-50 font-bold text-slate-600">{t('pur.price')}</td>
                                                      {activeQuotations.map(q => (
                                                          <td key={q.id} className={`p-4 text-center border-b border-slate-50 font-mono text-xl font-black ${bestPriceQuote?.id === q.id ? 'text-green-600 bg-green-50/50' : 'text-slate-800'}`}>
                                                              {bestPriceQuote?.id === q.id && <span className="block text-[9px] font-bold uppercase text-green-500 mb-1">{t('pur.bestPrice')}</span>}
                                                              ฿{q.pricePerUnit.toLocaleString()}
                                                          </td>
                                                      ))}
                                                  </tr>
                                                  {/* MOQ Row */}
                                                  <tr>
                                                      <td className="p-4 border-b border-slate-50 font-bold text-slate-600">{t('pur.moq')}</td>
                                                      {activeQuotations.map(q => (
                                                          <td key={q.id} className="p-4 text-center border-b border-slate-50 font-bold text-slate-700">
                                                              {q.moq.toLocaleString()} {q.unit}
                                                          </td>
                                                      ))}
                                                  </tr>
                                                  {/* Credit Term Row */}
                                                  <tr>
                                                      <td className="p-4 border-b border-slate-50 font-bold text-slate-600">{t('pur.credit')}</td>
                                                      {activeQuotations.map(q => (
                                                          <td key={q.id} className="p-4 text-center border-b border-slate-50 font-bold text-slate-700">
                                                              <span className="bg-slate-100 px-2 py-1 rounded text-xs">{q.paymentTerm}</span>
                                                          </td>
                                                      ))}
                                                  </tr>
                                                  {/* Lead Time Row */}
                                                  <tr>
                                                      <td className="p-4 border-b border-slate-50 font-bold text-slate-600">{t('pur.leadTime')}</td>
                                                      {activeQuotations.map(q => (
                                                          <td key={q.id} className={`p-4 text-center border-b border-slate-50 font-bold ${fastestLeadTimeQuote?.id === q.id ? 'text-blue-600 bg-blue-50/30' : 'text-slate-700'}`}>
                                                              {fastestLeadTimeQuote?.id === q.id && <Clock size={14} className="inline mr-1 -mt-0.5"/>}
                                                              {q.leadTimeDays} Days
                                                          </td>
                                                      ))}
                                                  </tr>
                                                  {/* Valid Until */}
                                                  <tr>
                                                      <td className="p-4 border-b border-slate-50 font-bold text-slate-600">{t('pur.validUntil')}</td>
                                                      {activeQuotations.map(q => (
                                                          <td key={q.id} className="p-4 text-center border-b border-slate-50 text-xs text-slate-500 font-medium">
                                                              {q.validUntil}
                                                          </td>
                                                      ))}
                                                  </tr>
                                                  {/* Notes */}
                                                  <tr>
                                                      <td className="p-4 border-b border-slate-50 font-bold text-slate-600 align-top">{t('pur.notes')}</td>
                                                      {activeQuotations.map(q => (
                                                          <td key={q.id} className="p-4 text-center border-b border-slate-50 text-xs text-slate-500 italic align-top">
                                                              {q.note || '-'}
                                                          </td>
                                                      ))}
                                                  </tr>
                                                  {/* Select Button (Hidden on Print) */}
                                                  <tr className="print-hidden">
                                                      <td className="p-4"></td>
                                                      {activeQuotations.map(q => (
                                                          <td key={q.id} className="p-4 text-center">
                                                              {!q.isPreferred ? (
                                                                  <button onClick={() => { setCurrentQuote({...q, isPreferred: true}); handleSaveQuote(); }} className="w-full py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:border-amber-500 hover:text-amber-600 transition-all">
                                                                      Select
                                                                  </button>
                                                              ) : (
                                                                  <div className="flex items-center justify-center gap-1 text-amber-600 text-xs font-black">
                                                                      <CheckCircle2 size={16}/> Selected
                                                                  </div>
                                                              )}
                                                          </td>
                                                      ))}
                                                  </tr>
                                              </tbody>
                                          </table>
                                      </div>
                                  ) : (
                                      <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                          <Scale size={64} className="mb-4 opacity-20"/>
                                          <p className="font-black uppercase tracking-widest text-xs">No quotations added yet</p>
                                          <button 
                                              onClick={() => {
                                                  setCurrentQuote({
                                                      id: generateId(),
                                                      rawMaterialId: selectedMaterialId,
                                                      supplierId: '',
                                                      pricePerUnit: 0,
                                                      moq: 0,
                                                      unit: 'kg',
                                                      leadTimeDays: 7,
                                                      paymentTerm: 'Credit 30 Days',
                                                      quotationDate: new Date().toISOString().split('T')[0],
                                                      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                                      note: '',
                                                      isPreferred: false
                                                  });
                                                  setIsQuoteModalOpen(true);
                                              }}
                                              className="mt-4 text-amber-600 font-bold text-xs hover:underline"
                                          >
                                              + Add First Quote
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50/50">
                              <Package size={64} className="mb-4 opacity-20"/>
                              <p className="font-black uppercase tracking-widest text-xs">{t('pur.selectMaterial')}</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {view === 'analytics' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Year Filter */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                 <div className="flex items-center gap-2">
                    <Calendar className="text-primary-600" size={24}/>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">เลือกปีงบประมาณ</h3>
                        <p className="text-xs text-slate-400">แสดงข้อมูลการจัดซื้อตามปีที่เลือก</p>
                    </div>
                 </div>
                 <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
                 >
                    {[0, 1, 2, 3].map(i => {
                        const y = new Date().getFullYear() - i;
                        return <option key={y} value={y}>{y}</option>
                    })}
                 </select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">ยอดซื้อรวมปี {selectedYear}</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">฿{analyticsData.totalSpend.toLocaleString()}</h3>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl text-green-600"><DollarSign size={24}/></div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">จำนวน PO ทั้งหมด</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{analyticsData.totalPO} <span className="text-sm font-medium text-slate-400">ใบ</span></h3>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><List size={24}/></div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">ปริมาณการซื้อรวม</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{analyticsData.totalItemsCount.toLocaleString()} <span className="text-sm font-medium text-slate-400">Units</span></h3>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><Package size={24}/></div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-primary-600"/> แนวโน้มการจัดซื้อรายเดือน</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData.monthlySpend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(value) => `฿${value/1000}k`}/>
                                <Tooltip formatter={(value: number) => `฿${value.toLocaleString()}`} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                                <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={4} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><PieIcon size={20} className="text-purple-600"/> สัดส่วนยอดซื้อตาม Supplier</h3>
                    <div className="h-80 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analyticsData.topSuppliers}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {analyticsData.topSuppliers.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `฿${value.toLocaleString()}`} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '12px', fontWeight: 'bold'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Material Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2"><Factory size={20} className="text-slate-400"/> สรุปยอดซื้อแยกตามวัตถุดิบ (Top Materials)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100 bg-white">
                            <tr>
                                <th className="px-8 py-4">อันดับ</th>
                                <th className="px-6 py-4">ชื่อวัตถุดิบ</th>
                                <th className="px-6 py-4 text-right">ปริมาณรวม</th>
                                <th className="px-6 py-4 text-right">มูลค่ารวม</th>
                                <th className="px-6 py-4 text-right">% ของยอดซื้อ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {analyticsData.topMaterials.map((mat, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-8 py-4 font-mono text-slate-300 font-bold">#{idx + 1}</td>
                                    <td className="px-6 py-4 font-bold text-slate-700">{mat.name}</td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-600">{mat.quantity.toLocaleString()} {mat.unit}</td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-slate-800">฿{mat.cost.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-block bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">
                                            {analyticsData.totalSpend > 0 ? ((mat.cost / analyticsData.totalSpend) * 100).toFixed(1) : 0}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {analyticsData.topMaterials.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-10 text-slate-400">ไม่มีข้อมูลการซื้อในปี {selectedYear}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {view === 'list' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="ค้นหาเลขที่ PO หรือซัพพลายเออร์..." className="w-full pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary-50 transition-all outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronLeft size={20}/></button>
                    <span className="text-sm font-black text-slate-600">หน้า {currentPage} จาก {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronRight size={20}/></button>
                </div>
            </div>
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
                                        <div className="flex items-center justify-end gap-2">
                                            {po.status !== 'Received' && <button onClick={() => handleReceiveStock(po)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl" title="Receive Stock"><CheckCircle2 size={18} /></button>}
                                            <button onClick={() => { setCurrentPO({...po}); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* PO CREATE MODAL */}
      {isModalOpen && currentPO && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
                  <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">รายละเอียดใบสั่งซื้อ</h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><X size={28}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-10 py-8 space-y-6 max-h-[70vh]">
                      <div className="grid grid-cols-2 gap-6">
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">ซัพพลายเออร์</label><SearchableSelect options={supplierOptions} value={currentPO.supplierId} onChange={val => setCurrentPO({...currentPO, supplierId: val})} /></div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">สถานะ</label><select value={currentPO.status} onChange={e => setCurrentPO({...currentPO, status: e.target.value as any})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold bg-white"><option value="Pending">Pending</option><option value="Shipped">Shipped</option><option value="Received">Received</option><option value="Cancelled">Cancelled</option></select></div>
                      </div>
                      <div className="space-y-4 pt-4">
                          <div className="flex items-center justify-between"><h4 className="font-black text-slate-700 uppercase text-xs tracking-widest">รายการวัตถุดิบ</h4><button onClick={() => setCurrentPO({...currentPO, items: [...currentPO.items, { rawMaterialId: '', quantity: 0, unitPrice: 0 }]})} className="text-primary-600 text-xs font-black hover:underline">+ เพิ่มรายการ</button></div>
                          {currentPO.items.map((item, idx) => (
                              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-end gap-4">
                                  <div className="flex-[2]"><SearchableSelect options={materialOptions} value={item.rawMaterialId} onChange={val => { const newItems = [...currentPO.items]; newItems[idx].rawMaterialId = val; setCurrentPO({...currentPO, items: newItems}); }} /></div>
                                  <div className="flex-1"><input type="number" value={item.quantity || ''} onChange={e => { const newItems = [...currentPO.items]; newItems[idx].quantity = parseFloat(e.target.value) || 0; setCurrentPO({...currentPO, items: newItems}); }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-black text-right" /></div>
                                  <div className="flex-1"><input type="number" value={item.unitPrice || ''} onChange={e => { const newItems = [...currentPO.items]; newItems[idx].unitPrice = parseFloat(e.target.value) || 0; setCurrentPO({...currentPO, items: newItems}); }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-black text-right text-emerald-600" /></div>
                                  <button onClick={() => setCurrentPO({...currentPO, items: currentPO.items.filter((_, i) => i !== idx)})} className="p-2 text-rose-300 hover:text-rose-500"><Trash2 size={20}/></button>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ยอดรวมสุทธิ</span><span className="text-3xl font-black text-slate-800 font-mono">฿{calculateTotal(currentPO).toLocaleString()}</span></div>
                      <div className="flex gap-4"><button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-500 font-black hover:bg-slate-200 rounded-2xl transition-all">ยกเลิก</button><button onClick={handleSavePO} className="px-12 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95">บันทึก</button></div>
                  </div>
              </div>
          </div>
      )}

      {/* RFQ / QUOTATION MODAL */}
      {isQuoteModalOpen && currentQuote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in duration-200">
                  <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-amber-50">
                      <h3 className="text-xl font-black text-amber-900 tracking-tight">{currentQuote.id && factory_quotations.find(q=>q.id===currentQuote.id) ? 'แก้ไขใบเสนอราคา' : 'เพิ่มใบเสนอราคาใหม่'}</h3>
                      <button onClick={() => setIsQuoteModalOpen(false)} className="p-2 text-amber-300 hover:text-amber-700 hover:bg-amber-100 rounded-full transition-all"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('pur.supplier')}</label>
                          <SearchableSelect options={supplierOptions} value={currentQuote.supplierId} onChange={val => setCurrentQuote({...currentQuote, supplierId: val})} placeholder="Select Supplier..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('pur.price')}</label>
                              <input type="number" value={currentQuote.pricePerUnit || ''} onChange={e => setCurrentQuote({...currentQuote, pricePerUnit: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold text-right" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('pur.moq')}</label>
                              <input type="number" value={currentQuote.moq || ''} onChange={e => setCurrentQuote({...currentQuote, moq: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold text-right" />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('pur.credit')}</label>
                              <select value={currentQuote.paymentTerm} onChange={e => setCurrentQuote({...currentQuote, paymentTerm: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold bg-white text-sm">
                                  <option value="Cash">Cash (เงินสด)</option>
                                  <option value="Credit 30 Days">Credit 30 Days</option>
                                  <option value="Credit 60 Days">Credit 60 Days</option>
                                  <option value="Credit 90 Days">Credit 90 Days</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('pur.leadTime')}</label>
                              <input type="number" value={currentQuote.leadTimeDays || ''} onChange={e => setCurrentQuote({...currentQuote, leadTimeDays: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold text-right" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t('pur.notes')}</label>
                          <textarea rows={2} value={currentQuote.note} onChange={e => setCurrentQuote({...currentQuote, note: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="เงื่อนไขเพิ่มเติม..."></textarea>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                          <input type="checkbox" id="isPreferred" checked={currentQuote.isPreferred} onChange={e => setCurrentQuote({...currentQuote, isPreferred: e.target.checked})} className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500 border-gray-300"/>
                          <label htmlFor="isPreferred" className="text-sm font-bold text-slate-700">Set as Preferred Supplier (เลือกเจ้านี้)</label>
                      </div>
                  </div>
                  <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setIsQuoteModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-all text-xs uppercase">Cancel</button>
                      <button onClick={handleSaveQuote} className="px-8 py-3 bg-amber-500 text-white font-black rounded-xl shadow-lg hover:bg-amber-600 transition-all text-xs uppercase">Save Quote</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Purchasing;
