
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, unit, icon, color = 'blue', trend }) => {
  const colorMap: Record<string, string> = {
    blue: 'border-blue-500/50 text-blue-400 bg-blue-500/10',
    red: 'border-red-500/50 text-red-400 bg-red-500/10',
    amber: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
    emerald: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
  };

  return (
    <div className={`p-4 rounded-xl border-2 backdrop-blur-md transition-all duration-300 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
        <div className="p-1 rounded bg-white/10">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm opacity-60 font-medium">{unit}</span>}
      </div>
    </div>
  );
};
