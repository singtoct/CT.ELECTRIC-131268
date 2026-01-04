
import React, { useState, useMemo } from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area, ReferenceLine
} from 'recharts';
import StatCard from '../components/StatCard';
import { 
    DollarSign, TrendingUp, Package, Gauge, Users, 
    Zap, AlertCircle, TrendingDown, ArrowUpRight, Target,
    Briefcase, Scale, Calculator, CheckCircle2
} from 'lucide-react';

interface AnalyticsProps {
    mode?: 'cost' | 'profit' | 'material' | 'oee';
}

const Analytics: React.FC<AnalyticsProps> = ({ mode = 'profit' }) => {
  const { 
    packing_orders, 
    packing_inventory, 
    factory_machines, 
    molding_logs, 
    packing_employees,
    factory_settings,
    packing_raw_materials,
    factory_products
  } = useFactoryData();
  const { t } = useTranslation();

  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly'>('monthly');
  const [activeTab, setActiveTab] = useState<'overview' | 'negotiation'>('overview');
  
  // Negotiation State
  const [proposedRaise, setProposedRaise] = useState(5000);

  // --- Financial Calculation Logic ---
  const financials = useMemo(() => {
    // 1. Calculate Total Labor Cost
    // Weekly = Daily Wage * 6 days, Monthly = Daily Wage * 26 days
    const workingDays = timeRange === 'weekly' ? 6 : 26;
    const totalLaborCost = packing_employees.reduce((sum, emp) => sum + (emp.dailyWage * workingDays), 0);

    // 2. Calculate Material & Revenue from production
    // For simulation, we look at the last 30 days of logs or the range
    const daysToLookBack = timeRange === 'weekly' ? 7 : 30;
    const recentLogs = molding_logs.filter(log => {
        const logDate = new Date(log.date);
        const diff = (new Date().getTime() - logDate.getTime()) / (1000 * 3600 * 24);
        return diff <= daysToLookBack;
    });

    let totalMaterialCost = 0;
    let totalRevenue = 0;
    let totalItemsProduced = 0;

    recentLogs.forEach(log => {
        const product = factory_products.find(p => p.name === log.productName);
        if (product) {
            totalRevenue += log.quantityProduced * (product.salePrice || 0);
            totalItemsProduced += log.quantityProduced;
            
            // BOM Cost
            if (product.bom) {
                product.bom.forEach(b => {
                    const mat = packing_raw_materials.find(m => m.id === b.materialId);
                    totalMaterialCost += log.quantityProduced * b.quantityPerUnit * (mat?.costPerUnit || 0);
                });
            }
        }
    });

    // 3. Overhead Costs (Fixed + Variable)
    const totalOverheadPerHour = (factory_settings.overheadCosts?.reduce((sum, c) => sum + c.value, 0) || 0) + 
                                (factory_settings.machineDepreciation?.reduce((sum, c) => sum + c.value, 0) || 0);
    
    // Assume 18 hours per day operation
    const operatingHours = workingDays * 18;
    const totalOverheadCost = totalOverheadPerHour * operatingHours;

    const totalExpenses = totalLaborCost + totalMaterialCost + totalOverheadCost;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
        totalRevenue,
        totalLaborCost,
        totalMaterialCost,
        totalOverheadCost,
        totalExpenses,
        netProfit,
        profitMargin,
        totalItemsProduced,
        expenseBreakdown: [
            { name: 'ค่าแรงพนักงาน', value: totalLaborCost, color: '#3b82f6' },
            { name: 'วัตถุดิบ (BOM)', value: totalMaterialCost, color: '#f59e0b' },
            { name: 'Overhead/ค่าไฟ', value: totalOverheadCost, color: '#ef4444' }
        ]
    };
  }, [timeRange, packing_employees, molding_logs, factory_products, packing_raw_materials, factory_settings]);

  // AI Recommendation Logic
  const getRecommendation = () => {
    if (financials.netProfit < 0) return {
        text: "วิกฤต: แผนกกำลังขาดทุน! ควรลดค่าใช้จ่ายแฝงหรือตรวจสอบราคาขายสินค้าด่วน",
        icon: <AlertCircle className="text-red-500" />,
        color: "border-red-200 bg-red-50 text-red-800"
    };
    if (financials.profitMargin < 15) return {
        text: "คำเตือน: กำไรค่อนข้างน้อย (Low Margin) ยังไม่แนะนำให้เพิ่มพนักงานในตอนนี้",
        icon: <TrendingDown className="text-amber-500" />,
        color: "border-amber-200 bg-amber-50 text-amber-800"
    };
    if (financials.profitMargin > 25 && financials.totalRevenue > 500000) return {
        text: "โอกาส: กำไรดีมากและงานเยอะ แนะนำให้จ้างพนักงานเพิ่ม 1-2 คน เพื่อเพิ่มกำลังการผลิต",
        icon: <Users className="text-green-500" />,
        color: "border-green-200 bg-green-50 text-green-800"
    };
    return {
        text: "เสถียร: การจัดการการเงินอยู่ในเกณฑ์ดี รักษามาตรฐานการผลิตนี้ไว้",
        icon: <CheckSquareIcon className="text-blue-500" />,
        color: "border-blue-200 bg-blue-50 text-blue-800"
    };
  };

  const advice = getRecommendation();
  const COLORS = financials.expenseBreakdown.map(e => e.color);

  // --- Negotiation Logic ---
  const currentNetProfit = financials.netProfit;
  const newNetProfit = currentNetProfit - proposedRaise;
  const impactPercent = currentNetProfit > 0 ? (proposedRaise / currentNetProfit) * 100 : 0;
  const revenuePerSalary = proposedRaise > 0 ? financials.totalRevenue / (financials.totalLaborCost + proposedRaise) : 0;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">รายงานสรุปผลประกอบการแผนก</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[4px] mt-1">Financial Analysis & Managerial Advice</p>
        </div>
        
        <div className="flex gap-2 self-start">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                <button 
                    onClick={() => setActiveTab('overview')} 
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <BarChart3Icon size={16}/> ภาพรวม (Overview)
                </button>
                <button 
                    onClick={() => { setActiveTab('negotiation'); setTimeRange('monthly'); }} 
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeTab === 'negotiation' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Briefcase size={16}/> วิเคราะห์ความคุ้มค่า (ROI)
                </button>
            </div>
            {activeTab === 'overview' && (
                <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                    <button 
                        onClick={() => setTimeRange('weekly')} 
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${timeRange === 'weekly' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Weekly
                    </button>
                    <button 
                        onClick={() => setTimeRange('monthly')} 
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${timeRange === 'monthly' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Monthly
                    </button>
                </div>
            )}
        </div>
      </div>

      {activeTab === 'overview' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Advice Box */}
            <div className={`p-5 rounded-2xl border-2 flex items-center gap-4 shadow-sm ${advice.color}`}>
                <div className="bg-white p-3 rounded-xl shadow-sm">
                    {advice.icon}
                </div>
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Managerial Recommendation</span>
                    <p className="text-base font-black mt-0.5">{advice.text}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="รายรับทั้งหมด" value={`฿${financials.totalRevenue.toLocaleString()}`} icon={DollarSign} color="green" trend="+8% vs last" trendUp={true} />
                <StatCard title="รายจ่ายรวม" value={`฿${financials.totalExpenses.toLocaleString()}`} icon={TrendingDown} color="red" />
                <StatCard title="กำไรสุทธิ" value={`฿${financials.netProfit.toLocaleString()}`} icon={TrendingUp} color="blue" />
                <StatCard title="อัตรากำไร (Margin)" value={`${financials.profitMargin.toFixed(1)}%`} icon={Target} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Financial Trend */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
                    <h3 className="font-black text-slate-800 text-xl mb-6 flex items-center gap-3">
                        <TrendingUp className="text-primary-600" size={24}/> 
                        แนวโน้มทางการเงิน ({timeRange === 'weekly' ? '7 วันที่ผ่านมา' : '30 วันที่ผ่านมา'})
                    </h3>
                    <div className="flex-1 h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[
                                { name: 'W1', rev: financials.totalRevenue * 0.8, exp: financials.totalExpenses * 0.9 },
                                { name: 'W2', rev: financials.totalRevenue * 0.95, exp: financials.totalExpenses * 0.85 },
                                { name: 'W3', rev: financials.totalRevenue * 1.1, exp: financials.totalExpenses * 0.88 },
                                { name: 'W4', rev: financials.totalRevenue, exp: financials.totalExpenses },
                            ]}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                                <Legend iconType="circle" />
                                <Area type="monotone" dataKey="rev" name="รายรับ (Revenue)" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                                <Area type="monotone" dataKey="exp" name="รายจ่าย (Expenses)" stroke="#ef4444" strokeWidth={4} fillOpacity={0} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col items-center">
                    <h3 className="font-black text-slate-800 text-xl mb-6 self-start flex items-center gap-3">
                        <Zap className="text-amber-500" size={24}/> 
                        สัดส่วนค่าใช้จ่าย
                    </h3>
                    <div className="flex-1 h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={financials.expenseBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {financials.expenseBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 w-full mt-4">
                        {financials.expenseBreakdown.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                                    <span className="text-xs font-bold text-slate-600">{item.name}</span>
                                </div>
                                <span className="text-xs font-black text-slate-800">฿{item.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Detailed Table for Boss */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 text-lg">รายการแจกแจงทางการเงิน</h3>
                    <button className="text-primary-600 font-bold text-xs flex items-center gap-1 hover:underline">
                        <ArrowUpRight size={14}/> พิมพ์รายงาน
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-4">หมวดหมู่</th>
                                <th className="px-6 py-4">รายละเอียด</th>
                                <th className="px-8 py-4 text-right">จำนวนเงิน</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <tr>
                                <td className="px-8 py-5 font-bold text-slate-800">ค่าแรงรวม</td>
                                <td className="px-6 py-5 text-slate-500">พนักงาน {packing_employees.length} คน ({timeRange})</td>
                                <td className="px-8 py-5 text-right font-mono font-bold text-red-500">฿{financials.totalLaborCost.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="px-8 py-5 font-bold text-slate-800">ต้นทุนวัตถุดิบ</td>
                                <td className="px-6 py-5 text-slate-500">คำนวณตามยอดผลิตจริง</td>
                                <td className="px-8 py-5 text-right font-mono font-bold text-red-500">฿{financials.totalMaterialCost.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="px-8 py-5 font-bold text-slate-800">Overhead & Depreciation</td>
                                <td className="px-6 py-5 text-slate-500">ค่าไฟ, ค่าเช่า, ค่าเสื่อมเครื่องจักร</td>
                                <td className="px-8 py-5 text-right font-mono font-bold text-red-500">฿{financials.totalOverheadCost.toLocaleString()}</td>
                            </tr>
                            <tr className="bg-primary-50/30">
                                <td className="px-8 py-5 font-black text-primary-700">กำไรสุทธิคาดการณ์</td>
                                <td className="px-6 py-5 text-primary-600 font-bold italic">หลังหักค่าใช้จ่ายทั้งหมดแล้ว</td>
                                <td className="px-8 py-5 text-right font-mono font-black text-primary-700 text-lg">฿{financials.netProfit.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
      ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Negotiation Simulator Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Scale size={180}/></div>
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div>
                          <span className="inline-block bg-emerald-800/50 border border-emerald-500/30 text-emerald-100 text-[10px] font-black uppercase tracking-[3px] px-3 py-1 rounded-full mb-3">Management ROI Simulator</span>
                          <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">วิเคราะห์ความคุ้มค่า<br/>ในการปรับฐานเงินเดือน</h2>
                          <p className="text-emerald-100 text-sm max-w-md opacity-90">
                              จำลองสถานการณ์เพื่อแสดงให้เห็นว่า การปรับเพิ่มเงินเดือนผู้จัดการ ส่งผลกระทบเพียงเล็กน้อยต่อกำไรสุทธิ แต่สร้างความคุ้มค่าในระยะยาว
                          </p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                          <label className="block text-emerald-100 text-xs font-bold uppercase mb-2">ระบุยอดเงินเดือนที่ต้องการขอขึ้น (บาท/เดือน)</label>
                          <div className="flex items-center gap-3">
                              <input 
                                type="number" 
                                value={proposedRaise} 
                                onChange={(e) => setProposedRaise(parseInt(e.target.value) || 0)} 
                                className="flex-1 bg-white text-emerald-900 text-2xl font-black px-4 py-3 rounded-xl outline-none shadow-lg"
                              />
                              <button className="bg-emerald-900 hover:bg-emerald-950 text-white px-6 py-4 rounded-xl font-bold shadow-lg transition-all">คำนวณ</button>
                          </div>
                          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                              {[3000, 5000, 7000, 10000].map(amt => (
                                  <button key={amt} onClick={() => setProposedRaise(amt)} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold text-white transition-all">+{amt.toLocaleString()}</button>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>

              {/* Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Current State */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-60">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">กำไรสุทธิ (ปัจจุบัน)</h4>
                      <div className="text-3xl font-black text-slate-700">฿{currentNetProfit.toLocaleString()}</div>
                      <p className="text-xs text-slate-400 mt-2">Margin: {financials.profitMargin.toFixed(1)}%</p>
                  </div>

                  {/* Impact Analysis */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                      <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">ผลกระทบต่อกำไร</h4>
                      <div className="text-3xl font-black text-amber-600">-{impactPercent.toFixed(2)}%</div>
                      <p className="text-xs text-slate-500 mt-2">กำไรลดลงเพียงเล็กน้อย</p>
                  </div>

                  {/* Future State */}
                  <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-lg relative transform scale-105">
                      <div className="absolute -top-3 left-4 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">หลังปรับเงินเดือน</div>
                      <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">กำไรสุทธิ (คงเหลือ)</h4>
                      <div className="text-3xl font-black text-emerald-600">฿{newNetProfit.toLocaleString()}</div>
                      <p className="text-xs text-emerald-600 mt-2 font-bold">บริษัทยังคงมีกำไรสูง</p>
                  </div>
              </div>

              {/* Visual Chart Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Scale size={20} className="text-slate-400"/> เปรียบเทียบผลกำไร (Profit Comparison)</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={[
                                  { name: 'ก่อนปรับ', amount: currentNetProfit },
                                  { name: 'หลังปรับ', amount: newNetProfit }
                              ]} layout="vertical" margin={{ left: 20 }}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontWeight: 'bold', fontSize: 12}} width={60} />
                                  <Tooltip formatter={(val:number) => `฿${val.toLocaleString()}`} cursor={{fill: 'transparent'}} />
                                  <Bar dataKey="amount" radius={[0, 10, 10, 0]} barSize={40}>
                                      {
                                          [currentNetProfit, newNetProfit].map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={index === 0 ? '#cbd5e1' : '#10b981'} />
                                          ))
                                      }
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                      <p className="text-center text-xs text-slate-400 mt-2">กราฟแสดงให้เห็นว่า แท่งกำไรแทบไม่เปลี่ยนแปลง</p>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-center">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CheckCircle2 size={20} className="text-emerald-500"/> ความคุ้มค่าที่บริษัทได้รับ (Value)</h3>
                      <div className="space-y-4">
                          <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                              <div className="bg-white p-2 rounded-lg shadow-sm text-emerald-600 font-black text-lg">1</div>
                              <div>
                                  <h4 className="font-bold text-emerald-800 text-sm">ดูแลรับผิดชอบยอดผลิตรวม</h4>
                                  <p className="text-xs text-emerald-600 mt-1">บริหารจัดการสินค้ากว่า {financials.totalItemsProduced.toLocaleString()} ชิ้น ในเดือนนี้</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                              <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600 font-black text-lg">2</div>
                              <div>
                                  <h4 className="font-bold text-blue-800 text-sm">สร้างรายได้เข้าบริษัท</h4>
                                  <p className="text-xs text-blue-600 mt-1">รายรับรวม {financials.totalRevenue.toLocaleString()} บาท ภายใต้การดูแล</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                              <div className="bg-white p-2 rounded-lg shadow-sm text-amber-600 font-black text-lg">3</div>
                              <div>
                                  <h4 className="font-bold text-amber-800 text-sm">อัตราส่วนความคุ้มค่า</h4>
                                  <p className="text-xs text-amber-600 mt-1">เงินเดือนที่ขอเพิ่ม คิดเป็นเพียง {(impactPercent).toFixed(2)}% ของกำไรที่ทำได้</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

// Icons Helpers
const CheckSquareIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
);

const BarChart3Icon = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
);

export default Analytics;
