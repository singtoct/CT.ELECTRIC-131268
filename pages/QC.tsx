import React from 'react';
import { useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { Check, X, Clock } from 'lucide-react';

const QC: React.FC = () => {
  const { packing_qc_entries } = useFactoryData();
  const { t } = useTranslation();

  // Sort by pending first
  const sortedQc = [...packing_qc_entries].sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return 1;
      return 0;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('qc.title')}</h2>
        <p className="text-slate-500">{t('qc.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedQc.map((entry) => (
          <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-slate-100 text-slate-600 text-xs font-mono py-1 px-2 rounded">
                {entry.lotNumber || 'No Lot'}
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded uppercase
                ${entry.status === 'Passed' ? 'bg-green-100 text-green-800' : 
                  entry.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'}`}>
                {entry.status}
              </span>
            </div>
            
            <h4 className="font-bold text-slate-800 mb-1">{entry.productName}</h4>
            <div className="text-sm text-slate-500 mb-4">
              <span className="block">{t('orders.quantity')}: <span className="font-mono text-slate-700 font-medium">{entry.quantity} {entry.unit}</span></span>
              <span className="block text-xs mt-1">{t('qc.sourceDate')}: {entry.sourceDate}</span>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                {entry.status === 'Pending' ? (
                    <>
                        <button className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors">
                            <Check size={16} /> {t('qc.pass')}
                        </button>
                        <button className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors">
                            <X size={16} /> {t('qc.fail')}
                        </button>
                    </>
                ) : (
                    <div className="w-full text-center text-xs text-slate-400 italic">
                        {t('qc.inspectedBy')} {entry.qcInspector || 'System'} {t('qc.on')} {entry.qcDate}
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QC;