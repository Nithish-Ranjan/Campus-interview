import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Play
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { DisruptionSimulation, RecoveryAlternative } from '@/lib/api/types';
import { SimulationBanner } from '@/components/domain/SimulationBanner';
import { useAuth } from '@/lib/auth/authContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const RecoveryScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const prefillInterviewId = searchParams.get('interviewId') || 'int-ast-1';

  const [disruptionType, setDisruptionType] = useState('interview_delay');
  const [targetId, setTargetId] = useState(prefillInterviewId);
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [isRunning, setIsRunning] = useState(false);
  const [simulation, setSimulation] = useState<DisruptionSimulation | null>(null);
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string>('alt-valid-1');
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposalNote, setProposalNote] = useState('Mitigates Room A delay by shifting downstream slots by 30 mins.');
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);

  const canCreateProposal = user?.role === 'admin' || user?.role === 'coordinator';

  // Run initial default simulation on mount for demo script
  useEffect(() => {
    setIsRunning(true);
    apiClient.runSimulation('interview_delay', 'int-ast-1', 30)
      .then(res => {
        setSimulation(res);
        if (res?.alternatives?.[0]) setSelectedAlternativeId(res.alternatives[0].id);
      })
      .finally(() => setIsRunning(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount with default scenario

  const handleRunSimulation = async () => {
    setIsRunning(true);
    try {
      const res = await apiClient.runSimulation(disruptionType, targetId, delayMinutes);
      setSimulation(res);
      if (res.alternatives[0]) {
        setSelectedAlternativeId(res.alternatives[0].id);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleCreateProposal = async () => {
    if (!simulation || !selectedAlternativeId) return;
    setIsCreatingProposal(true);
    try {
      const prop = await apiClient.createProposal(simulation, selectedAlternativeId, proposalNote);
      setProposalDialogOpen(false);
      navigate(`/approvals/${prop.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to generate proposal.');
    } finally {
      setIsCreatingProposal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Violet Simulation Banner (Section 8.9) */}
      <SimulationBanner version={1} />

      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Recovery & Disruption Sandbox</h1>
            <Badge variant="purple" className="font-mono text-xs">
              Sandboxed Modeling
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Model delay impacts & generate formal recovery proposals without touching published schedule</p>
        </div>
      </div>

      {/* Three Column Layout: Disruption Form, Impact Centre, Recovery Alternatives */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (4 cols): Disruption Form */}
        <Card className="lg:col-span-4">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-purple-600" />
              <span>Define Disruption Scenario</span>
            </CardTitle>
            <CardDescription>
              Parameters are evaluated safely in-memory
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-900 mb-1">Disruption Type:</label>
              <select
                value={disruptionType}
                onChange={e => setDisruptionType(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-purple-500"
              >
                <option value="interview_delay">Interview Delay (Running Late)</option>
                <option value="interviewer_unavailable">Interviewer Unavailable</option>
                <option value="room_unavailable">Room Unavailable / Equipment Failure</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-900 mb-1">Target Interview / Panel:</label>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-purple-500"
              >
                <option value="int-ast-1">Room A: Aarav Sharma (Asteria Systems - 09:30 AM)</option>
                <option value="int-ast-2">Room A: Priya Patel (Asteria Systems - 10:00 AM)</option>
                <option value="int-hrb-1">Room B: Karthik Nair (Harbor Analytics - 09:30 AM)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-900 mb-1">Delay Incurred (minutes):</label>
              <select
                value={delayMinutes}
                onChange={e => setDelayMinutes(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes (Standard 5-min demo disruption)</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <Button
              variant="default"
              size="default"
              isLoading={isRunning}
              onClick={handleRunSimulation}
              className="w-full bg-purple-700 hover:bg-purple-800 text-xs font-semibold mt-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Calculating Ripple Impact...' : 'Simulate Disruption'}</span>
            </Button>
          </CardContent>
        </Card>

        {/* Centre Column (4 cols): Impact Assessment */}
        <Card className="lg:col-span-4">
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Downstream Impact Assessment
            </CardTitle>
            <Badge variant="destructive" className="font-mono">
              {simulation?.impactSummary.interviewsAffected ?? 2} Affected
            </Badge>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* Metric counters */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Interviews Impacted</span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{simulation?.impactSummary.interviewsAffected}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Students Delayed</span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{simulation?.impactSummary.studentsAffected}</span>
              </div>
            </div>

            {/* Affected list */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Ripple Effect on Schedule:
              </div>
              {simulation?.affectedInterviews.map((item, idx) => (
                <div key={idx} className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/80 text-xs space-y-1">
                  <div className="font-semibold text-[#D97706] flex justify-between">
                    <span>{item.studentName}</span>
                    <span>{item.companyName}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex justify-between">
                    <span>Scheduled: {item.beforeTime}</span>
                    <span className="font-bold text-[#D97706]">Est: {item.estimatedAfterTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Column (4 cols): Generated Recovery Alternatives (AC-REC-3) */}
        <Card className="lg:col-span-4">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold">
              Recovery Alternatives
            </CardTitle>
            <CardDescription>
              Automated multi-constraint mitigation candidates
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-3">
            {simulation?.alternatives.map((alt: RecoveryAlternative) => {
              const isSelected = selectedAlternativeId === alt.id;

              return (
                <div
                  key={alt.id}
                  onClick={() => {
                    if (alt.isValid) setSelectedAlternativeId(alt.id);
                  }}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                    !alt.isValid
                      ? 'border-red-200 bg-red-50/50 opacity-90 cursor-not-allowed'
                      : isSelected
                        ? 'border-blue-500 bg-blue-50/70 shadow-xs cursor-pointer ring-1 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-slate-900">{alt.title}</div>
                    {alt.isValid ? (
                      <Badge variant="success" className="text-[10px] shrink-0 font-bold py-0">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Valid</span>
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] shrink-0 font-bold py-0">
                        <XCircle className="w-3 h-3" />
                        <span>Invalid</span>
                      </Badge>
                    )}
                  </div>

                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {alt.description}
                  </p>

                  {/* Blockers list for invalid alternatives (AC-REC-3) */}
                  {alt.blockers && alt.blockers.length > 0 && (
                    <div className="p-2.5 bg-red-50 rounded-lg border border-red-200 text-[11px] text-[#DC2626] space-y-1">
                      <span className="font-bold block">Hard Blocker:</span>
                      {alt.blockers.map((b, bi) => (
                        <p key={bi}>&bull; {b}</p>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 font-medium pt-1 border-t border-slate-200">
                    {alt.changesSummary}
                  </div>
                </div>
              );
            })}

            {/* Create Proposal CTA */}
            {canCreateProposal && (
              <div className="pt-2">
                <Button
                  variant="default"
                  size="default"
                  onClick={() => setProposalDialogOpen(true)}
                  className="w-full text-xs font-semibold"
                >
                  <span>Create Recovery Proposal</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Proposal Dialog */}
      {proposalDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setProposalDialogOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">Generate Recovery Proposal</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This creates a formal schedule change proposal based on Alternative 1. A Placement Officer must approve it before publication.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Proposal Note / Coordinator Rationale:</label>
              <textarea
                rows={3}
                value={proposalNote}
                onChange={e => setProposalNote(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProposalDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                isLoading={isCreatingProposal}
                onClick={handleCreateProposal}
              >
                Submit to Approvals Queue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
