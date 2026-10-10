import React, { useEffect } from 'react';
import { X, CheckCircle2, XCircle, AlertCircle, Info, Sparkles, AlertTriangle } from 'lucide-react';
import type { ApplicationExplanation } from '@/lib/api/types';
import { formatDateTimeIST } from '@/lib/format/date';
import { Badge } from '@/components/ui/badge';

interface WhyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  rollNumber: string;
  companyName: string;
  explanation: ApplicationExplanation | null;
}

export const WhyDrawer: React.FC<WhyDrawerProps> = ({
  isOpen,
  onClose,
  studentName,
  rollNumber,
  companyName,
  explanation
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="why-drawer-title">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-[#E2E8F0]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#64748B]">Evaluation Breakdown</span>
              <h2 id="why-drawer-title" className="text-lg font-bold text-[#142C4E]">
                {studentName} <span className="font-mono text-sm font-normal text-[#64748B]">({rollNumber})</span>
              </h2>
              <p className="text-xs text-[#2563EB] mt-0.5 font-medium">{companyName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-slate-100 transition-colors"
              aria-label="Close explanation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {!explanation ? (
              <div className="py-12 text-center text-[#64748B]">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No explanation records found for this candidate.</p>
              </div>
            ) : (
              <>
                {explanation.stale && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-[#D97706]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Criteria updated since evaluation:</span> The company requirements were modified after this evaluation was generated.
                    </div>
                  </div>
                )}

                {/* Section 1: Mandatory Criteria */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-sm font-bold text-[#142C4E] flex items-center gap-1.5">
                      <span>1. Mandatory Criteria</span>
                      <span className="text-xs font-normal text-[#64748B]">(Must pass to be eligible)</span>
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    {explanation.mandatoryResults.map((item, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[#142C4E]">{item.name}</div>
                          <div className="text-[#64748B] mt-0.5">
                            Required: <span className="font-mono text-[#172033] font-semibold">{item.requiredValue}</span> &bull; Actual: <span className="font-mono text-[#172033] font-semibold">{item.actualValue}</span>
                          </div>
                          {!item.isVerified && (
                            <span className="inline-block mt-1 text-[11px] text-[#D97706] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                              Pending registrar verification
                            </span>
                          )}
                        </div>

                        <div>
                          {item.result === 'pass' && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Pass</span>
                            </Badge>
                          )}
                          {item.result === 'fail' && (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Fail</span>
                            </Badge>
                          )}
                          {item.result === 'pending' && (
                            <Badge variant="warning" className="gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 2: Preferred Criteria */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-sm font-bold text-[#142C4E] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#2563EB]" />
                      <span>2. Preferred Skills & Match Score</span>
                    </h3>
                  </div>
                  <p className="text-xs text-[#64748B] mb-2.5 italic">
                    Affects match score ranking only. Preferred criteria never exclude a student from being eligible.
                  </p>

                  <div className="space-y-2">
                    {explanation.preferredResults.map((pref, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-between text-xs shadow-2xs"
                      >
                        <div>
                          <div className="font-medium text-[#142C4E]">{pref.name}</div>
                          <div className="text-[#64748B] mt-0.5">
                            Weight: {pref.weight} pts &bull; {pref.matched ? 'Skill matched' : 'Not listed'}
                          </div>
                        </div>

                        <div className="font-mono font-semibold text-right">
                          <span className={pref.matched ? 'text-[#16845B]' : 'text-[#64748B]'}>
                            +{pref.pointsContributed} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5 p-3 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs font-semibold text-[#142C4E]">
                    <span>Total Computed Match Score:</span>
                    <span className="font-mono text-sm text-[#2563EB] font-bold">{explanation.totalScore ?? 'N/A'}%</span>
                  </div>
                </div>

                {/* Section 3: Selection & Capacity Logic */}
                <div>
                  <h3 className="text-sm font-bold text-[#142C4E] mb-2.5">3. Capacity & Selection Rationale</h3>
                  <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2 text-xs">
                    <div className="flex justify-between text-[#64748B]">
                      <span>Round Capacity:</span>
                      <span className="font-semibold text-[#142C4E] font-mono">{explanation.capacityAllocated} slots</span>
                    </div>
                    <div className="flex justify-between text-[#64748B]">
                      <span>Rank among eligible candidates:</span>
                      <span className="font-semibold text-[#142C4E] font-mono">Rank #{explanation.rankInRound}</span>
                    </div>
                    <div className="pt-2 border-t border-[#E2E8F0] text-[#142C4E]">
                      <span className="font-medium text-[#64748B] block mb-1">Decision Rationale:</span>
                      <p className="bg-white p-2.5 rounded border border-[#E2E8F0] font-medium leading-relaxed text-[#172033]">
                        {explanation.selectionReason}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {explanation && (
            <div className="px-6 py-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC] text-[11px] text-[#64748B] flex justify-between items-center">
              <span>Evaluated against criteria v{explanation.criteriaVersion}</span>
              <span className="font-mono">{formatDateTimeIST(explanation.evaluatedAt)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
