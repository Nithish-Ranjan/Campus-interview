import React from 'react';
import { ShieldCheck, ShieldX, ShieldAlert, CheckCircle2, Hourglass, MinusCircle, FlaskConical } from 'lucide-react';

export const StatusLegend: React.FC = () => {
  return (
    <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs text-xs space-y-3">
      <div className="font-semibold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Decision Architecture Legend</span>
        <span className="text-[11px] font-normal text-slate-400">Strictly Separated Domain Concepts</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Eligibility Family */}
        <div className="space-y-1.5 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
          <span className="font-semibold text-[#16845B] block text-xs">1. Eligibility (Mandatory Criteria)</span>
          <div className="flex items-center gap-1.5 text-[#16845B]">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Eligible: Meets all mandatory rules</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#DC2626]">
            <ShieldX className="w-3.5 h-3.5 shrink-0" />
            <span>Ineligible: Failed mandatory rule</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#D97706]">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Pending verification</span>
          </div>
        </div>

        {/* Selection Family */}
        <div className="space-y-1.5 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
          <span className="font-semibold text-blue-700 block text-xs">2. Selection (Capacity Slots)</span>
          <div className="flex items-center gap-1.5 text-blue-700">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Selected: Awarded interview slot</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <Hourglass className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span>Waitlisted: Eligible, capacity full</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <MinusCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Not selected this round</span>
          </div>
        </div>

        {/* Simulation */}
        <div className="space-y-1.5 p-3 rounded-lg bg-purple-50/50 border border-purple-100">
          <span className="font-semibold text-purple-800 block text-xs">3. What-If Simulation Sandbox</span>
          <div className="flex items-center gap-1.5 text-purple-700">
            <FlaskConical className="w-3.5 h-3.5 shrink-0" />
            <span>Violet Sandbox: Live schedule untouched</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal pt-0.5">
            Proposals require explicit Placement Officer sign-off before changes publish.
          </p>
        </div>
      </div>
    </div>
  );
};
