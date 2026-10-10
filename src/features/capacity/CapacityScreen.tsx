import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Hourglass, 
  CheckCircle2, 
  Play, 
  HelpCircle, 
  Sliders
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { Company } from '@/lib/api/types';
import { DecisionTrio } from '@/components/domain/DecisionTrio';
import { WhyDrawer } from '@/components/domain/WhyDrawer';
import { useAuth } from '@/lib/auth/authContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const CapacityScreen: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const companyId = searchParams.get('company') || 'comp-asteria';
  const activeTab = searchParams.get('tab') || 'selected';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [capacityData, setCapacityData] = useState<any | null>(null);
  const [slotInput, setSlotInput] = useState<number>(10);
  const [activeExplanation, setActiveExplanation] = useState<any | null>(null);
  const [whyDrawerOpen, setWhyDrawerOpen] = useState(false);
  const [selectedStudentForDrawer, setSelectedStudentForDrawer] = useState<{ name: string; roll: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'coordinator';

  useEffect(() => {
    Promise.all([
      apiClient.getCompanies(),
      apiClient.getCapacity(companyId)
    ]).then(([comps, cap]) => {
      setCompanies(comps);
      setCapacityData(cap);
      if (cap) setSlotInput(cap.slots);
    });
  }, [companyId]);

  const handleTabChange = (t: string) => {
    setSearchParams({ company: companyId, tab: t });
  };

  const handleRunAllocation = async (slotsToRun: number) => {
    setIsRunning(true);
    try {
      const res = await apiClient.runAllocation(companyId, slotsToRun);
      if (res) {
        setCapacityData(res);
        alert(`Capacity allocation successfully run! ${res.slots} candidates selected.`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleOpenWhy = async (app: any) => {
    const exp = await apiClient.getExplanation(app.id);
    setSelectedStudentForDrawer({ name: app.student.name, roll: app.student.rollNumber });
    setActiveExplanation(exp);
    setWhyDrawerOpen(true);
  };

  if (!capacityData) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-14 bg-slate-200/80 rounded-xl" />
        <div className="h-32 bg-slate-200/80 rounded-xl" />
        <div className="h-96 bg-slate-200/80 rounded-xl" />
      </div>
    );
  }

  const { company, totalEligible, slots, selectedCount, waitlistedCount, selected, waitlisted } = capacityData;

  return (
    <div className="space-y-6">
      {/* Top Header & Slot Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <label htmlFor="comp-select" className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>Target Company:</span>
          </label>
          <select
            id="comp-select"
            value={companyId}
            onChange={e => setSearchParams({ company: e.target.value, tab: activeTab })}
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Slot capacity manager */}
        {canEdit && (
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-600 font-semibold">Configured Slots:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={slotInput}
              onChange={e => setSlotInput(parseInt(e.target.value, 10) || 1)}
              className="w-16 px-2 py-0.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded text-center focus:ring-2 focus:ring-blue-500"
            />
            <Button
              variant="default"
              size="sm"
              isLoading={isRunning}
              onClick={() => handleRunAllocation(slotInput)}
              className="h-7 text-xs"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Run Allocation</span>
            </Button>
          </div>
        )}
      </div>

      {/* Capacity Utilization Meter (AC-CAP-2) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Capacity Allocation Breakdown
            </CardTitle>
            <CardDescription>
              <strong className="text-slate-800">{totalEligible} Eligible Candidates</strong> competing for <strong className="text-slate-800">{slots} Interview Slots</strong>
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-blue-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Selected: {selectedCount}</span>
            </span>
            <span className="text-slate-600 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>Waitlisted: {waitlistedCount}</span>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-8 bg-slate-100 rounded-lg overflow-hidden flex shadow-inner">
            <div 
              className="h-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold px-2 truncate overflow-hidden whitespace-nowrap transition-all duration-300"
              style={{ width: `${Math.max((selectedCount / totalEligible) * 100, 2)}%` }}
              title={`${selectedCount} Selected Candidates`}
            >
              {selectedCount > 1 ? `${selectedCount} Selected (Slots Filled)` : `${selectedCount} Selected`}
            </div>
            <div 
              className="h-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold px-2 border-l border-white truncate overflow-hidden whitespace-nowrap transition-all duration-300"
              style={{ width: `${((waitlistedCount / totalEligible) * 100)}%` }}
              title={`${waitlistedCount} Waitlisted Candidates`}
            >
              {waitlistedCount} Eligible, Waitlisted
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs & Candidates Table */}
      <Card className="overflow-hidden">
        {/* Custom Segmented Tabs */}
        <div className="border-b border-slate-200 px-4 flex gap-4 text-xs font-semibold bg-slate-50/70">
          <button
            type="button"
            onClick={() => handleTabChange('selected')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'selected'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>Selected for Interview ({selectedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('waitlisted')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'waitlisted'
                ? 'border-slate-700 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Hourglass className="w-4 h-4 text-slate-500" />
            <span>Waitlisted Candidates ({waitlistedCount})</span>
          </button>
        </div>

        {/* Mandatory Waitlist Notice */}
        {activeTab === 'waitlisted' && (
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-start gap-3 text-xs text-slate-700">
            <Hourglass className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900">Official Waitlist Rationale:</div>
              <p className="mt-0.5 leading-relaxed text-slate-600">
                These students meet every mandatory criterion. They were not given a slot because this round has {slots} slots.
                They are ordered by preferred-skills match score. No waitlisted student is ineligible.
              </p>
            </div>
          </div>
        )}

        {/* Candidates Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-16">Position</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-3">Match Score</th>
                <th className="py-3 px-4">Evaluation (Decision Trio)</th>
                <th className="py-3 px-4">Backend Capacity Rationale</th>
                <th className="py-3 px-3 text-right">Why?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(activeTab === 'selected' ? selected : waitlisted).map((app: any, idx: number) => (
                <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                    {activeTab === 'selected' ? `#${idx + 1}` : `W-#${idx + 1}`}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{app.student.name}</div>
                    <div className="font-mono text-[11px] text-slate-500">{app.student.rollNumber} &bull; {app.student.branch}</div>
                  </td>

                  <td className="py-3.5 px-3 font-mono font-semibold text-slate-900 tabular-nums">
                    {app.matchScore}%
                  </td>

                  <td className="py-3.5 px-4">
                    <DecisionTrio
                      eligibility={app.eligibility}
                      matchScore={app.matchScore}
                      selection={app.selection}
                      onWhyClick={() => handleOpenWhy(app)}
                      compact
                    />
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-slate-600 font-normal leading-relaxed">
                      {app.selectionReason}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenWhy(app)}
                      className="h-7 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 border-blue-200/80"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Why?</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Why Explanation Drawer */}
      <WhyDrawer
        isOpen={whyDrawerOpen}
        onClose={() => setWhyDrawerOpen(false)}
        studentName={selectedStudentForDrawer?.name || ''}
        rollNumber={selectedStudentForDrawer?.roll || ''}
        companyName={company.name}
        explanation={activeExplanation}
      />
    </div>
  );
};
