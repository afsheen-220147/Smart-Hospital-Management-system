import React from 'react';

const colorMap = {
  emerald: { icon: 'text-emerald-600', bg: 'bg-emerald-50' },
  blue: { icon: 'text-blue-600', bg: 'bg-blue-50' },
  amber: { icon: 'text-amber-600', bg: 'bg-amber-50' },
  slate: { icon: 'text-slate-600', bg: 'bg-slate-50' },
};

const StatCard = ({ label, value, icon, color = 'slate' }) => {
  const { icon: iconColor, bg } = colorMap[color] || colorMap.slate;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
