import React from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { Package, Tag } from 'lucide-react';

const Products: React.FC = () => {
  const { packing_orders, packing_inventory } = useFactoryData();
  const { t } = useTranslation();

  // Consolidate unique products from orders and inventory
  const uniqueProducts = new Map();

  packing_orders.forEach(o => {
      if (!uniqueProducts.has(o.name)) {
          uniqueProducts.set(o.name, { name: o.name, color: o.color, type: 'Order Item', price: o.salePrice });
      }
  });

  packing_inventory.forEach(i => {
      if (!uniqueProducts.has(i.name)) {
           uniqueProducts.set(i.name, { name: i.name, color: 'N/A', type: 'Stock Item', price: i.costPerUnit });
      }
  });

  const products = Array.from(uniqueProducts.values());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('nav.products')}</h2>
        <p className="text-slate-500">Master product list (Derived)</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Standard Color</th>
                    <th className="px-6 py-4 text-right">Ref. Price</th>
                    <th className="px-6 py-4 text-center">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {products.map((prod, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                            <Package size={16} className="text-slate-400" />
                            {prod.name}
                        </td>
                        <td className="px-6 py-4">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{prod.type}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{prod.color || '-'}</td>
                        <td className="px-6 py-4 text-right font-mono">฿{prod.price?.toFixed(2) || '-'}</td>
                        <td className="px-6 py-4 text-center">
                            <button className="text-primary-600 hover:text-primary-700 font-medium text-xs">Edit</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default Products;
