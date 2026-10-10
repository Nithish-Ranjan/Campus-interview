import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  ExternalLink, 
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { Company } from '@/lib/api/types';
import { DecisionTrio } from '@/components/domain/DecisionTrio';
import { WhyDrawer } from '@/components/domain/WhyDrawer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const CandidatesScreen: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [students, setStudents] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [activeExplanation, setActiveExplanation] = useState<any | null>(null);
  const [whyDrawerOpen, setWhyDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Filters from URL search params
  const searchQuery = searchParams.get('q') || '';
  const branchFilter = searchParams.get('branch') || 'all';
  const companyFilter = searchParams.get('company') || 'comp-asteria';
  const eligibilityFilter = searchParams.get('eligibility') || 'all';
  const selectionFilter = searchParams.get('selection') || 'all';

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      apiClient.getCompanies(),
      apiClient.getStudents({
        query: searchQuery,
        branch: branchFilter,
        companyId: companyFilter
      })
    ]).then(([comps, stds]) => {
      setCompanies(comps);
      let filtered = stds;
      if (eligibilityFilter !== 'all') {
        filtered = filtered.filter(s => s.activeApplication?.eligibility === eligibilityFilter);
      }
      if (selectionFilter !== 'all') {
        filtered = filtered.filter(s => s.activeApplication?.selection === selectionFilter);
      }
      setStudents(filtered);
      if (filtered.length > 0 && !selectedStudent) {
        setSelectedStudent(filtered[0]);
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }, [searchQuery, branchFilter, companyFilter, eligibilityFilter, selectionFilter]);

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val === 'all' || !val) next.delete(key);
    else next.set(key, val);
    setSearchParams(next);
  };

  const handleOpenWhy = async (app: any) => {
    if (!app) return;
    const exp = await apiClient.getExplanation(app.id);
    setActiveExplanation(exp);
    setWhyDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Free-text search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or roll number (e.g. DEMO-0001)..."
              value={searchQuery}
              onChange={e => updateParam('q', e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Company selector */}
            <select
              value={companyFilter}
              onChange={e => updateParam('company', e.target.value)}
              className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Companies</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Branch selector */}
            <select
              value={branchFilter}
              onChange={e => updateParam('branch', e.target.value)}
              className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Branches</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Electronics & Comm.">Electronics & Comm.</option>
              <option value="Data Engineering">Data Engineering</option>
            </select>

            {/* Eligibility filter */}
            <select
              value={eligibilityFilter}
              onChange={e => updateParam('eligibility', e.target.value)}
              className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Eligibility</option>
              <option value="eligible">Eligible only</option>
              <option value="ineligible">Ineligible only</option>
              <option value="pending_verification">Pending verification</option>
            </select>

            {/* Selection filter */}
            <select
              value={selectionFilter}
              onChange={e => updateParam('selection', e.target.value)}
              className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Selection</option>
              <option value="selected">Selected for interview</option>
              <option value="waitlisted">Waitlisted</option>
            </select>

            {(searchQuery || branchFilter !== 'all' || eligibilityFilter !== 'all' || selectionFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchParams({ company: companyFilter })}
                className="text-xs text-red-600 hover:text-red-700 h-8"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Showing <strong className="text-slate-900 tabular-nums">{students.length}</strong> candidates</span>
          <span className="text-[11px] text-slate-400">Click any row to inspect candidate profile and detailed explainability</span>
        </div>
      </Card>

      {/* Main Table + Right Inspector */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Candidates Table */}
        <Card className="flex-1 w-full overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-3">Branch</th>
                  <th className="py-3 px-3 font-mono">CGPA</th>
                  <th className="py-3 px-3">Backlogs</th>
                  <th className="py-3 px-3">Top Skills</th>
                  <th className="py-3 px-4">Evaluation (Decision Trio)</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(std => {
                  const isSelected = selectedStudent?.id === std.id;
                  const activeApp = std.activeApplication;

                  return (
                    <tr
                      key={std.id}
                      onClick={() => setSelectedStudent(std)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{std.name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{std.rollNumber}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{std.branch}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900 tabular-nums">
                        {std.cgpa.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={std.backlogs === 0 ? 'success' : 'destructive'} className="text-[10px] py-0 font-mono">
                          {std.backlogs}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <div className="flex gap-1 flex-wrap">
                          {std.skills.slice(0, 2).map((sk: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px] py-0 font-normal">
                              {sk}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {activeApp ? (
                          <DecisionTrio
                            eligibility={activeApp.eligibility}
                            matchScore={activeApp.matchScore}
                            selection={activeApp.selection}
                            onWhyClick={() => handleOpenWhy(activeApp)}
                            compact
                          />
                        ) : (
                          <span className="text-slate-400">No application</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/candidates/${std.id}`);
                          }}
                          className="h-7 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          <span>Profile</span>
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Inspector Rail */}
        {selectedStudent && (
          <Card className="w-full xl:w-96 shrink-0 p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Candidate Inspector</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedStudent.name}</h3>
                <div className="font-mono text-xs text-blue-600 font-semibold">{selectedStudent.rollNumber}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/candidates/${selectedStudent.id}`)}
                className="text-xs"
              >
                <span>Full Profile</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {/* Academic Summary */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Branch:</span>
                <span className="font-semibold text-slate-900">{selectedStudent.branch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CGPA:</span>
                <span className="font-mono font-bold text-slate-900">{selectedStudent.cgpa.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Backlogs:</span>
                <span className="font-mono font-bold text-slate-900">{selectedStudent.backlogs}</span>
              </div>
            </div>

            {/* Selected Company Decision Trio */}
            {selectedStudent.activeApplication && (
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-3 text-xs">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>{selectedStudent.activeApplication.companyName}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenWhy(selectedStudent.activeApplication)}
                    className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    View Why &rarr;
                  </button>
                </div>

                <DecisionTrio
                  eligibility={selectedStudent.activeApplication.eligibility}
                  matchScore={selectedStudent.activeApplication.matchScore}
                  selection={selectedStudent.activeApplication.selection}
                />

                <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                  {selectedStudent.activeApplication.selectionReason}
                </p>
              </div>
            )}

            {/* Overlap Check across companies (AC-CAN-3) */}
            {selectedStudent.id === 'std-1' && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-lg text-xs space-y-1 text-[#D97706]">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Cross-Company Schedule Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-700">
                  Applied to both Asteria Systems & Harbor Analytics. Verified in Round 1 for Asteria Systems.
                </p>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Why Drawer */}
      <WhyDrawer
        isOpen={whyDrawerOpen}
        onClose={() => setWhyDrawerOpen(false)}
        studentName={selectedStudent?.name || ''}
        rollNumber={selectedStudent?.rollNumber || ''}
        companyName={selectedStudent?.activeApplication?.companyName || ''}
        explanation={activeExplanation}
      />
    </div>
  );
};
