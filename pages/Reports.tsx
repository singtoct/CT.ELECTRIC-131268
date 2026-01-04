
import React, { useState, useMemo } from 'react';
import { useFactoryData, useApiKey } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Calendar, Printer, ShoppingCart, Factory, 
    Download, ChevronDown, Filter, FileText,
    PieChart as PieIcon, TrendingUp, Users, BrainCircuit,
    Sparkles, AlertTriangle, Briefcase, Coins
} from 'lucide-react';
import { FactoryPurchaseOrder, MoldingLog, InventoryItem } from '../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

// Mock AI Colors
const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

interface PurchasingRow {
    id: string;
    date: string;
    poNumber: string;
    supplierName: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    unit: string;
}

interface ProductionRow {
    productName: string;
    totalQuantity: number;
    jobCount: number;
    unit: string;
}

const Reports: React.FC = () => {
  const { 
      factory_purchase_orders, 
      packing_raw_materials, 
      molding_logs, 
      factory_suppliers,
      factory_settings,
      packing_orders,
      packing_employees,
      factory_machines
  } = useFactoryData();
  const { t } = useTranslation();
  const { apiKey } = useApiKey();
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'summary' | 'sales' | 'purchasing' | 'production'>('summary');
  
  // AI State
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- 1. Customer & Sales Analysis (Risk Management) ---
  const salesAnalysis = useMemo(() => {
      const customerStats: Record<string, number> = {};
      let totalSales = 0;
      let monthlySales = Array(12).fill(0);

      packing_orders.forEach(order => {
          if (new Date(order.dueDate).getFullYear() !== year) return;
          if (order.status === 'Cancelled') return;

          const value = order.quantity * order.salePrice;
          const custName = order.customerId ? `Customer ${order.customerId.substring(0,4)}` : 'Walk-in'; // Mock Name
          
          customerStats[custName] = (customerStats[custName] || 0) + value;
          totalSales += value;

          const month = new Date(order.dueDate).getMonth();
          monthlySales[month] += value;
      });

      // Sort Top Customers
      const topCustomers = Object.entries(customerStats)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

      // Concentration Risk Calculation
      const top1Value = topCustomers[0]?.value || 0;
      const dependencyRisk = totalSales > 0 ? (top1Value / totalSales) * 100 : 0;

      const monthlyTrend = monthlySales.map((val, idx) => ({
          name: new Date(0, idx).toLocaleString('en-US', { month: 'short' }),
          sales: val
      }));

      return { topCustomers, totalSales, dependencyRisk, monthlyTrend };
  }, [packing_orders, year]);

  // --- 2. Purchasing Data Logic ---
  const purchasingReport = useMemo(() => {
     const rows: PurchasingRow[] = [];
     let totalSpend = 0;
     let totalItems = 0;

     factory_purchase_orders.forEach(po => {
         if (new Date(po.orderDate).getFullYear() !== year) return;
         if (po.status === 'Cancelled') return;

         const supplier = factory_suppliers.find(s => s.id === po.supplierId)?.name || 'Unknown';
         
         po.items.forEach((item, idx) => {
             const material = packing_raw_materials.find(m => m.id === item.rawMaterialId);
             const itemName = material?.name || 'Unknown Material';
             const unit = material?.unit || 'unit';
             const total = item.quantity * item.unitPrice;
             
             totalSpend += total;
             totalItems += item.quantity;

             rows.push({
                 id: `${po.id}-${idx}`,
                 date: po.orderDate,
                 poNumber: po.poNumber,
                 supplierName: supplier,
                 itemName,
                 quantity: item.quantity,
                 unitPrice: item.unitPrice,
                 total,
                 unit
             });
         });
     });

     rows.sort((a, b) => b.date.localeCompare(a.date));
     return { rows, totalSpend, totalItems };
  }, [factory_purchase_orders, year, packing_raw_materials, factory_suppliers]);

  // --- 3. Production Data Logic ---
  const productionReport = useMemo(() => {
      const summary: Record<string, ProductionRow> = {};
      let totalProduced = 0;
      let totalReject = 0;

      molding_logs.forEach(log => {
          if (new Date(log.date).getFullYear() !== year) return;
          
          if (!summary[log.productName]) {
              summary[log.productName] = {
                  productName: log.productName,
                  totalQuantity: 0,
                  jobCount: 0,
                  unit: 'pcs'
              };
          }
          
          summary[log.productName].totalQuantity += (log.quantityProduced || 0);
          summary[log.productName].jobCount += 1;
          totalProduced += (log.quantityProduced || 0);
          totalReject += (log.quantityRejected || 0);
      });

      const rows = Object.values(summary).sort((a, b) => b.totalQuantity - a.totalQuantity);
      return { rows, totalProduced, totalReject };
  }, [molding_logs, year]);

  // --- AI Generation Logic ---
  const generateAIInsight = async () => {
      if (!apiKey) {
          alert("กรุณาใส่ API Key ในหน้า Settings ก่อนใช้งาน AI");
          return;
      }
      setIsAiLoading(true);
      try {
          const ai = new GoogleGenAI({ apiKey });
          const model = ai.models.getGenerativeModel({ model: 'gemini-2.5-flash-lite-latest' }); // Using generic model alias for safety

          const prompt = `
            Act as a Senior Factory Operations Analyst. Analyze this factory data for Year ${year} and write an Executive Summary for the CEO.
            The CEO is skeptical about hiring more staff because he thinks current demand is temporary from one big client.
            
            Key Data Points:
            - Total Sales: ${salesAnalysis.totalSales.toLocaleString()} THB
            - Top Customer Dependency: ${salesAnalysis.dependencyRisk.toFixed(1)}% (Is this risky? If < 60% argue it's diversified)
            - Total Production: ${productionReport.totalProduced.toLocaleString()} units
            - Reject Rate: ${((productionReport.totalReject / (productionReport.totalProduced + productionReport.totalReject)) * 100).toFixed(2)}%
            - Active Machines: ${factory_machines.filter(m => m.status === 'ทำงาน').length} / ${factory_machines.length}
            - Current Employees: ${packing_employees.length}
            
            Your Goal:
            1. Summarize the financial health.
            2. Address the "Customer Dependency" risk. If the top customer is less than 50%, emphasize that we are diversified.
            3. Analyze Labor Efficiency. If machine usage is high, argue that we need more people to prevent burnout or maintain growth.
            4. Provide a concrete recommendation (Hire/Don't Hire) based on data.
            
            Format: Use Markdown (Bold, Bullet points). Keep it professional, concise, and convincing. Thai Language.
          `;

          const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
          setAiInsight(result.response.text());
      } catch (error) {
          console.error("AI Error:", error);
          setAiInsight("ไม่สามารถเชื่อมต่อ AI ได้ในขณะนี้ (ตรวจสอบ API Key หรืออินเทอร์เน็ต)");
      } finally {
          setIsAiLoading(false);
      }
  };

  return (
    <div className="space-y-6 pb-20">
        <style type="text/css" media="print">{`
            @page { size: A4; margin: 10mm; }
            body { background: white; -webkit-print-color-adjust: exact; }
            .print-hidden { display: none !important; }
            .print-visible { display: block !important; }
            .print-container { width: 100%; box-shadow: none; border: none; }
            table { width: 100%; border-collapse: collapse; font-size: 9pt; }
            th, td { border: 1px solid #ddd; padding: 4px 8px; }
            thead { background-color: #f3f4f6 !important; color: #000 !important; font-weight: bold; }
            .bg-white { background-color: white !important; }
        `}</style>

        {/* Header Controls */}
        <div className="print-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t('report.title')}</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[3px] mt-1">{t('report.subtitle')}</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 shadow-sm">
                    <Calendar size={18} className="text-slate-400 mr-2"/>
                    <select 
                        value={year} 
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="py-2.5 bg-transparent border-none font-bold text-slate-700 outline-none cursor-pointer"
                    >
                        {[0, 1, 2, 3, 4].map(offset => {
                            const y = new Date().getFullYear() - offset;
                            return <option key={y} value={y}>{t('report.selectYear')}: {y}</option>;
                        })}
                    </select>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {[
                        { id: 'summary', icon: Sparkles, label: 'Executive' },
                        { id: 'sales', icon: Users, label: 'Sales' },
                        { id: 'purchasing', icon: ShoppingCart, label: 'Purchasing' },
                        { id: 'production', icon: Factory, label: 'Production' },
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs uppercase transition-all ${activeTab === tab.id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <tab.icon size={16}/> <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <button onClick={() => window.print()} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg">
                    <Printer size={18}/> {t('report.print')}
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="print-container">
            {/* Print Header */}
            <div className="hidden print-visible p-8 border-b-2 border-slate-800 mb-4">
                 <div className="flex justify-between items-start">
                     <div>
                        <h1 className="text-2xl font-black uppercase">{factory_settings.companyInfo.name}</h1>
                        <p className="text-sm">{factory_settings.companyInfo.address}</p>
                     </div>
                     <div className="text-right">
                         <h2 className="text-xl font-bold uppercase">Executive Report</h2>
                         <p className="font-mono">Fiscal Year: {year}</p>
                     </div>
                 </div>
            </div>

            {activeTab === 'summary' && (
                <div className="space-y-6">
                    {/* AI Insight Panel */}
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10"><BrainCircuit size={150}/></div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black mb-4 flex items-center gap-3">
                                <Sparkles className="text-amber-400" /> {t('report.aiAnalysis')}
                            </h3>
                            {aiInsight ? (
                                <div className="prose prose-invert max-w-none text-sm md:text-base leading-relaxed bg-white/10 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
                                    <div dangerouslySetInnerHTML={{ __html: aiInsight.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                                    <p className="text-slate-300 mb-4 font-medium">กดปุ่มเพื่อสร้างบทวิเคราะห์สำหรับผู้บริหาร (ใช้ข้อมูลจริงในระบบ)</p>
                                    <button 
                                        onClick={generateAIInsight} 
                                        disabled={isAiLoading}
                                        className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-black hover:bg-indigo-50 transition-all flex items-center gap-2 mx-auto shadow-lg disabled:opacity-50"
                                    >
                                        {isAiLoading ? <Sparkles className="animate-spin" /> : <BrainCircuit />}
                                        {isAiLoading ? 'AI กำลังวิเคราะห์ข้อมูล...' : 'Generate Executive Summary'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Key Risk Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <AlertTriangle size={16} className={salesAnalysis.dependencyRisk > 50 ? "text-red-500" : "text-green-500"}/> 
                                {t('report.customerRisk')}
                            </h4>
                            <div className="flex items-center justify-between mt-auto">
                                <div>
                                    <div className={`text-4xl font-black ${salesAnalysis.dependencyRisk > 50 ? "text-red-600" : "text-green-600"}`}>
                                        {salesAnalysis.dependencyRisk.toFixed(1)}%
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">รายได้จากลูกค้าอันดับ 1 เทียบรายได้รวม</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-slate-800">ลูกค้าอันดับ 1</div>
                                    <div className="text-lg font-black text-slate-700">{salesAnalysis.topCustomers[0]?.name || '-'}</div>
                                </div>
                            </div>
                            <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${salesAnalysis.dependencyRisk > 50 ? "bg-red-500" : "bg-green-500"}`} style={{width: `${salesAnalysis.dependencyRisk}%`}}></div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 text-right">
                                {salesAnalysis.dependencyRisk > 60 
                                    ? "ความเสี่ยงสูง: พึ่งพาลูกค้ารายเดียวมากเกินไป (High Dependency)" 
                                    : "ความเสี่ยงต่ำ: กระจายความเสี่ยงได้ดี (Diversified)"}
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Briefcase size={16} className="text-blue-500"/> 
                                {t('report.laborEff')} (Utilization)
                            </h4>
                            <div className="grid grid-cols-2 gap-4 mt-auto">
                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <span className="block text-[10px] text-blue-500 font-bold uppercase">พนักงาน (คน)</span>
                                    <span className="text-2xl font-black text-blue-800">{packing_employees.length}</span>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <span className="block text-[10px] text-amber-600 font-bold uppercase">ยอดผลิตเฉลี่ย/คน</span>
                                    <span className="text-2xl font-black text-amber-800">
                                        {packing_employees.length > 0 ? (productionReport.totalProduced / packing_employees.length).toFixed(0) : 0}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-3">
                                *ตัวเลขนี้แสดงถึง Productivity ต่อหัว หากกราฟยอดขายพุ่งสูงแต่จำนวนคนเท่าเดิม จะเกิดภาวะ Overload
                            </p>
                        </div>
                    </div>

                    {/* Sales Trend Chart */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                        <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="text-primary-600"/> แนวโน้มยอดขายรวม (Total Sales Trend)</h4>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesAnalysis.monthlyTrend}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}}/>
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(v) => `${v/1000}k`}/>
                                    <Tooltip formatter={(val: number) => `฿${val.toLocaleString()}`} />
                                    <Area type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'sales' && (
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><PieIcon className="text-purple-600"/> สัดส่วนยอดขายตามลูกค้า (Customer Portfolio)</h3>
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="flex-1 w-full h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={salesAnalysis.topCustomers} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={5}>
                                            {salesAnalysis.topCustomers.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: number) => `฿${val.toLocaleString()}`} />
                                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 w-full space-y-4">
                                {salesAnalysis.topCustomers.map((cust, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 border-b border-slate-50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                                            <span className="text-sm font-bold text-slate-700">{cust.name}</span>
                                        </div>
                                        <span className="text-sm font-mono font-black text-slate-800">฿{cust.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'purchasing' && (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100 bg-slate-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('report.totalSpend')}</span>
                                <div className="text-2xl font-black text-slate-800 font-mono mt-1">฿{purchasingReport.totalSpend.toLocaleString()}</div>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('report.totalItems')}</span>
                                <div className="text-2xl font-black text-slate-800 font-mono mt-1">{purchasingReport.totalItems.toLocaleString()} <span className="text-xs text-slate-400">Units</span></div>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">PO Number</th>
                                    <th className="px-6 py-4">Supplier</th>
                                    <th className="px-6 py-4">Item</th>
                                    <th className="px-6 py-4 text-right">Qty</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {purchasingReport.rows.map(row => (
                                    <tr key={row.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{row.date}</td>
                                        <td className="px-6 py-4 font-mono font-bold text-slate-700">{row.poNumber}</td>
                                        <td className="px-6 py-4 font-medium">{row.supplierName}</td>
                                        <td className="px-6 py-4 text-slate-600">{row.itemName}</td>
                                        <td className="px-6 py-4 text-right font-mono">{row.quantity.toLocaleString()} {row.unit}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold">฿{row.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'production' && (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100 bg-slate-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('report.totalProduced')}</span>
                                <div className="text-2xl font-black text-slate-800 font-mono mt-1">{productionReport.totalProduced.toLocaleString()} <span className="text-xs text-slate-400">Pcs</span></div>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reject Rate</span>
                                <div className="text-2xl font-black text-red-600 font-mono mt-1">
                                    {productionReport.totalProduced > 0 ? ((productionReport.totalReject / (productionReport.totalProduced + productionReport.totalReject)) * 100).toFixed(2) : 0}%
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 w-10">#</th>
                                    <th className="px-6 py-4">Product Name</th>
                                    <th className="px-6 py-4 text-center">Job Count</th>
                                    <th className="px-6 py-4 text-right">Total Quantity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {productionReport.rows.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono text-slate-400">{idx + 1}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{row.productName}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{row.jobCount}</td>
                                        <td className="px-6 py-4 text-right font-mono font-black text-primary-600 text-lg">
                                            {row.totalQuantity.toLocaleString()} <span className="text-sm font-normal text-slate-400">{row.unit}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
        
        {/* Footer Note */}
        <div className="text-center text-slate-400 text-[10px] uppercase tracking-widest mt-8 print-visible">
            CONFIDENTIAL REPORT | Generated on {new Date().toLocaleDateString()} | CT Electric Factory OS
        </div>
    </div>
  );
};

export default Reports;
