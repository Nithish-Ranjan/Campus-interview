import React from 'react';
import { ShieldCheck, ShieldX, ShieldAlert, CheckCircle2, Hourglass, MinusCircle, HelpCircle } from 'lucide-react';
import type { EligibilityStatus, SelectionStatus } from '@/lib/api/types';

interface DecisionTrioProps {
  eligibility: EligibilityStatus;
  matchScore: number | null;
  selection: SelectionStatus;
  onWhyClick?: () => void;
  compact?: boolean;
}

export const EligibilityBadge: React.FC<{ status: EligibilityStatus; compact?: boolean }> = ({ status, compact = false }) => {
  switch (status) {
    case 'eligible':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-[#16845B] border border-emerald-200/90 shadow-2xs"
          title="Eligible: Passed all mandatory criteria"
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#16845B]" aria-hidden="true" />
          <span>Eligible</span>
        </span>
      );
    case 'ineligible':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-[#DC2626] border border-red-200/90 shadow-2xs"
          title="Ineligible: Failed one or more mandatory criteria"
        >
          <ShieldX className="w-3.5 h-3.5 shrink-0 text-[#DC2626]" aria-hidden="true" />
          <span>Ineligible</span>
        </span>
      );
    case 'pending_verification':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-200/90 shadow-2xs"
          title="Pending verification: Awaiting official verification of criteria data"
        >
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-[#D97706]" aria-hidden="true" />
          <span>Pending verification</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">
          <span>Unknown</span>
        </span>
      );
  }
};

export const MatchScoreBadge: React.FC<{ score: number | null }> = ({ score }) => {
  if (score === null || score === undefined) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200"
        title="Preferred-skills match score: Not scored"
      >
        Not scored
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-800 border border-slate-200 tabular-nums shadow-2xs"
      title={`Preferred-skills match score: ${score}% (ranks eligible candidates)`}
    >
      <span className="text-[10px] text-slate-500 font-sans font-normal">Score:</span>
      <span>{score}%</span>
    </span>
  );
};

export const SelectionBadge: React.FC<{ status: SelectionStatus; rank?: number }> = ({ status, rank }) => {
  switch (status) {
    case 'selected':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
          title="Selected for interview in this round"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-600" aria-hidden="true" />
          <span>Selected {rank ? `(#${rank})` : ''}</span>
        </span>
      );
    case 'waitlisted':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300/80 shadow-2xs"
          title="Waitlisted: Meets mandatory criteria, capacity full for this round"
        >
          <Hourglass className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          <span>Waitlisted</span>
        </span>
      );
    case 'not_selected_this_round':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium text-slate-600 border border-dashed border-slate-300"
          title="Not selected for this round"
        >
          <MinusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Not selected</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-slate-500">
          —
        </span>
      );
  }
};

export const DecisionTrio: React.FC<DecisionTrioProps> = ({
  eligibility,
  matchScore,
  selection,
  onWhyClick,
  compact = false
}) => {
  return (
    <div className={`inline-flex items-center ${compact ? 'gap-1.5' : 'gap-2'} flex-wrap`}>
      <EligibilityBadge status={eligibility} compact={compact} />
      <MatchScoreBadge score={matchScore} />
      <SelectionBadge status={selection} />
      {onWhyClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onWhyClick();
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md font-medium transition-colors"
          title="View detailed eligibility & capacity breakdown"
          aria-label="Why? View breakdown"
        >
          <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
          <span>Why?</span>
        </button>
      )}
    </div>
  );
};
