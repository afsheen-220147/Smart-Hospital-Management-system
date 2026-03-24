import React from 'react';
import AppointmentItem from './AppointmentItem';

const AppointmentList = ({ appointments, selectedId, onSelect, className }) => {
  if (!appointments || appointments.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-gray-500 min-h-[300px] ${className}`}>
        <p className="text-sm font-medium">No appointments scheduled</p>
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto ${className}`}>
      {appointments.map(appointment => (
        <AppointmentItem
          key={appointment._id}
          appointment={appointment}
          isSelected={selectedId === appointment._id}
          onClick={onSelect}
        />
      ))}
    </div>
  );
};

export default AppointmentList;