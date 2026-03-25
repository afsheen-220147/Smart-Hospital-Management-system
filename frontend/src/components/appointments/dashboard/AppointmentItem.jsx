import React from 'react';
import { Clock, Hash, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';

const AppointmentItem = ({ appointment, isSelected, onClick }) => {
  const isCancelled = appointment.status === 'cancelled';

  return (
    <div 
      onClick={() => onClick(appointment)}
      className={`
        p-4 border-b border-gray-100 cursor-pointer transition-all duration-200
        hover:bg-gray-50 active:bg-gray-100
        ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600 shadow-sm' : 'border-l-4 border-l-transparent'}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
          {appointment.patientName}
        </h3>
        <StatusBadge status={appointment.status} />
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{appointment.time}</span>
        </div>
        
        {appointment.queueNumber > 0 && (
          <div className="flex items-center gap-1 font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
            <Hash className="w-3 h-3" />
            <span>#{appointment.queueNumber}</span>
          </div>
        )}
      </div>

      {/* Cancellation Info (if cancelled) */}
      {isCancelled && appointment.cancelledBy && (
        <div className="mt-2 pt-2 border-t border-red-100">
          <p className="text-xs font-medium text-red-700">
            {appointment.cancelledBy === 'patient' 
              ? 'By patient' 
              : appointment.cancelledBy === 'doctor' 
              ? 'By doctor' 
              : appointment.cancelledBy === 'admin' 
              ? 'By admin' 
              : 'By system'}
          </p>
          {appointment.cancelReason && (
            <p className="text-xs text-red-600 truncate italic mt-0.5">"{appointment.cancelReason}"</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AppointmentItem;