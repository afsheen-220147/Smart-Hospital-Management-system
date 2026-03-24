import React from 'react';
import { AlertTriangle } from 'lucide-react';

const DelayTag = ({ delay }) => {
  if (!delay || delay <= 0) return null;

  const isHighDelay = delay > 15;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold tabular-nums transition-all ${
      isHighDelay
        ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
        : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}>
      <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${isHighDelay ? 'animate-bounce' : ''}`} />
      <span className="text-[11px] font-semibold uppercase tracking-wider">
        {delay}m late
      </span>
    </div>
  );
};

export default DelayTag;

