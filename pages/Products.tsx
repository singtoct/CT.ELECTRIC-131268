
import React, { useState, useMemo } from 'react';
import { useFactoryData, useFactoryActions, useApiKey } from '../App';
import { useTranslation } from '../services/i18n';
import { 
    Search, Plus, Edit2, Trash2, X, Save, Sparkles, Check, Loader2, Package, RefreshCw, Layers
} from 'lucide-react';
import { Product, AiPriceRecommendation } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const generateId = () => Math.random().toString(36).substr(2, 9);

const Products: React.FC = () => {
    const data = useFactoryData();
    const { factory_products = [], packing_raw_materials = [], factory_settings } = data;
    const { updateData } = useFactoryActions();
    const { t } = useTranslation();
    const { apiKey } = useApiKey();

    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
    const [isAiCalculating, setIsAiCalculating] = useState(false);

    const filteredProducts = useMemo(() => {
        return factory_products.filter(p => 
            p.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [factory_products, search]);

    const handleOpenModal = (product?: Product) => {
        if (product) {
            setCurrentProduct({ ...product });
        } else {
            setCurrentProduct({
                id: generateId(),
                name: '',
                color: '',
                cycleTimeSeconds: 15,
                salePrice: 0,
                cost: 0,
                productType: 'FinishedGood',
                cavity: 1, // Default cavity
                minTonnage: 0 // Default min tonnage
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this product?")) return;
        const updated = factory_products.filter(p => p.id !== id);
        await updateData({ ...data, factory_products: updated });
    };

    const handleSave = async () => {
        if (!currentProduct.name) { alert("Please enter product name"); return; }
        let updatedList = [...factory_products];
        const payload = currentProduct as Product;
        const idx = updatedList.findIndex(p => p.id === payload.id);
        if (idx >= 0) { updatedList[idx] = payload; } else { updatedList.push(payload); }
        await updateData({ ...data, factory_products: updatedList });
        setIsModalOpen(false);
    };

    const handleGenerateAiPrice = async () => {
        if (!apiKey) { alert("Please set API Key in Settings first."); return; }
        
        let materialCost = 0;
        if (currentProduct.bom) {
            currentProduct.bom.forEach(b => {
                const mat = packing_raw_materials.find(m => m.id === b.materialId);
                // Fallback name matching if ID not found
                const matByName = !mat ? packing_raw_materials.find(m => m.name === b.materialName) : null;
                const cost = mat ? mat.costPerUnit : (matByName ? matByName.costPerUnit : 0);
                
                if (cost) materialCost += b.quantityPerUnit * cost;
            });
        }
        
        const overheadRate = factory_settings.overheadRatePerHour || 0;
        const depreciationRate = factory_settings.depreciationCostPerHour || 0;
        const cycleTime = currentProduct.cycleTimeSeconds || 15;
        const overheadPerUnit = ((overheadRate + depreciationRate) / 3600) * cycleTime;
        const totalCost = materialCost + overheadPerUnit;

        setIsAiCalculating(true);
        try {
            const ai = new GoogleGenAI({ apiKey });
            
            // Enhanced Prompt
            const prompt = `
                Role: Senior Pricing Analyst for a Plastic Injection Molding Factory in Thailand.
                Product: "${currentProduct.name}"
                Color: "${currentProduct.color || 'Standard'}"
                Production Cost: ${totalCost.toFixed(2)} THB/unit (Material + Overhead).
                Cycle Time: ${cycleTime} seconds.
                
                Task: Suggest a competitive wholesale selling price.
                1. Consider typical industry profit margins (20-50%) for plastic parts.
                2. Analyze potential market value for this type of product.
                3. Calculate Break-Even Price (Production Cost).
                
                Output JSON schema:
                {
                    "breakEvenPrice": number,
                    "recommendedPrice": number,
                    "justification": "Short explanation (Thai language)",
                    "marketMinPrice": number,
                    "marketMaxPrice": number
                }
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

            if (response.text) {
                const result = JSON.parse(response.text) as AiPriceRecommendation;
                setCurrentProduct(prev => ({ ...prev, aiPriceRecommendation: result }));
            }
        } catch (error) {
            console.error("AI Price Error", error);
            alert("Failed to generate price. Please check API Key or Internet connection.");
        } finally {
            setIsAiCalculating(false);
        }
    };

    const applyRecommendedPrice = () => {
        if (currentProduct.aiPriceRecommendation) {
            setCurrentProduct(prev => ({ ...prev, salePrice: prev.aiPriceRecommendation?.recommendedPrice || prev.salePrice }));
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('nav.products')}</h2>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[3px] mt-1">{t('nav.products')} Management</p>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 shadow-lg transition-all active:scale-95">
                    <Plus size={20} /> {t('product.add')}
                </button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder={t('product.search')} className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-50 bg-white text-slate-900 font-bold" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                    <div key={product.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal(product)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100"><Edit2 size={16}/></button>
                            <button onClick={() => handleDelete(product.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><Trash2 size={16}/></button>
                        </div>
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400"><Package size={24}/></div>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg line-clamp-1" title={product.name}>{product.name}</h3>
                                <p className="text-xs text-slate-500 font-bold">{product.color}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="block text-slate-400 font-bold uppercase text-[9px] mb-1">{t('product.price')}</span>
                                <span className="text-base font-black text-slate-800">฿{product.salePrice.toFixed(2)}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="block text-slate-400 font-bold uppercase text-[9px] mb-1">Cycle</span>
                                <span className="text-base font-black text-slate-800">{product.cycleTimeSeconds}s</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && currentProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">{currentProduct.id ? t('product.edit') : t('product.new')}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><X size={24}/></button>
                        </div>
                        <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('product.name')}</label><input type="text" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none" /></div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('product.color')}</label><input type="text" value={currentProduct.color} onChange={e => setCurrentProduct({...currentProduct, color: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none" /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('product.price')}</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span><input type="number" value={currentProduct.salePrice} onChange={e => setCurrentProduct({...currentProduct, salePrice: parseFloat(e.target.value) || 0})} className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl font-black text-xl text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none" /></div></div>
                            </div>

                            {/* Production Params Section */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Layers size={14}/> Production Parameters
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('product.cycleTime')}</label><input type="number" value={currentProduct.cycleTimeSeconds} onChange={e => setCurrentProduct({...currentProduct, cycleTimeSeconds: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none bg-white" /></div>
                                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cavity (Pcs/Shot)</label><input type="number" value={currentProduct.cavity || 1} onChange={e => setCurrentProduct({...currentProduct, cavity: parseInt(e.target.value) || 1})} className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none bg-white" /></div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Min Machine Tonnage (T)</label>
                                    <input type="number" value={currentProduct.minTonnage || 0} onChange={e => setCurrentProduct({...currentProduct, minTonnage: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none bg-white" placeholder="e.g. 120 Tons" />
                                </div>
                            </div>
                            
                            {/* AI Price Recommendation Section */}
                            <div className="mt-4 border-t border-slate-200 pt-6">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Sparkles size={14} className="text-violet-500"/> AI Price Assistant
                                </label>
                                
                                {!currentProduct.aiPriceRecommendation ? (
                                    <>
                                        <button 
                                            onClick={handleGenerateAiPrice} 
                                            disabled={isAiCalculating} 
                                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 hover:shadow-xl transition-all disabled:opacity-70"
                                        >
                                            {isAiCalculating ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18} />}
                                            {isAiCalculating ? t('product.aiAnalyzing') : t('product.aiBtn')}
                                        </button>
                                        {isAiCalculating && (
                                            <div className="mt-3 bg-violet-50 border border-violet-100 rounded-xl p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                                                <div className="bg-white p-1.5 rounded-lg shadow-sm shrink-0"><Loader2 size={16} className="text-violet-600 animate-spin"/></div>
                                                <div>
                                                    <p className="text-xs font-black text-violet-700">AI Processing</p>
                                                    <p className="text-[10px] text-violet-500 mt-0.5 leading-tight">Analyzing BOM cost, overheads, and market data...</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="bg-white rounded-xl border border-violet-100 shadow-sm p-5 relative overflow-hidden animate-in zoom-in duration-200">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
                                        <div className="flex justify-between items-start mb-3">
                                            <h5 className="font-black text-violet-800 text-sm flex items-center gap-2">
                                                <Sparkles size={16} fill="currentColor" className="text-violet-400"/> {t('product.aiTitle')}
                                            </h5>
                                            <div className="flex gap-1">
                                                <button onClick={handleGenerateAiPrice} className="p-1 text-slate-300 hover:text-violet-600 transition-colors" title="Regenerate"><RefreshCw size={14}/></button>
                                                <button onClick={() => setCurrentProduct({...currentProduct, aiPriceRecommendation: undefined})} className="p-1 text-slate-300 hover:text-slate-500 transition-colors"><X size={14}/></button>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">{t('product.breakEven')}</span>
                                                <span className="text-sm font-mono font-black text-slate-600">฿{currentProduct.aiPriceRecommendation.breakEvenPrice.toFixed(2)}</span>
                                            </div>
                                            <div className="bg-violet-50 p-2 rounded-lg border border-violet-100">
                                                <span className="text-[9px] text-violet-500 font-bold uppercase block mb-1">{t('product.recommended')}</span>
                                                <span className="text-xl font-mono font-black text-violet-700">฿{currentProduct.aiPriceRecommendation.recommendedPrice.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 p-3 rounded-lg mb-4">
                                            <p className="text-[10px] text-slate-600 leading-relaxed italic border-l-2 border-slate-300 pl-2">
                                                "{currentProduct.aiPriceRecommendation.justification}"
                                            </p>
                                            <div className="flex justify-between mt-2 pt-2 border-t border-slate-200/50 text-[9px] font-bold text-slate-400">
                                                <span>Market Range: ฿{currentProduct.aiPriceRecommendation.marketMinPrice} - ฿{currentProduct.aiPriceRecommendation.marketMaxPrice}</span>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={applyRecommendedPrice} 
                                            className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-violet-200"
                                        >
                                            <Check size={14} strokeWidth={3}/> {t('product.applyPrice')} (฿{currentProduct.aiPriceRecommendation.recommendedPrice})
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">{t('product.cancel')}</button>
                            <button onClick={handleSave} className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-black transition-all flex items-center gap-2"><Save size={18}/> {t('product.save')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;
