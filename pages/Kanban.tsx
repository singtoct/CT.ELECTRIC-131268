
import React from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { MoldingLog } from '../types';
import { ChevronRight, ClipboardCheck, Timer } from 'lucide-react';

// Added interface for KanbanColumnProps and allowed onMove to return a Promise to match handleMoveNext
interface KanbanColumnProps {
    title: string;
    status: string;
    logs: MoldingLog[];
    onMove: (log: MoldingLog) => void | Promise<void>;
}

// Updated component to use React.FC which includes support for standard props like 'key'
const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, status, logs, onMove }) => (
    <div className="flex-1 min-w-[280px] bg-slate-100 rounded-xl p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-slate-300">
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">{title}</h3>
            <span className="bg-white text-primary-600 px-2.5 py-0.5 rounded-full text-xs font-black shadow-sm">{logs.length}</span>
        </div>
        <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar pr-1">
            {logs.map(log => (
                <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 group hover:border-primary-400 transition-all cursor-default">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold bg-primary-50 text-primary-700 px-2 py-0.5 rounded uppercase">{log.lotNumber}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.jobId?.slice(-4) || '----'}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-2 leading-tight">{log.productName}</h4>
                    <div className="flex justify-between items-center mt-3">
                        <div className="text-[10px] text-slate-500">
                             เป้าหมาย: <span className="font-bold text-slate-800">{log.targetQuantity?.toLocaleString()}</span>
                        </div>
                        <button 
                            onClick={() => onMove(log)}
                            className="p-1.5 bg-slate-50 text-slate-400 hover:bg-primary-600 hover:text-white rounded-lg transition-all"
                            title="Move to next step"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            ))}
            {logs.length === 0 && (
                <div className="text-center py-10">
                    <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto flex items-center justify-center mb-2">
                        <Timer size={20} className="text-slate-400"/>
                    </div>
                    <p className="text-slate-400 text-xs italic">No items here</p>
                </div>
            )}
        </div>
    </div>
);

const Kanban: React.FC = () => {
  const data = useFactoryData();
  const { molding_logs = [], factory_settings } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();

  const steps = factory_settings.productionSteps || ['รอฉีด', 'รอประกบ', 'รอแพค', 'รอนับ', 'เสร็จสิ้น'];

  const handleMoveNext = async (log: MoldingLog) => {
      const currentIndex = steps.indexOf(log.status);
      if (currentIndex < steps.length - 1) {
          const nextStatus = steps[currentIndex + 1];
          const updatedLogs = molding_logs.map(l => l.id === log.id ? { ...l, status: nextStatus } : l);
          await updateData({ ...data, molding_logs: updatedLogs });
      }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">{t('nav.kanban')}</h2>
            <p className="text-slate-500 text-sm">ติดตามความคืบหน้าของงานแต่ละ Job</p>
        </div>
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-500">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary-500"></div> งานปกติ</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> เร่งด่วน</span>
        </div>
      </div>
      
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {steps.map(step => (
            <KanbanColumn 
                key={step} 
                title={step} 
                status={step} 
                logs={molding_logs.filter(l => l.status === step)} 
                onMove={handleMoveNext}
            />
        ))}
      </div>
    </div>
  );
};

export default Kanban;
