import React from 'react';
import { 
  CheckCircle2, Clock, AlertCircle, XCircle, 
  Calendar, Watch, Pause, PlayCircle
} from 'lucide-react';

/**
 * Professional status badge component
 * Color-coded according to healthcare standards:
 * - Scheduled (Blue): Ready to start
 * - Ongoing (Orange): In progress
 * - Completed (Grey): Finished
 * - Cancelled (Red): Not happening
 */
export default function AppointmentStatusBadge({ 
  status, 
  size = 'md',
  showIcon = true,
  className = ''
}) {
  const statusConfig = {
    'pending': {
      icon: Watch,
      label: 'Pending',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
      dotColor: 'bg-yellow-500'
    },
    'confirmed': {
      icon: Calendar,
      label: 'Scheduled',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      dotColor: 'bg-blue-500'
    },
    'in-progress': {
      icon: Clock,
      label: 'Ongoing',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      dotColor: 'bg-orange-500'
    },
    'completed': {
      icon: CheckCircle2,
      label: 'Completed',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200',
      dotColor: 'bg-gray-500'
    },
    'cancelled': {
      icon: XCircle,
      label: 'Cancelled',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      dotColor: 'bg-red-500'
    },
    'no-show': {
      icon: AlertCircle,
      label: 'No-Show',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
      dotColor: 'bg-red-600'
    }
  };

  const config = statusConfig[status] || statusConfig['pending'];
  const IconComponent = config.icon;

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }[size];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-semibold
        rounded-full border ${sizeClasses}
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${className}
      `}
    >
      {showIcon && <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>}
      {config.label}
    </span>
  );
}
