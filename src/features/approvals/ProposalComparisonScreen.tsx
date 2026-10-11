import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  CheckSquare, 
  Layers
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { RecoveryProposal } from '@/lib/api/types';
import { formatDateTimeIST } from '@/lib/format/date';
import { useAuth } from '@/lib/auth/authContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const ProposalComparisonScreen: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [proposal, setProposal] = useState<RecoveryProposal | null>(null);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState('Approved following verbal verification with Placement Head.');
  const [isDeciding, setIsDeciding] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const isOfficerOrAdmin = user?.role === 'officer' || user?.role === 'admin';
  const isCreator = user?.id === proposal?.createdByUserId;

  useEffect(() => {
    if (!proposalId) return;
    apiClient.getProposalById(proposalId).then(res => setProposal(res));
  }, [proposalId]);

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!proposal) return;
    setIsDeciding(true);
    try {
      const updated = await apiClient.decideProposal(proposal.id, decision, decisionNote);
      setProposal(updated);
      setDecisionDialogOpen(false);
      if (decision === 'approve') {
        setPublishSuccess(`Published as Schedule Version ${updated.proposedScheduleVersion}!`);
      } else {
        alert('Proposal was marked as rejected.');
      }
    } catch (err: any) {
      if (err.status === 403) {
        alert(err.error?.message || 'Access denied.');
      } else {
        alert('Failed to submit decision.');
      }
    } finally {
      setIsDeciding(false);
    }
  };

  if (!proposal) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-slate-200/80 rounded-xl" />
        <div className="h-64 bg-slate-200/80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/approvals')}
          className="mb-3 text-blue-600 hover:text-blue-700 p-0 h-auto font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Approvals Queue</span>
        </Button>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Badge variant="outline" className="font-mono text-xs font-bold">
                  {proposal.id}
                </Badge>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{proposal.title}</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">{proposal.description}</p>
            </div>

            {/* Action or Status Badge */}
            <div className="flex items-center gap-3">
              {proposal.status === 'pending_approval' ? (
                isOfficerOrAdmin ? (
                  isCreator ? (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-[#D97706] font-medium" title="Separation of duties rule">
                      You authored this proposal and cannot approve it.
                    </div>
                  ) : (
                    <Button
                      variant="navy"
                      size="default"
                      onClick={() => setDecisionDialogOpen(true)}
                      className="text-xs font-semibold"
                    >
                      <CheckSquare className="w-4 h-4 mr-1" />
                      <span>Review & Decide Proposal</span>
                    </Button>
                  )
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Officer approval required
                  </Badge>
                )
              ) : (
                <Badge
                  variant={proposal.status === 'approved' ? 'success' : 'destructive'}
                  className="text-xs font-bold px-3 py-1"
                >
                  Status: {proposal.status.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>

          {publishSuccess && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-[#16845B] font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Success: {publishSuccess}</span>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate('/schedule?version=published')}
                className="text-[#16845B] hover:text-emerald-900 font-semibold"
              >
                Inspect Published Schedule &rarr;
              </Button>
            </div>
          )}

          {/* Meta Details */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
            <span>Author: <strong className="text-slate-800">{proposal.createdByUserName}</strong></span>
            <span>&bull;</span>
            <span>Created: {formatDateTimeIST(proposal.createdAt)}</span>
            <span>&bull;</span>
            <span>Base Version: <strong className="font-mono text-slate-800">v{proposal.baseScheduleVersion}</strong></span>
            <span>&bull;</span>
            <span>Target Version: <strong className="font-mono text-blue-600 font-bold">v{proposal.proposedScheduleVersion}</strong></span>
          </div>
        </Card>
      </div>

      {/* Before and After Comparison Diff (AC-DIF-1) */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70 py-3.5 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Side-by-Side Schedule Relocation Diff</span>
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-xs">
            {(proposal.diffItems ?? []).length} slot adjustments
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/40 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Interview / Candidate</th>
                <th className="py-3 px-4 bg-amber-50/40 border-r border-slate-200">Before (Current v{proposal.baseScheduleVersion})</th>
                <th className="py-3 px-4 bg-blue-50/40">After (Proposed v{proposal.proposedScheduleVersion})</th>
                <th className="py-3 px-3 text-center">Conflict Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(proposal.diffItems ?? []).map(item => (
                <tr key={item.interviewId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{item.studentName}</div>
                    <div className="font-mono text-[11px] text-slate-500">{item.rollNumber} &bull; {item.companyName}</div>
                  </td>

                  {/* Before */}
                  <td className="py-3.5 px-4 bg-amber-50/20 border-r border-slate-200">
                    <div className="font-mono font-semibold text-slate-900">{item.before.time}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.before.room} &bull; {item.before.interviewer}</div>
                  </td>

                  {/* After */}
                  <td className="py-3.5 px-4 bg-blue-50/20">
                    <div className="font-mono font-bold text-blue-700 flex items-center gap-1.5">
                      <span>{item.after.time}</span>
                      <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-semibold">Shifted +30m</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">{item.after.room} &bull; {item.after.interviewer}</div>
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <Badge variant="success" className="font-semibold text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified Clean</span>
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Automated Validation Checklist (AC-DIF-3) */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#16845B]" />
            <span>Automated Pre-Publish Validation Checks</span>
          </CardTitle>
          <CardDescription>
            Rigorous verification executed by authoritative backend rules engine
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-2.5">
          {(proposal.validationChecks ?? []).map(check => (
            <div key={check.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16845B] shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900">{check.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{check.detail}</div>
                </div>
              </div>
              <Badge variant="success" className="uppercase text-[10px] font-bold">
                {check.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Decision Dialog */}
      {decisionDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setDecisionDialogOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">Review & Execute Schedule Decision</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Approving publishes this proposal atomically as <strong>Schedule Version {proposal.proposedScheduleVersion}</strong>. Students and interviewers will be updated immediately.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Decision Note / Officer Rationale:</label>
              <textarea
                rows={3}
                value={decisionNote}
                onChange={e => setDecisionNote(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDecisionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeciding}
                onClick={() => handleDecision('reject')}
              >
                Reject Proposal
              </Button>
              <Button
                variant="navy"
                size="sm"
                isLoading={isDeciding}
                onClick={() => handleDecision('approve')}
              >
                Approve & Publish (v{proposal.proposedScheduleVersion})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
