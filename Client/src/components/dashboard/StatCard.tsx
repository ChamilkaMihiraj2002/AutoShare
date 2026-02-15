import type { ReactNode } from 'react';

interface StatCardProps {
    label: string;
    value: string;
    subtext: string;
    subtextClass?: string;
    icon: ReactNode;
    trend?: 'up' | 'down' | 'neutral';
}

const StatCard = ({ label, value, subtext, subtextClass, icon }: StatCardProps) => {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="bg-orange-50 p-3 rounded-xl text-orange-600">
                    {icon}
                </div>
                {/* Optional Trend Icon could go here */}
            </div>
            <div>
                <p className="text-gray-500 font-medium text-sm mb-1">{label}</p>
                <h3 className="text-2xl font-bold text-[#003049] mb-1">{value}</h3>
                <p className={`text-xs font-bold ${subtextClass || 'text-gray-400'}`}>{subtext}</p>
            </div>
        </div>
    );
};

export default StatCard;
