
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Plus } from 'lucide-react';

interface Option {
    value: string | number;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | number | null | undefined;
    onChange: (value: any) => void;
    onCreate?: (newValue: string) => void; // New Prop for creating items
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    error?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
    options, value, onChange, onCreate, placeholder = "Select...", className = "", disabled = false, error = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    const filteredOptions = options.filter(o => 
        o.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (o.subLabel && o.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSelect = (val: any) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCreate = () => {
        if (onCreate && searchTerm.trim()) {
            onCreate(searchTerm.trim());
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div 
                className={`
                    w-full border rounded-lg px-3 py-2 text-sm !bg-white flex items-center justify-between cursor-pointer transition-all
                    ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'hover:border-primary-400'} 
                    ${isOpen ? 'ring-2 ring-primary-500 border-primary-500' : error ? 'border-red-300' : 'border-slate-300'}
                `}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                        setTimeout(() => inputRef.current?.focus(), 100);
                    }
                }}
            >
                <span className={`truncate font-bold ${!selectedOption ? 'text-slate-400' : '!text-slate-900'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className={`text-slate-400 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[999] w-full min-w-[200px] mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 left-0">
                    <div className="p-2 border-b border-slate-100 bg-slate-100 sticky top-0">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                ref={inputRef}
                                type="text" 
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md outline-none focus:border-primary-500 !bg-white !text-slate-900 font-bold"
                                placeholder={onCreate ? "พิมพ์เพื่อค้นหา หรือ เพิ่มใหม่..." : "พิมพ์เพื่อค้นหา..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        // If exact match exists, select it
                                        const exactMatch = filteredOptions.find(o => o.label.toLowerCase() === searchTerm.toLowerCase());
                                        if (exactMatch) handleSelect(exactMatch.value);
                                        // Else if Create enabled, create it
                                        else if (onCreate && searchTerm.trim()) handleCreate();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar bg-white">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div 
                                    key={opt.value} 
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 hover:text-primary-700 border-b border-slate-50 last:border-0 ${opt.value === value ? 'bg-primary-50 text-primary-700 font-black' : 'text-slate-700 font-bold'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(opt.value);
                                    }}
                                >
                                    <div className="flex flex-col">
                                        <span>{opt.label}</span>
                                        {opt.subLabel && <span className="text-[10px] text-slate-400 font-medium">{opt.subLabel}</span>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center">
                                <span className="text-xs text-slate-400 block mb-2">ไม่พบข้อมูล</span>
                                {onCreate && searchTerm && (
                                    <button 
                                        className="w-full bg-blue-50 text-blue-600 px-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-100 transition-all"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCreate();
                                        }}
                                    >
                                        <Plus size={14}/> เพิ่ม "{searchTerm}"
                                    </button>
                                )}
                            </div>
                        )}
                        {/* Always show Add button if onCreate is present and we have typed something that is not an exact match (optional UX, keeping it simple above) */}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
