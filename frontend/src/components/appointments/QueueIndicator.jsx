import React from 'react';
import { Users } from 'lucide-react';

const QueueIndicator = ({ position, size = 'md' }) => {
  if (!position && position !== 0) return null;

  if (size === 'sm') {
    return (
      <div className="flex items-center px-2.5 py-1.5 bg-teal-600 text-white rounded-lg gap-1.5 text-xs font-semibold">
        <Users className="w-3 h-3" />
        # {position}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-2xl p-3.5 min-w-[70px] shadow-lg hover:shadow-xl transition-shadow border border-teal-500/30">
      <div className="flex items-center gap-1 mb-1.5">
        <Users className="w-3.5 h-3.5 opacity-80" />
        <span className="text-[9px] uppercase font-bold tracking-tighter opacity-75 leading-none">Queue</span>
      </div>
      <span className="text-2xl font-black leading-none tabular-nums">#{position}</span>
      {position === 1 && (
        <div className="mt-1 px-2 py-0.5 bg-yellow-400/30 rounded-md border border-yellow-400/50">
          <span className="text-[8px] font-bold text-yellow-100 uppercase tracking-widest">Next</span>
        </div>
      )}
    </div>
  );
};

export default QueueIndicator;

