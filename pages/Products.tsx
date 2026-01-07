
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions, useApiKey } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Search, Plus, Trash2, X, Edit3, 
    Upload, BarChart3, Sparkles, 
    Loader2, ChevronDown, Check, TrendingUp, AlertCircle
} from 'lucide-react';
import { Product } from '../types';
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
      // Robust Match: Try ID first, then Name
      const mat = packing_raw_materials.find(m => m.id === item.materialId) || 
                  packing_raw_materials.find(m => m.name === item.materialName);
      return acc + (item.quantityPerUnit * (mat?.costPerUnit || 0));
    }, 0);
  };

  const handleEdit = (prod: Product) => {
    setCurrentProduct({ 
        ...prod, 
        color: prod.color || '',
        bom: prod.bom || [],
        cycleTimeSeconds: prod.cycleTimeSeconds || 12,
        laborAllocation: prod.laborAllocation || 100,
        profitMargin: prod.profitMargin || 30
    });
    setIsModalOpen(true);
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

  const handleGenerateAiPrice = async () => {
    if (!apiKey) {
      alert("Please set Gemini API Key in Settings first.");
      return;
    }
    if (!currentProduct) return;

    setIsAiCalculating(true);
    try {
        const materialCost = calculateProductCost(currentProduct);
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
          You are a manufacturing pricing expert. Analyze this product to suggest a competitive sale price.
          
          Product Details:
          - Name: ${currentProduct.name}
          - Category: ${currentProduct.category}
          - Raw Material Cost (BOM): ${materialCost.toFixed(2)} THB
          - Cycle Time: ${currentProduct.cycleTimeSeconds} seconds (Impacts labor/machine cost)
          - Target Profit Margin: ${currentProduct.profitMargin}%

          Your Task:
          1. Estimate manufacturing overheads (Machine depreciation, Electricity, Labor) typical for a Thai plastic factory.
          2. Calculate a break-even price (Material + Overhead).
          3. Recommend a Sale Price that meets the margin target but remains competitive.
          4. Provide a market price range (Min/Max) for similar plastic products.
          5. Write a very brief justification (max 2 sentences).

          Output strictly valid JSON.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        breakEvenPrice: { type: Type.NUMBER },
                        recommendedPrice: { type: Type.NUMBER },
                        justification: { type: Type.STRING },
                        marketMinPrice: { type: Type.NUMBER },
                        marketMaxPrice: { type: Type.NUMBER }
                    }
                }
            }
        });

        const result = JSON.parse(response.text || "{}");
        setCurrentProduct(prev => prev ? ({
            ...prev,
            aiPriceRecommendation: {
                breakEvenPrice: result.breakEvenPrice || 0,
                recommendedPrice: result.recommendedPrice || 0,
                justification: result.justification || "",
                marketMinPrice: result.marketMinPrice || 0,
                marketMaxPrice: result.marketMaxPrice || 0
            }
        }) : null);

    } catch (error) {
        console.error("AI Price Gen Error:", error);
        alert("Failed to generate price recommendation. Please check API Key.");
    } finally {
        setIsAiCalculating(false);
    }
  };

  const applyRecommendedPrice = () => {
      if (currentProduct?.aiPriceRecommendation?.recommendedPrice) {
          setCurrentProduct({
              ...currentProduct,
              salePrice: currentProduct.aiPriceRecommendation.recommendedPrice
          });
      }
  };

  const filteredProducts = useMemo(() => {
    return factory_products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [factory_products, search]);

  const inputClasses = "w-full px-5 py-4 border border-slate-300 rounded-2xl font-bold !text-slate-900 !bg-white focus:ring-4 focus:ring-primary-50 focus:border-primary-500 outline-none transition-all shadow-sm";

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">จัดการรายการสินค้า</h2>
          <p className="text-slate-500 font-medium mt-1 uppercase text-xs tracking-[4px]">TECHNICAL & PRICING CONTROL</p>
        </div>
        <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">
                <Upload size={18} /> นำเข้า (Excel)
            </button>
            <button 
                onClick={() => {
                    setCurrentProduct({
                        id: generateId(), name: '', color: '', category: 'สินค้าเพื่อขาย', salePrice: 0,
                        totalCost: 0, overheadCost: 0, laborCost: 0, materialCost: 0, profit: 0,
                        cycleTimeSeconds: 12, laborAllocation: 100, productType: 'Finished Good',
                        profitMargin: 30, bom: []
                    });
                    setIsModalOpen(true);
                }}
                className="flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all"
            >
                <Plus size={20} /> เพิ่มสินค้า
            </button>
        </div>
      </div>

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
                    className="w-full pl-12 pr-6 py-3.5 border-none !bg-slate-100 rounded-2xl text-sm font-bold focus:!bg-white focus:ring-4 focus:ring-primary-50 transition-all outline-none !text-slate-900"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-400 font-black border-b border-slate-100 text-[10px] uppercase tracking-widest">
                    <tr>
                        <th className="px-10 py-6">ชื่อสินค้า</th>
                        <th className="px-6 py-6 text-right">ต้นทุนรวม</th>
                        <th className="px-6 py-6 text-right">ราคาขาย</th>
                        <th className="px-10 py-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-50/30 transition-colors group">
                            <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">{prod.name.charAt(0)}</div>
                                    <div>
                                        <div className="font-black text-slate-800 text-base">{prod.name} {prod.color && <span className="text-slate-400 font-medium">({prod.color})</span>}</div>
                                        <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-black uppercase tracking-wider">{prod.category}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-6 text-right font-mono font-black text-slate-500 text-base">฿{calculateProductCost(prod).toFixed(2)}</td>
                            <td className="px-6 py-6 text-right font-mono font-black text-emerald-600 text-base">฿{prod.salePrice.toFixed(2)}</td>
                            <td className="px-10 py-6 text-right">
                                <button onClick={() => handleEdit(prod)} className="p-3 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-2xl transition-all"><Edit3 size={18} /></button>
                                <button onClick={() => updateData({...data, factory_products: factory_products.filter(p => p.id !== prod.id)})} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all ml-2"><Trash2 size={18} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && currentProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center">
               <h3 className="text-3xl font-black text-slate-800 tracking-tight">แก้ไขสินค้า</h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><X size={28}/></button>
            </div>

            <div className="flex-1 overflow-y-auto px-10 py-8 space-y-6 custom-scrollbar max-h-[75vh]">
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-widest">ชื่อสินค้า</label>
                    <input type="text" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} className={inputClasses} placeholder="ระบุชื่อสินค้า..." />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-widest">สี</label>
                    <input type="text" value={currentProduct.color} onChange={e => setCurrentProduct({...currentProduct, color: e.target.value})} className={inputClasses} placeholder="ระบุสี เช่น สีขาว, สีดำ..." />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-widest">ประเภทสินค้า</label>
                    <div className="relative">
                        <select value={currentProduct.category} onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})} className={inputClasses + " appearance-none"}>
                            <option value="สินค้าเพื่อขาย">สินค้าเพื่อขาย</option>
                            <option value="ชิ้นส่วนประกอบ">ชิ้นส่วนประกอบ</option>
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={20} />
                    </div>
                </div>
                
                {/* Cost & Price Section */}
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-700 flex items-center gap-2"><TrendingUp size={18}/> Pricing Strategy</h4>
                        <div className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">
                            BOM Cost: ฿{calculateProductCost(currentProduct).toFixed(2)}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Margin (%)</label>
                            <input type="number" value={currentProduct.profitMargin} onChange={e => setCurrentProduct({...currentProduct, profitMargin: parseFloat(e.target.value) || 0})} className={inputClasses + " text-center !py-3 !text-sm"} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sale Price (฿)</label>
                            <input type="number" step="0.01" value={currentProduct.salePrice} onChange={e => setCurrentProduct({...currentProduct, salePrice: parseFloat(e.target.value) || 0})} className={inputClasses + " !text-emerald-600 text-center font-mono !py-3 !text-sm"} />
                        </div>
                    </div>

                    {/* AI Price Recommendation */}
                    <div className="mt-4 border-t border-slate-200 pt-4">
                        {!currentProduct.aiPriceRecommendation ? (
                            <button 
                                onClick={handleGenerateAiPrice} 
                                disabled={isAiCalculating}
                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 hover:shadow-xl transition-all disabled:opacity-70"
                            >
                                {isAiCalculating ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18} />}
                                {isAiCalculating ? "Analyzing Costs..." : "Ask AI Suggestion"}
                            </button>
                        ) : (
                            <div className="bg-white rounded-xl border border-violet-100 shadow-sm p-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
                                <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-black text-violet-800 text-sm flex items-center gap-1"><Sparkles size={14}/> AI Insight</h5>
                                    <button onClick={() => setCurrentProduct({...currentProduct, aiPriceRecommendation: undefined})} className="text-slate-300 hover:text-slate-500"><X size={14}/></button>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Break-Even</span>
                                        <span className="text-sm font-mono font-black text-slate-700">฿{currentProduct.aiPriceRecommendation.breakEvenPrice.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-violet-400 font-bold uppercase block">Recommended</span>
                                        <span className="text-xl font-mono font-black text-violet-600">฿{currentProduct.aiPriceRecommendation.recommendedPrice.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg mb-3">
                                    <p className="text-[10px] text-slate-600 leading-relaxed italic">"{currentProduct.aiPriceRecommendation.justification}"</p>
                                    <div className="flex justify-between mt-1 text-[9px] font-bold text-slate-400">
                                        <span>Market Range: ฿{currentProduct.aiPriceRecommendation.marketMinPrice} - ฿{currentProduct.aiPriceRecommendation.marketMaxPrice}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={applyRecommendedPrice}
                                    className="w-full bg-violet-50 text-violet-700 py-2 rounded-lg text-xs font-black hover:bg-violet-100 transition-colors flex items-center justify-center gap-1"
                                >
                                    <Check size={14}/> Apply This Price
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-widest">Cycle Time (วินาที)</label>
                    <input type="number" value={currentProduct.cycleTimeSeconds} onChange={e => setCurrentProduct({...currentProduct, cycleTimeSeconds: parseInt(e.target.value) || 0})} className={inputClasses} />
                </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-500 font-black hover:bg-slate-200 rounded-2xl transition-all">ยกเลิก</button>
                <button onClick={handleSave} className="px-12 py-4 bg-primary-600 text-white font-black rounded-2xl shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
