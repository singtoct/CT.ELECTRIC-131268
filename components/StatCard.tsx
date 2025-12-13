import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple';
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-purple-50 text-purple-600',
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, color = 'blue' }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-full ${colorMap[color]}`}>
          <Icon size={24} />
        </div>
      </div>
      {trend && (
        <div className={`mt-4 text-sm font-medium flex items-center ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          <span>{trend}</span>
          <span className="text-slate-400 ml-2 font-normal">vs last month</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;