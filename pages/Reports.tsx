
import React, { useState, useMemo } from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Calendar, Printer, ShoppingCart, Factory, 
    Download, ChevronDown, Filter, FileText
} from 'lucide-react';
import { FactoryPurchaseOrder, MoldingLog, InventoryItem } from '../types';

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
      factory_settings 
  } = useFactoryData();
  const { t } = useTranslation();
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'purchasing' | 'production'>('purchasing');

  // --- Purchasing Data Logic ---
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

     // Sort by date desc
     rows.sort((a, b) => b.date.localeCompare(a.date));
     
     return { rows, totalSpend, totalItems };
  }, [factory_purchase_orders, year, packing_raw_materials, factory_suppliers]);

  // --- Production Data Logic ---
  const productionReport = useMemo(() => {
      const summary: Record<string, ProductionRow> = {};
      let totalProduced = 0;

      molding_logs.forEach(log => {
          if (new Date(log.date).getFullYear() !== year) return;
          
          if (!summary[log.productName]) {
              summary[log.productName] = {
                  productName: log.productName,
                  totalQuantity: 0,
                  jobCount: 0,
                  unit: 'pcs' // Assuming pcs for now
              };
          }
          
          summary[log.productName].totalQuantity += (log.quantityProduced || 0);
          summary[log.productName].jobCount += 1;
          totalProduced += (log.quantityProduced || 0);
      });

      const rows = Object.values(summary).sort((a, b) => b.totalQuantity - a.totalQuantity);
      return { rows, totalProduced };
  }, [molding_logs, year]);

  return (
    <div className="space-y-6 pb-20">
        <style type="text/css" media="print">{`
            @page { size: A4; margin: 10mm; }
            body { background: white; -webkit-print-color-adjust: exact; }
            .print-hidden { display: none !important; }
            .print-visible { display: block !important; }
            .print-container { width: 100%; box-shadow: none; border: none; }
            table { width: 100%; border-collapse: collapse; font-size: 10pt; }
            th, td { border: 1px solid #ddd; padding: 4px 8px; }
            thead { background-color: #f3f4f6 !important; color: #000 !important; font-weight: bold; }
        `}</style>

        {/* Header (Hidden on Print) */}
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
                    <button 
                        onClick={() => setActiveTab('purchasing')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition-all ${activeTab === 'purchasing' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ShoppingCart size={16}/> {t('report.purchasing')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('production')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition-all ${activeTab === 'production' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Factory size={16}/> {t('report.production')}
                    </button>
                </div>

                <button onClick={() => window.print()} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg">
                    <Printer size={18}/> {t('report.print')}
                </button>
            </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden print-container">
            {/* Print Header (Visible only on Print) */}
            <div className="hidden print-visible p-8 border-b-2 border-slate-800 mb-4">
                 <div className="flex justify-between items-start">
                     <div>
                        <h1 className="text-2xl font-black uppercase">{factory_settings.companyInfo.name}</h1>
                        <p className="text-sm">{factory_settings.companyInfo.address}</p>
                        <p className="text-sm">Tax ID: {factory_settings.companyInfo.taxId}</p>
                     </div>
                     <div className="text-right">
                         <h2 className="text-xl font-bold uppercase">{activeTab === 'purchasing' ? 'Purchasing Report' : 'Production Report'}</h2>
                         <p className="font-mono">Year: {year}</p>
                     </div>
                 </div>
            </div>

            {/* Content Switcher */}
            {activeTab === 'purchasing' ? (
                <>
                    {/* Purchasing Summary */}
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 print-visible">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('report.totalSpend')}</span>
                                <div className="text-2xl font-black text-slate-800 font-mono mt-1">฿{purchasingReport.totalSpend.toLocaleString()}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('report.totalItems')}</span>
                                <div className="text-2xl font-black text-slate-800 font-mono mt-1">{purchasingReport.totalItems.toLocaleString()} <span className="text-xs text-slate-400">Units</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Purchasing Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">PO Number</th>
                                    <th className="px-6 py-4">Supplier</th>
                                    <th className="px-6 py-4">Item Name</th>
                                    <th className="px-6 py-4 text-right">Qty</th>
                                    <th className="px-6 py-4 text-right">Unit Price</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {purchasingReport.rows.map(row => (
                                    <tr key={row.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">{row.date}</td>
                                        <td className="px-6 py-4 font-mono font-bold text-slate-700">{row.poNumber}</td>
                                        <td className="px-6 py-4 text-slate-600">{row.supplierName}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{row.itemName}</td>
                                        <td className="px-6 py-4 text-right font-mono">{row.quantity.toLocaleString()} {row.unit}</td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-500">฿{row.unitPrice.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">฿{row.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {purchasingReport.rows.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">No purchasing records found for {year}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <>
                    {/* Production Summary */}
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 print-visible">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('report.totalProduced')}</span>
                                <div className="text-2xl font-black text-slate-800 font-mono mt-1">{productionReport.totalProduced.toLocaleString()} <span className="text-xs text-slate-400">Pcs</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Production Table (Grouped by Product) */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 w-10">#</th>
                                    <th className="px-6 py-4">Product Name</th>
                                    <th className="px-6 py-4 text-center">Job Count</th>
                                    <th className="px-6 py-4 text-right">Total Quantity Produced</th>
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
                                {productionReport.rows.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-12 text-slate-400">No production records found for {year}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
        
        {/* Footer Note */}
        <div className="text-center text-slate-400 text-xs mt-8 print-visible">
            <p>Report Generated on {new Date().toLocaleDateString()} | CT Electric Factory OS</p>
        </div>
    </div>
  );
};

export default Reports;
