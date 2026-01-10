
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { MoldingLog } from '../types';
import { ChevronRight, ClipboardCheck, Timer, Factory, Package, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface KanbanColumnProps {
    id: string;
    title: string;
    icon: any;
    color: string;
    logs: MoldingLog[];
    onAction: (log: MoldingLog) => void;
    actionLabel?: string;
    isTerminal?: boolean; // Last step, no action
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, icon: Icon, color, logs, onAction, actionLabel, isTerminal }) => (
    <div className="flex-1 min-w-[300px] flex flex-col h-full">
        {/* Column Header */}
        <div className={`p-4 rounded-t-2xl border-b-4 ${color} bg-white shadow-sm flex items-center justify-between mb-3`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color.replace('border-', 'bg-').replace('500', '100')} ${color.replace('border-', 'text-').replace('200', '600')}`}>
                    <Icon size={20} />
                </div>
                <div>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">{title}</h3>
                    <p className="text-[10px] text-slate-400 font-bold">{logs.length} Jobs</p>
                </div>
            </div>
        </div>

        {/* Droppable Area */}
        <div className="flex-1 bg-slate-100/50 rounded-b-2xl rounded-t-lg p-3 space-y-3 overflow-y-auto custom-scrollbar border border-slate-200/50">
            {logs.map(log => (
                <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 group hover:border-blue-400 hover:shadow-md transition-all cursor-default relative overflow-hidden">
                    {log.priority && log.priority < 5 && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl-lg"></div>}
                    
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                            PO: {log.lotNumber}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${id === 'qc' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                            {log.status}
                        </span>
                    </div>
                    
                    <h4 className="font-black text-slate-800 text-sm mb-1 leading-tight line-clamp-2">{log.productName}</h4>
                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                        <Factory size={12}/> Machine: <span className="font-bold">{log.machine}</span>
                    </p>

                    <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                        <div className="text-xs">
                             <span className="text-slate-400">Target:</span> <span className="font-mono font-black text-slate-800">{log.targetQuantity?.toLocaleString()}</span>
                             <div className="text-[10px] text-green-600 font-bold mt-0.5">Done: {log.quantityProduced?.toLocaleString()}</div>
                        </div>
                        
                        {!isTerminal && (
                            <button 
                                onClick={() => onAction(log)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95
                                    ${id === 'qc' 
                                        ? 'bg-amber-500 text-white hover:bg-amber-600' 
                                        : 'bg-slate-800 text-white hover:bg-slate-900'}`}
                            >
                                {actionLabel || 'Move Next'} {id === 'qc' ? <ArrowRight size={12}/> : <ChevronRight size={12}/>}
                            </button>
                        )}
                    </div>
                </div>
            ))}
            
            {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 min-h-[200px]">
                    <Icon size={32} className="mb-2 opacity-20"/>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-50">Empty</p>
                </div>
            )}
        </div>
    </div>
);

const Kanban: React.FC = () => {
  const data = useFactoryData();
  const { molding_logs = [] } = data;
  const { updateData } = useFactoryActions();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // --- SMART GROUPING LOGIC ---
  const groupedLogs = useMemo(() => {
      const groups = {
          production: [] as MoldingLog[],
          assembly: [] as MoldingLog[],
          qc: [] as MoldingLog[],
          done: [] as MoldingLog[]
      };

      molding_logs.forEach(log => {
          const s = log.status || '';
          // 1. Production Phase
          if (['กำลังผลิต', 'In Progress', 'Running', 'รอฉีด', 'Started'].includes(s)) {
              groups.production.push(log);
          }
          // 2. Assembly / Secondary Phase
          else if (['รอประกบ', 'รอแพค', 'รอแปะกันรอย', 'Assembly'].includes(s)) {
              groups.assembly.push(log);
          }
          // 3. QC Phase
          else if (['รอนับ', 'Waiting QC', 'QC Pending'].includes(s)) {
              groups.qc.push(log);
          }
          // 4. Completed
          else if (['เสร็จสิ้น', 'Completed', 'Finished'].includes(s)) {
              groups.done.push(log);
          }
          // Fallback: If unknown, put in production if produced < target, else done
          else {
             if ((log.quantityProduced || 0) < (log.targetQuantity || 1)) groups.production.push(log);
             else groups.done.push(log);
          }
      });
      
      return groups;
  }, [molding_logs]);

  // --- ACTIONS ---

  const handleProductionNext = async (log: MoldingLog) => {
      // Logic: If product needs assembly, move to 'รอแพค'. Else move to 'รอนับ' (QC)
      // For simplicity in this demo, let's assume direct to QC unless specified
      const nextStatus = 'รอนับ'; 
      const updatedLogs = molding_logs.map(l => l.id === log.id ? { ...l, status: nextStatus } : l);
      await updateData({ ...data, molding_logs: updatedLogs });
  };

  const handleAssemblyNext = async (log: MoldingLog) => {
      const updatedLogs = molding_logs.map(l => l.id === log.id ? { ...l, status: 'รอนับ' } : l);
      await updateData({ ...data, molding_logs: updatedLogs });
  };

  const handleQCAction = (log: MoldingLog) => {
      // Jump to QC Page to perform actual Inventory Deductions
      navigate('/qc');
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-black text-slate-800">{t('nav.kanban')}</h2>
            <p className="text-slate-500 text-sm font-bold mt-1">Real-time Job Tracking Board</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">+3</div>
            </div>
            <span className="text-xs text-slate-400 font-bold">Active Operators</span>
        </div>
      </div>
      
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar px-2">
        <KanbanColumn 
            id="production"
            title="กำลังผลิต (Production)" 
            icon={Factory} 
            color="border-blue-500" 
            logs={groupedLogs.production} 
            onAction={handleProductionNext}
            actionLabel="ส่งตรวจสอบ (Finish)"
        />
        
        {/* Only show Assembly column if there are items, to keep UI clean */}
        {groupedLogs.assembly.length > 0 && (
            <KanbanColumn 
                id="assembly"
                title="ฝ่ายประกอบ/แพค (Assembly)" 
                icon={Package} 
                color="border-purple-500" 
                logs={groupedLogs.assembly} 
                onAction={handleAssemblyNext}
                actionLabel="แพคเสร็จ (Packed)"
            />
        )}

        <KanbanColumn 
            id="qc"
            title="รอตรวจสอบ (Waiting QC)" 
            icon={ClipboardCheck} 
            color="border-amber-500" 
            logs={groupedLogs.qc} 
            onAction={handleQCAction}
            actionLabel="ไปหน้า QC"
        />

        <KanbanColumn 
            id="done"
            title="เสร็จสิ้น (Completed)" 
            icon={CheckCircle2} 
            color="border-emerald-500" 
            logs={groupedLogs.done} 
            onAction={() => {}}
            isTerminal={true}
        />
      </div>
    </div>
  );
};

export default Kanban;
