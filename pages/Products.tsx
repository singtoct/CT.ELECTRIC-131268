
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions, useApiKey } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Package, Search, Plus, Trash2, Save, X, Edit3, 
    Download, Upload, RefreshCw, BarChart3, Info, Sparkles, TrendingUp,
    Loader2
} from 'lucide-react';
import { Product, BOMItem } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const generateId = () => Math.random().toString(36).substr(2, 9);

const Products: React.FC = () => {
  const data = useFactoryData();
  const { factory_products = [], packing_raw_materials = [] } = data;
  const { updateData } = useFactoryActions();
  const { apiKey } = useApiKey();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isAiCalculating, setIsAiCalculating] = useState(false);

  const calculateProductCost = (prod: Product) => {
    if (!prod.bom) return 0;
    return prod.bom.reduce((acc, item) => {
      const mat = packing_raw_materials.find(m => m.id === item.materialId);
      return acc + (item.quantityPerUnit * (mat?.costPerUnit || 0));
    }, 0);
  };

  const handleEdit = (prod: Product) => {
    setCurrentProduct({ 
        ...prod, 
        bom: prod.bom || [],
        cycleTimeSeconds: prod.cycleTimeSeconds || 4,
        laborAllocation: prod.laborAllocation || 100,
        profitMargin: prod.profitMargin || 30
    });
    setIsModalOpen(true);
  };

  const handleAiSuggestPrice = async (prod: Product) => {
    if (!apiKey) {
        alert("กรุณาใส่ API Key ในหน้า Settings ก่อนใช้งานฟีเจอร์นี้");
        return;
    }
    setIsAiCalculating(true);
    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        const cost = calculateProductCost(prod);
        
        // Structured Prompt for Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze pricing for product: "${prod.name}" (Category: ${prod.category}). 
                       Production Cost: ${cost} THB. 
                       Target Profit Margin: ${prod.profitMargin}%. 
                       Context: Factory manufacturing plastic electrical equipment in Thailand.
                       Task: Calculate a recommended sale price considering the margin and local market competitiveness. Provide a short justification in Thai.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendedPrice: { type: Type.NUMBER, description: "The suggested selling price in THB" },
                        breakEvenPrice: { type: Type.NUMBER, description: "The break-even price (production cost)" },
                        justification: { type: Type.STRING, description: "Reasoning for the price based on cost and market factors (in Thai)" }
                    },
                    required: ["recommendedPrice", "breakEvenPrice", "justification"]
                }
            }
        });

        const result = JSON.parse(response.text || "{}");
        
        if (result.recommendedPrice) {
            setCurrentProduct(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    salePrice: result.recommendedPrice,
                    aiPriceRecommendation: {
                        recommendedPrice: result.recommendedPrice,
                        breakEvenPrice: result.breakEvenPrice || cost,
                        justification: result.justification || "Calculated by AI based on cost and margin.",
                    }
                };
            });
        }
    } catch (e) { 
        console.error("AI Error:", e);
        alert("AI Suggestion failed. Please check your API Key and try again."); 
    } finally { 
        setIsAiCalculating(false); 
    }
  };

  const handleSave = async () => {
    if (!currentProduct) return;
    let updatedProds = [...factory_products];
    const idx = updatedProds.findIndex(p => p.id === currentProduct.id);
    if (idx >= 0) updatedProds[idx] = currentProduct;
    else updatedProds.push(currentProduct);

    await updateData({ ...data, factory_products: updatedProds });
    setIsModalOpen(false);
  };

  const filteredProducts = useMemo(() => {
    return factory_products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [factory_products, search]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">จัดการรายการสินค้า</h2>
          <p className="text-slate-500 font-medium mt-1 uppercase text-xs tracking-[4px]">Technical & Pricing Control</p>
        </div>
        <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">
                <Upload size={18} /> นำเข้า (Excel)
            </button>
            <button className="flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all">
                <Plus size={20} /> เพิ่มสินค้า
            </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <h3 className="font-black text-slate-800 text-xl flex items-center gap-3">
                <BarChart3 className="text-primary-600" size={24}/> รายการสินค้าทั้งหมด
            </h3>
            <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="ค้นหาตามชื่อสินค้า..." 
                    className="w-full pl-12 pr-6 py-3.5 border-none bg-slate-50 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-400 font-black border-b border-slate-100 text-[10px] uppercase tracking-widest">
                    <tr>
                        <th className="px-10 py-6 w-10">
                            <input type="checkbox" className="rounded-lg text-primary-600 h-5 w-5 border-slate-300" />
                        </th>
                        <th className="px-6 py-6">ชื่อสินค้า</th>
                        <th className="px-6 py-6 text-right">ต้นทุนรวม</th>
                        <th className="px-6 py-6 text-right">กำไร (Margin)</th>
                        <th className="px-6 py-6 text-right">ราคาแนะนำ (AI)</th>
                        <th className="px-10 py-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((prod) => {
                        const cost = calculateProductCost(prod);
                        const profit = prod.salePrice - cost;
                        // Use stored recommendation or calc simple margin
                        const suggestedPrice = prod.aiPriceRecommendation?.recommendedPrice || (cost * (1 + (prod.profitMargin || 30) / 100));

                        return (
                            <tr key={prod.id} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-10 py-6">
                                    <input type="checkbox" className="rounded-lg text-primary-600 h-5 w-5 border-slate-300" />
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">
                                            {prod.name.substring(0, 1).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-800 text-base">{prod.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-black uppercase tracking-wider">{prod.category}</span>
                                                <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-black uppercase tracking-wider">{prod.standardColor}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6 text-right font-mono font-black text-slate-500 text-base">฿{cost.toFixed(2)}</td>
                                <td className="px-6 py-6 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className={`font-black font-mono text-base ${profit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>฿{profit.toFixed(2)}</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Per Unit</span>
                                    </div>
                                </td>
                                <td className="px-6 py-6 text-right">
                                    <div className="flex items-center justify-end gap-3 group/ai">
                                        <span className={`font-mono font-black text-lg ${prod.aiPriceRecommendation ? 'text-purple-600' : 'text-slate-400'}`}>
                                            ฿{suggestedPrice.toFixed(2)}
                                        </span>
                                        {prod.aiPriceRecommendation && <Sparkles size={14} className="text-purple-500" />}
                                    </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <button onClick={() => handleEdit(prod)} className="p-3 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-2xl transition-all"><Edit3 size={18} /></button>
                                        <button className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {isModalOpen && currentProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300 max-h-[90vh]">
            <div className="px-10 py-8 flex justify-between items-center border-b border-slate-100 bg-slate-50/30">
               <div>
                   <h3 className="text-2xl font-black text-slate-800 tracking-tight">แก้ไขข้อมูลสินค้า</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[2px] mt-1">Product Configuration Module</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:bg-white rounded-2xl shadow-sm border border-transparent hover:border-slate-100 transition-all"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 custom-scrollbar">
                {/* Section 1: Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อสินค้า</label>
                        <input type="text" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} className="w-full px-6 py-4 border border-slate-200 rounded-2xl bg-slate-50 font-black text-slate-800 focus:bg-white focus:border-primary-500 transition-all outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สีมาตรฐาน</label>
                        <input type="text" value={currentProduct.standardColor} onChange={e => setCurrentProduct({...currentProduct, standardColor: e.target.value})} className="w-full px-6 py-4 border border-slate-200 rounded-2xl bg-slate-50 font-black text-slate-800 focus:bg-white focus:border-primary-500 transition-all outline-none" />
                    </div>
                </div>

                {/* Section 2: Technical & Finance */}
                <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ประเภทสินค้า</label>
                            <select value={currentProduct.category} onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})} className="w-full px-6 py-4 border border-slate-200 rounded-2xl bg-white font-black text-slate-800 focus:border-primary-500 transition-all outline-none appearance-none">
                                <option value="สินค้าเพื่อขาย">สินค้าเพื่อขาย (Finished Goods)</option>
                                <option value="ชิ้นส่วนประกอบ">ชิ้นส่วนประกอบ (Sub-Assembly)</option>
                                <option value="วัตถุดิบ">วัตถุดิบ (Raw Material)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ต้นทุนรวม (อ้างอิงจาก BOM)</label>
                            <div className="w-full px-6 py-4 border border-slate-200 rounded-2xl bg-white font-black text-slate-500 font-mono text-xl">
                                ฿{calculateProductCost(currentProduct).toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เปอร์เซ็นต์กำไร (%)</label>
                                <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">Target Margin</span>
                            </div>
                            <input type="number" value={currentProduct.profitMargin} onChange={e => setCurrentProduct({...currentProduct, profitMargin: parseFloat(e.target.value) || 0})} className="w-full px-6 py-4 border border-slate-200 rounded-2xl bg-white font-black text-primary-700 focus:border-primary-500 transition-all outline-none" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ราคาขาย (ต่อหน่วย)</label>
                                <button onClick={() => handleAiSuggestPrice(currentProduct)} disabled={isAiCalculating} className="text-[10px] font-black text-purple-600 hover:underline flex items-center gap-1 transition-all hover:scale-105 active:scale-95">
                                    {isAiCalculating ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>} AI Analysis & Suggestion
                                </button>
                            </div>
                            <input type="number" value={currentProduct.salePrice} onChange={e => setCurrentProduct({...currentProduct, salePrice: parseFloat(e.target.value) || 0})} className="w-full px-6 py-4 border border-slate-200 rounded-2xl bg-white font-black text-slate-800 text-2xl focus:border-primary-500 transition-all outline-none font-mono" />
                        </div>
                    </div>

                    {/* AI Recommendation Box */}
                    {currentProduct.aiPriceRecommendation && (
                        <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100 shadow-sm animate-in zoom-in duration-300">
                             <div className="flex items-center gap-2 mb-3 text-purple-700 font-black">
                                <Sparkles size={16} /> AI Pricing Analysis
                             </div>
                             <div className="text-sm text-slate-700 space-y-2">
                                <div className="flex justify-between border-b border-purple-100 pb-2">
                                    <span className="font-bold">Break-Even Price:</span>
                                    <span className="font-mono font-bold text-slate-500">฿{currentProduct.aiPriceRecommendation.breakEvenPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-b border-purple-100 pb-2">
                                    <span className="font-bold">Recommended Price:</span>
                                    <span className="font-mono font-bold text-green-600">฿{currentProduct.aiPriceRecommendation.recommendedPrice.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="font-bold block mb-1">AI Reasoning:</span>
                                    <p className="text-xs leading-relaxed text-slate-600 italic">"{currentProduct.aiPriceRecommendation.justification}"</p>
                                </div>
                             </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cycle Time (วินาที)</label>
                            <input type="number" value={currentProduct.cycleTimeSeconds} onChange={e => setCurrentProduct({...currentProduct, cycleTimeSeconds: parseInt(e.target.value) || 0})} className="w-full px-6 py-4 border border-slate-200 rounded-2xl bg-white font-black text-slate-800 focus:border-primary-500 transition-all outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">การปันส่วนแรงงาน (%)</label>
                            <input type="number" value={currentProduct.laborAllocation} onChange={e => setCurrentProduct({...currentProduct, laborAllocation: parseInt(e.target.value) || 0})} className="w-full px-6 py-4 border border-slate-200 rounded-2xl bg-white font-black text-slate-800 focus:border-primary-500 transition-all outline-none" />
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <TrendingUp className="text-emerald-600" size={24}/>
                    <div>
                        <div className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">คาดการณ์กำไรสุทธิ</div>
                        <div className="text-xl font-black text-emerald-700 font-mono">฿{(currentProduct.salePrice - calculateProductCost(currentProduct)).toFixed(2)} / ชิ้น</div>
                    </div>
                </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 flex justify-end gap-4 border-t border-slate-100">
                <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-600 font-black hover:bg-slate-200 rounded-2xl transition-all">ยกเลิก</button>
                <button onClick={handleSave} className="px-12 py-4 bg-primary-600 text-white font-black rounded-2xl shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95">บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
