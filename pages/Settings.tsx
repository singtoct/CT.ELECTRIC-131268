import React, { useState, useRef } from 'react';
import { useFactoryActions, useFactoryData } from '../App';
import { useTranslation } from '../services/i18n';
import { Upload, FileJson, RefreshCw, AlertTriangle, Check, X, Cloud, Loader2 } from 'lucide-react';
import { FactoryData } from '../types';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { updateData, resetData, isLoading: isGlobalLoading } = useFactoryActions();
  const { factory_settings } = useFactoryData();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    setSuccess(false);

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        setError(t('set.error'));
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            
            // Basic validation
            if (!json.packing_orders || !Array.isArray(json.packing_orders)) {
                 throw new Error("Invalid structure: missing packing_orders");
            }

            setIsProcessing(true);
            // Update context (and Firebase)
            await updateData(json as FactoryData);
            
            setIsProcessing(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            setIsProcessing(false);
            setError(t('set.error'));
        }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
      if (window.confirm(t('set.confirmReset'))) {
          setIsProcessing(true);
          await resetData();
          setIsProcessing(false);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
      }
  };

  const isLoading = isGlobalLoading || isProcessing;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('set.title')}</h2>
          <p className="text-slate-500">{t('set.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            <Cloud size={16} />
            <span>Cloud Sync Active</span>
        </div>
      </div>

      {/* Factory Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
         <div className="flex items-center gap-4">
            {factory_settings?.logoUrl && (
                <img src={factory_settings.logoUrl} alt="Logo" className="h-16 w-16 object-contain border border-slate-100 rounded-lg p-1" />
            )}
            <div>
                <h3 className="text-lg font-bold text-slate-800">{factory_settings?.companyInfo?.name || "Factory"}</h3>
                <p className="text-sm text-slate-500">{factory_settings?.companyInfo?.address}</p>
                <p className="text-xs text-slate-400 mt-1">Tax ID: {factory_settings?.companyInfo?.taxId}</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Data */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileJson size={20} className="text-primary-600" />
                  {t('set.dataManagement')}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                  {t('set.uploadDesc')}
              </p>

              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors relative
                    ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-slate-400'}
                    ${success ? 'border-green-500 bg-green-50' : ''}
                    ${error ? 'border-red-500 bg-red-50' : ''}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                  {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-4">
                          <Loader2 size={36} className="text-primary-600 animate-spin mb-2" />
                          <p className="text-sm text-slate-600">Uploading to Cloud...</p>
                      </div>
                  ) : success ? (
                      <div className="flex flex-col items-center text-green-600">
                          <Check size={48} className="mb-2" />
                          <span className="font-medium">{t('set.success')}</span>
                      </div>
                  ) : error ? (
                    <div className="flex flex-col items-center text-red-600">
                          <X size={48} className="mb-2" />
                          <span className="font-medium">{error}</span>
                          <button onClick={() => setError(null)} className="mt-2 text-xs underline">Try again</button>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center">
                        <Upload size={48} className="text-slate-300 mb-4" />
                        <p className="text-slate-600 font-medium mb-1">{t('set.selectFile')}</p>
                        <p className="text-xs text-slate-400 mb-4">{t('set.dragDrop')}</p>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                            disabled={isLoading}
                        >
                            Browse Files
                        </button>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept=".json" 
                            className="hidden" 
                            onChange={handleChange}
                        />
                      </div>
                  )}
              </div>
          </div>

          {/* Reset Data */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-orange-500" />
                  {t('set.reset')}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                  {t('set.resetDesc')}
              </p>
              
              <button 
                onClick={handleReset}
                disabled={isLoading}
                className="w-full border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-red-600 hover:border-red-200 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  {t('set.reset')}
              </button>
          </div>
      </div>
    </div>
  );
};

export default Settings;