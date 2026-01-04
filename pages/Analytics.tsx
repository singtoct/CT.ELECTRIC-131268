
import React, { useState, useMemo } from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import StatCard from '../components/StatCard';
import { 
    DollarSign, TrendingUp, Package, Gauge, Users, 
    Zap, AlertCircle, TrendingDown, ArrowUpRight, Target
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

    recentLogs.forEach(log => {
        const product = factory_products.find(p => p.name === log.productName);
        if (product) {
            totalRevenue += log.quantityProduced * (product.salePrice || 0);
            
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

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">รายงานสรุปผลประกอบการแผนก</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[4px] mt-1">Financial Analysis & Managerial Advice</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm self-start">
            <button 
                onClick={() => setTimeRange('weekly')} 
                className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${timeRange === 'weekly' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Weekly
            </button>
            <button 
                onClick={() => setTimeRange('monthly')} 
                className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${timeRange === 'monthly' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Monthly
            </button>
        </div>
      </div>

      {/* Advice Box */}
      <div className={`p-5 rounded-2xl border-2 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 ${advice.color}`}>
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
                          <td className="px-6 py-5 text-slate-500">คำนวณตามยอดผลิตจริง {molding_logs.length} รายการ</td>
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
  );
};

const CheckSquareIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
);

export default Analytics;
