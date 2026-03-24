import React from 'react';
import { CheckCircle, Clock, XCircle, PlayCircle, HelpCircle, Zap } from 'lucide-react';

const StatusBadge = ({ status, size = 'md' }) => {
  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return {
          bg: 'bg-emerald-100',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          icon: <CheckCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />,
          label: 'Confirmed',
          dot: 'bg-emerald-500'
        };
      case 'ongoing':
      case 'in-progress':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          border: 'border-blue-200',
          icon: <PlayCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1 animate-pulse`} />,
          label: 'Ongoing',
          dot: 'bg-blue-500 animate-pulse'
        };
      case 'completed':
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          border: 'border-slate-200',
          icon: <CheckCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />,
          label: 'Completed',
          dot: 'bg-slate-400'
        };
      case 'cancelled':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          border: 'border-red-200',
          icon: <XCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />,
          label: 'Cancelled',
          dot: 'bg-red-500'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: <HelpCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />,
          label: status || 'Unknown',
          dot: 'bg-gray-400'
        };
    }
  };

  const { bg, text, icon, label, border, dot } = getStatusStyles(status);

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs'
    : 'px-3 py-1.5 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold uppercase tracking-wide border ${bg} ${text} ${border} shadow-sm hover:shadow-md transition-shadow ${sizeClasses}`}>
      <span className={`w-2 h-2 rounded-full mr-1.5 ${dot}`} />
      {icon}
      {label}
    </span>
  );
};

export default StatusBadge;
