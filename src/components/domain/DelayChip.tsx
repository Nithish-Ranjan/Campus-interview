import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface DelayChipProps {
  minutes: number;
  reason?: string;
}

export const DelayChip: React.FC<DelayChipProps> = ({ minutes, reason }) => {
  if (!minutes || minutes <= 0) return null;

  const isMajor = minutes >= 20;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold ${
        isMajor
          ? 'bg-[#FCEBEB] text-[#A12525] border border-[#F8BABA]'
          : 'bg-[#FDF3DC] text-[#8A5300] border border-[#FADBA2]'
      }`}
      title={reason ? `Delayed by ${minutes} min: ${reason}` : `Delayed by ${minutes} min`}
    >
      {isMajor ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <Clock className="w-3.5 h-3.5 shrink-0" />}
      <span>+{minutes} min</span>
    </span>
  );
};
