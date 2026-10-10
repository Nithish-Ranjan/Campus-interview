import React from 'react';
import { AlertOctagon, UserX, Clock, Building2, Shuffle } from 'lucide-react';
import type { ScheduleConflict } from '@/lib/api/types';

interface ConflictCalloutProps {
  conflicts: ScheduleConflict[];
  onDismiss?: () => void;
}

export const ConflictCallout: React.FC<ConflictCalloutProps> = ({ conflicts, onDismiss }) => {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div 
      className="p-4 bg-[#FCEBEB] border-l-4 border-[#A12525] rounded-r-lg space-y-2.5 text-xs text-[#12161C] shadow-sm my-3"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-[#A12525] text-sm">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>409 Scheduling Conflict Detected</span>
        </div>
        {onDismiss && (
          <button 
            type="button" 
            onClick={onDismiss}
            className="text-xs text-[#A12525] hover:underline font-medium"
          >
            Dismiss
          </button>
        )}
      </div>

      <div className="space-y-2">
        {conflicts.map((c, i) => (
          <div key={i} className="p-2.5 bg-[#FFFFFF] rounded border border-[#F8BABA] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[#A12525]">
              {c.type === 'interviewer' && <UserX className="w-3.5 h-3.5" />}
              {c.type === 'room' && <Building2 className="w-3.5 h-3.5" />}
              {c.type === 'student' && <UserX className="w-3.5 h-3.5" />}
              {c.type === 'cross_company_student' && <Shuffle className="w-3.5 h-3.5" />}
              <span>{c.resource}</span>
              <span className="text-[#6B7686] font-normal font-mono text-[11px]">({c.timeRange})</span>
            </div>

            <p className="text-[#4A5565] leading-relaxed">
              {c.message}
            </p>

            <div className="text-[11px] text-[#6B7686] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#A12525]" />
              <span>Clashing with: <strong className="text-[#12161C]">{c.counterpart}</strong></span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#A12525] font-medium">
        The interview card has been retained in its original slot. No schedule changes were applied.
      </p>
    </div>
  );
};
