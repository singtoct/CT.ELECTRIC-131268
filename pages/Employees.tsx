import React from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { User, DollarSign, Briefcase } from 'lucide-react';

const Employees: React.FC = () => {
  const { packing_employees } = useFactoryData();
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('emp.title')}</h2>
        <p className="text-slate-500">{t('emp.subtitle')}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">{t('emp.name')}</th>
                        <th className="px-6 py-4">{t('emp.department')}</th>
                        <th className="px-6 py-4">{t('orders.status')}</th>
                        <th className="px-6 py-4">{t('emp.dailyWage')}</th>
                        <th className="px-6 py-4">{t('emp.hireDate')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {packing_employees.filter(e => e.name !== '---ว่าง---').map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                                        <User size={16} />
                                    </div>
                                    <span className="font-medium text-slate-900">{emp.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Briefcase size={14} />
                                    {emp.department}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                                    {emp.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-600">
                                <div className="flex items-center gap-1">
                                    <DollarSign size={12} />
                                    {(emp.dailyWage || 0).toFixed(2)}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                                {new Date(emp.hireDate).toLocaleDateString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Employees;