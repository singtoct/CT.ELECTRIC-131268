
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    MessageSquareWarning, Search, Plus, Filter, 
    CheckCircle2, Clock, User, AlertCircle, Edit2, 
    X, Save, Trash2 
} from 'lucide-react';
import { FactoryComplaint } from '../types';
import SearchableSelect from '../components/SearchableSelect';

const generateId = () => Math.random().toString(36).substr(2, 9);

const Complaints: React.FC = () => {
    const data = useFactoryData();
    const { 
        factory_complaints = [], 
        packing_employees = [],
        factory_customers = []
    } = data;
    const { updateData } = useFactoryActions();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentComplaint, setCurrentComplaint] = useState<Partial<FactoryComplaint>>({});

    // Filter Logic
    const filteredComplaints = useMemo(() => {
        return factory_complaints
            .filter(c => {
                const matchesSearch = c.topic.toLowerCase().includes(search.toLowerCase()) || 
                                      c.customerName.toLowerCase().includes(search.toLowerCase());
                const isResolved = c.status === 'Resolved';
                const matchesTab = activeTab === 'resolved' ? isResolved : !isResolved;
                return matchesSearch && matchesTab;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [factory_complaints, search, activeTab]);

    // Helpers
    const employeeOptions = useMemo(() => 
        packing_employees.map(e => ({ value: e.id, label: e.name, subLabel: e.department }))
    , [packing_employees]);

    const customerOptions = useMemo(() => 
        factory_customers.map(c => ({ value: c.name, label: c.name }))
    , [factory_customers]);

    // Actions
    const handleOpenModal = (complaint?: FactoryComplaint) => {
        if (complaint) {
            setCurrentComplaint({ ...complaint });
        } else {
            setCurrentComplaint({
                id: generateId(),
                date: new Date().toISOString().split('T')[0],
                status: 'Open',
                priority: 'Medium',
                customerName: '',
                topic: '',
                description: '',
                resolution: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this complaint?")) return;
        const updated = factory_complaints.filter(c => c.id !== id);
        await updateData({ ...data, factory_complaints: updated });
    };

    const handleSave = async () => {
        if (!currentComplaint.topic || !currentComplaint.customerName) {
            alert("Please fill in Topic and Customer Name.");
            return;
        }

        let updatedList = [...factory_complaints];
        
        // Update Status based on Resolution presence if not explicitly set to Resolved
        let finalStatus = currentComplaint.status;
        if (currentComplaint.resolution && currentComplaint.resolution.trim() !== '' && currentComplaint.status !== 'Resolved') {
             // Optional: Auto-resolve if resolution provided? Let's keep it manual for now or prompt
        }

        const payload = {
            ...currentComplaint,
            status: finalStatus,
            // If resolving, set resolved date
            resolvedDate: finalStatus === 'Resolved' && !currentComplaint.resolvedDate 
                ? new Date().toISOString().split('T')[0] 
                : currentComplaint.resolvedDate
        } as FactoryComplaint;

        const idx = updatedList.findIndex(c => c.id === payload.id);
        if (idx >= 0) {
            updatedList[idx] = payload;
        } else {
            updatedList.push(payload);
        }

        await updateData({ ...data, factory_complaints: updatedList });
        setIsModalOpen(false);
    };

    const getPriorityColor = (p?: string) => {
        switch(p) {
            case 'High': return 'bg-red-100 text-red-700 border-red-200';
            case 'Medium': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Low': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('comp.title')}</h2>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[3px] mt-1">{t('comp.subtitle')}</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 bg-red-600 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                    <Plus size={20} /> {t('comp.add')}
                </button>
            </div>

            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button 
                        onClick={() => setActiveTab('pending')}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Clock size={14}/> {t('comp.pending')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('resolved')}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'resolved' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <CheckCircle2 size={14}/> {t('comp.resolved')}
                    </button>
                </div>
                <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                        type="text" 
                        placeholder={t('orders.search')}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-5">{t('comp.date')}</th>
                                <th className="px-6 py-5">Customer</th>
                                <th className="px-6 py-5">{t('comp.topic')}</th>
                                <th className="px-6 py-5">{t('comp.assigned')}</th>
                                <th className="px-6 py-5 text-center">{t('comp.priority')}</th>
                                <th className="px-6 py-5 text-center">{t('comp.status')}</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredComplaints.map(complaint => {
                                const assignee = packing_employees.find(e => e.id === complaint.assignedEmployeeId);
                                return (
                                    <tr key={complaint.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleOpenModal(complaint)}>
                                        <td className="px-6 py-4 font-mono text-slate-500">{complaint.date}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{complaint.customerName}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700">{complaint.topic}</div>
                                            <div className="text-xs text-slate-400 truncate max-w-[200px]">{complaint.description}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {assignee ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                        {assignee.name.charAt(0)}
                                                    </div>
                                                    <span className="text-slate-600 text-xs font-bold">{assignee.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">- Unassigned -</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${getPriorityColor(complaint.priority)}`}>
                                                {complaint.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1
                                                ${complaint.status === 'Resolved' ? 'bg-green-100 text-green-700' : 
                                                  complaint.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {complaint.status === 'Open' && <AlertCircle size={10}/>}
                                                {complaint.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDelete(complaint.id); }}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredComplaints.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-400">
                                        <MessageSquareWarning size={48} className="mx-auto mb-2 opacity-20"/>
                                        <p className="text-sm font-bold">ไม่พบรายการร้องเรียน</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && currentComplaint && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">รายละเอียดข้อร้องเรียน</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{currentComplaint.id ? 'Edit Complaint' : 'New Complaint'}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><X size={24}/></button>
                        </div>

                        <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('comp.date')}</label>
                                    <input 
                                        type="date" 
                                        value={currentComplaint.date}
                                        onChange={e => setCurrentComplaint({...currentComplaint, date: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-red-100 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('comp.priority')}</label>
                                    <select 
                                        value={currentComplaint.priority}
                                        onChange={e => setCurrentComplaint({...currentComplaint, priority: e.target.value as any})}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm bg-white focus:ring-2 focus:ring-red-100 outline-none"
                                    >
                                        <option value="High">High (สูง)</option>
                                        <option value="Medium">Medium (กลาง)</option>
                                        <option value="Low">Low (ต่ำ)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</label>
                                <SearchableSelect 
                                    options={customerOptions}
                                    value={currentComplaint.customerName}
                                    onChange={val => setCurrentComplaint({...currentComplaint, customerName: val})}
                                    placeholder="Select Customer..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('comp.topic')}</label>
                                <input 
                                    type="text" 
                                    value={currentComplaint.topic}
                                    onChange={e => setCurrentComplaint({...currentComplaint, topic: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-red-100 outline-none"
                                    placeholder="เช่น สินค้าชำรุด, ส่งของผิด..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('comp.desc')}</label>
                                <textarea 
                                    rows={4}
                                    value={currentComplaint.description}
                                    onChange={e => setCurrentComplaint({...currentComplaint, description: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 text-sm focus:ring-2 focus:ring-red-100 outline-none resize-none"
                                    placeholder="รายละเอียดปัญหา..."
                                />
                            </div>

                            <hr className="border-slate-100" />

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('comp.assigned')}</label>
                                <SearchableSelect 
                                    options={employeeOptions}
                                    value={currentComplaint.assignedEmployeeId}
                                    onChange={val => setCurrentComplaint({...currentComplaint, assignedEmployeeId: val})}
                                    placeholder="Assign to Employee..."
                                />
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('comp.resolution')} & Status</label>
                                    <select 
                                        value={currentComplaint.status}
                                        onChange={e => setCurrentComplaint({...currentComplaint, status: e.target.value as any})}
                                        className="text-xs font-bold border border-slate-300 rounded px-2 py-1 bg-white"
                                    >
                                        <option value="Open">Open</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Resolved">Resolved</option>
                                    </select>
                                </div>
                                <textarea 
                                    rows={3}
                                    value={currentComplaint.resolution || ''}
                                    onChange={e => setCurrentComplaint({...currentComplaint, resolution: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 text-sm focus:ring-2 focus:ring-green-100 outline-none bg-white resize-none"
                                    placeholder="บันทึกการแก้ไขปัญหา..."
                                />
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">ยกเลิก</button>
                            <button onClick={handleSave} className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-black transition-all flex items-center gap-2">
                                <Save size={18}/> บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Complaints;
