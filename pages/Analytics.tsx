import React from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatCard from '../components/StatCard';
import { DollarSign, TrendingUp, Package, Gauge } from 'lucide-react';

interface AnalyticsProps {
    mode: 'cost' | 'profit' | 'material' | 'oee';
}

const Analytics: React.FC<AnalyticsProps> = ({ mode }) => {
  const { packing_orders, packing_inventory, factory_machines, molding_logs } = useFactoryData();
  const { t } = useTranslation();

  // --- Derive Data ---
  
  // 1. Profit & Cost Data (Based on Orders)
  const financialData = packing_orders.map(order => {
      const revenue = order.quantity * order.salePrice;
      // Mock Cost: Assume 60% of sale price is cost (Material + Overhead) as we lack BOM
      const estimatedCost = revenue * 0.6; 
      const profit = revenue - estimatedCost;
      
      const safeName = order.name ? order.name.substring(0, 10) : 'Order';

      return {
          name: order.lotNumber || safeName,
          revenue,
          cost: estimatedCost,
          profit
      };
  }).slice(0, 10); // Show top 10 recent

  const totalRevenue = financialData.reduce((acc, i) => acc + i.revenue, 0);
  const totalProfit = financialData.reduce((acc, i) => acc + i.profit, 0);

  // 2. Material Usage (Mock based on Inventory cost)
  const materialData = packing_inventory.map(item => ({
      name: item.name,
      value: (item.quantity || 0) * (item.costPerUnit || 0),
      quantity: item.quantity
  })).sort((a,b) => b.value - a.value).slice(0, 8);

  // 3. OEE Data (Mock based on Machines)
  const oeeData = factory_machines.map(m => ({
      name: m.name,
      availability: m.status === 'ทำงาน' ? 95 : 0,
      performance: Math.floor(Math.random() * 20) + 80, // Mock 80-100%
      quality: 98 // Mock
  }));


  // --- Render Content based on Mode ---
  
  const renderContent = () => {
      switch (mode) {
          case 'cost':
          case 'profit':
              return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <StatCard title="Total Revenue (Est)" value={`฿${totalRevenue.toLocaleString()}`} icon={DollarSign} color="green" />
                        <StatCard title="Total Cost (Est)" value={`฿${(totalRevenue - totalProfit).toLocaleString()}`} icon={Package} color="red" />
                        <StatCard title="Net Profit (Est)" value={`฿${totalProfit.toLocaleString()}`} icon={TrendingUp} color="blue" />
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4">Revenue vs Cost per Order</h3>
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={financialData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
                                    <Bar dataKey="cost" fill="#ef4444" name="Cost" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                  </>
              );
          case 'material':
              return (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4">Inventory Value by Item (Top 8)</h3>
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={materialData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={150} />
                                <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} />
                                <Bar dataKey="value" fill="#8884d8" name="Total Value (THB)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
              );
          case 'oee':
              return (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-4">Machine Efficiency (OEE)</h3>
                     <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={oeeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="availability" fill="#3b82f6" name="Availability %" />
                                <Bar dataKey="performance" fill="#f59e0b" name="Performance %" />
                                <Bar dataKey="quality" fill="#10b981" name="Quality %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
              );
          default: return null;
      }
  };

  return (
    <div className="space-y-6">
       <div>
        <h2 className="text-2xl font-bold text-slate-800 capitalize">{t(`nav.analysis${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}</h2>
        <p className="text-slate-500">Analytical insights derived from factory data</p>
      </div>
      {renderContent()}
    </div>
  );
};

export default Analytics;