import React from 'react';
import { FlaskConical, ShieldAlert } from 'lucide-react';

interface SimulationBannerProps {
  version?: number;
}

export const SimulationBanner: React.FC<SimulationBannerProps> = ({ version = 1 }) => {
  return (
    <div 
      className="w-full bg-[#F0EBFA] border-y border-[#9B86D6] px-4 py-2.5 flex items-center justify-between text-xs text-[#5B3FA8] shadow-xs"
      role="status"
      aria-label="Simulation sandbox active"
    >
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded bg-[#E4D7F5] text-[#5B3FA8]">
          <FlaskConical className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold tracking-wide uppercase text-[11px] mr-2 text-[#462D8E]">Sandbox Simulation:</span>
          <span className="font-medium text-[#5B3FA8]">The published schedule is NOT changed. All edits and disruptions remain sandboxed.</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono font-semibold bg-[#FFFFFF] text-[#5B3FA8] border border-[#C5B3E8] text-[11px]">
          <ShieldAlert className="w-3 h-3 text-[#5B3FA8]" />
          <span>Published Base: v{version} (Locked)</span>
        </span>
      </div>
    </div>
  );
};
