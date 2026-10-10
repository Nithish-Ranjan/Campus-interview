import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, 
  ShieldX, 
  ShieldAlert, 
  Building2, 
  RefreshCw, 
  CheckCircle2, 
  HelpCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { Company, StudentApplication } from '@/lib/api/types';
import { DecisionTrio, SelectionBadge } from '@/components/domain/DecisionTrio';
import { WhyDrawer } from '@/components/domain/WhyDrawer';
import { useAuth } from '@/lib/auth/authContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const EligibilityScreen: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const companyId = searchParams.get('company') || 'comp-asteria';
  const statusFilter = searchParams.get('status') || 'all';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [activeExplanation, setActiveExplanation] = useState<any | null>(null);
  const [whyDrawerOpen, setWhyDrawerOpen] = useState(false);
  const [selectedStudentForDrawer, setSelectedStudentForDrawer] = useState<{ name: string; roll: string } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const canEvaluate = user?.role === 'admin' || user?.role === 'coordinator';

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      apiClient.getCompanies(),
      apiClient.getEligibility(companyId, statusFilter)
    ]).then(([comps, apps]) => {
      setCompanies(comps);
      setApplications(apps);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [companyId, statusFilter]);

  // Compute segmented tab totals across all applicants for this company
  const [allCompanyApps, setAllCompanyApps] = useState<StudentApplication[]>([]);
  useEffect(() => {
    apiClient.getEligibility(companyId, 'all').then(res => setAllCompanyApps(res));
  }, [companyId]);

  const countAll = allCompanyApps.length;
  const countEligible = allCompanyApps.filter(a => a.eligibility === 'eligible').length;
  const countIneligible = allCompanyApps.filter(a => a.eligibility === 'ineligible').length;
  const countPending = allCompanyApps.filter(a => a.eligibility === 'pending_verification').length;

  const handleCompanyChange = (cId: string) => {
    setSearchParams({ company: cId, status: statusFilter });
  };

  const handleStatusChange = (st: string) => {
    setSearchParams({ company: companyId, status: st });
  };

  const handleOpenWhy = async (app: StudentApplication) => {
    const exp = await apiClient.getExplanation(app.id);
    setSelectedStudentForDrawer({ name: app.student.name, roll: app.student.rollNumber });
    setActiveExplanation(exp);
    setWhyDrawerOpen(true);
  };

  const handleReevaluate = async () => {
    setIsEvaluating(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      const apps = await apiClient.getEligibility(companyId, statusFilter);
      setApplications(apps);
      alert('Eligibility rules re-evaluated against latest student database.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const currentCompany = companies.find(c => c.id === companyId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <label htmlFor="company-select" className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>Target Company:</span>
          </label>
          <select
            id="company-select"
            value={companyId}
            onChange={e => handleCompanyChange(e.target.value)}
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.slots} slots)</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {canEvaluate && (
            <Button
              variant="navy"
              size="sm"
              isLoading={isEvaluating}
              onClick={handleReevaluate}
              className="text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-evaluate Eligibility</span>
            </Button>
          )}
        </div>
      </div>

      {/* Segmented Control Bar (AC-ELG-1: counts sum to total) */}
      <Card className="p-2 flex gap-2 flex-wrap text-xs font-semibold">
        <button
          type="button"
          onClick={() => handleStatusChange('all')}
          className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>All Applicants</span>
          <Badge variant="outline" className="font-mono text-[10px] py-0 bg-white">
            {countAll}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange('eligible')}
          className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            statusFilter === 'eligible'
              ? 'bg-emerald-50 text-[#16845B] font-bold shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#16845B]" />
          <span>Eligible</span>
          <Badge variant="success" className="font-mono text-[10px] py-0 bg-white">
            {countEligible}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange('ineligible')}
          className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            statusFilter === 'ineligible'
              ? 'bg-red-50 text-[#DC2626] font-bold shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldX className="w-3.5 h-3.5 text-[#DC2626]" />
          <span>Ineligible</span>
          <Badge variant="destructive" className="font-mono text-[10px] py-0 bg-white">
            {countIneligible}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange('pending_verification')}
          className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            statusFilter === 'pending_verification'
              ? 'bg-amber-50 text-[#D97706] font-bold shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-[#D97706]" />
          <span>Pending Verification</span>
          <Badge variant="warning" className="font-mono text-[10px] py-0 bg-white">
            {countPending}
          </Badge>
        </button>
      </Card>

      {/* Main Results Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-3">Mandatory Criteria Summary</th>
                <th className="py-3 px-3">Eligibility Gate</th>
                <th className="py-3 px-3">Match Score</th>
                <th className="py-3 px-4">Selection Status (Capacity 10)</th>
                <th className="py-3 px-3 text-right">Why?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No applicants found matching this eligibility filter.
                  </td>
                </tr>
              ) : (
                applications.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{app.student.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{app.student.rollNumber} &bull; {app.student.branch}</div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">
                          {app.criteriaSummary.passed} of {app.criteriaSummary.total} passed
                        </span>
                        {app.criteriaSummary.passed === app.criteriaSummary.total ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B]" />
                        ) : (
                          <ShieldX className="w-3.5 h-3.5 text-[#DC2626]" />
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <DecisionTrio
                        eligibility={app.eligibility}
                        matchScore={app.matchScore}
                        selection={app.selection}
                        onWhyClick={() => handleOpenWhy(app)}
                        compact
                      />
                    </td>

                    <td className="py-3.5 px-3 font-mono font-semibold text-slate-900 tabular-nums">
                      {app.matchScore !== null ? `${app.matchScore}%` : 'Not scored'}
                    </td>

                    <td className="py-3.5 px-4">
                      <SelectionBadge status={app.selection} />
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
                ))
              )}
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
        companyName={currentCompany?.name || ''}
        explanation={activeExplanation}
      />
    </div>
  );
};
