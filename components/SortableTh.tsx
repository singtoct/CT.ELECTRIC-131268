
import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface SortableThProps {
    label?: string;
    sortKey: string;
    currentSort: { key: string, direction: 'ascending' | 'descending' } | null;
    onSort: (key: any) => void;
    className?: string;
    align?: 'left' | 'center' | 'right';
    children?: React.ReactNode;
}

const SortableTh: React.FC<SortableThProps> = ({ 
    label, sortKey, currentSort, onSort, className = "", align = 'left', children 
}) => {
    const isActive = currentSort?.key === sortKey;
    const direction = currentSort?.direction;

    return (
        <th 
            className={`cursor-pointer group select-none transition-colors hover:bg-slate-100 py-4 px-4 ${className}`}
            onClick={() => onSort(sortKey)}
            style={{ textAlign: align }}
        >
            <div className={`flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
                <span className={isActive ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-600'}>
                    {children || label}
                </span>
                <span className={`transition-all duration-200 ${isActive ? 'opacity-100 text-blue-600' : 'opacity-0 group-hover:opacity-40 text-slate-400'}`}>
                    {isActive ? (
                        direction === 'ascending' ? <ArrowUp size={14} strokeWidth={3}/> : <ArrowDown size={14} strokeWidth={3}/>
                    ) : (
                        <ArrowUpDown size={14}/>
                    )}
                </span>
            </div>
        </th>
    );
};

export default SortableTh;
