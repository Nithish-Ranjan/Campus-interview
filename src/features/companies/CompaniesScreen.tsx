import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Lock, 
  Sparkles, 
  Save, 
  Trash2, 
  CheckCircle2, 
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { Company, Criterion } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/authContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const CompaniesScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('comp-asteria');
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  
  // Criteria editor form state
  const [mandatoryList, setMandatoryList] = useState<Criterion[]>([]);
  const [preferredList, setPreferredList] = useState<Criterion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [impactPreview, setImpactPreview] = useState<any | null>(null);
  const [concurrencyError, setConcurrencyError] = useState<string | null>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'coordinator';

  useEffect(() => {
    apiClient.getCompanies().then(res => {
      setCompanies(res);
      const activeId = searchParams.get('id') || 'comp-asteria';
      setSelectedCompanyId(activeId);
      const activeComp = res.find(c => c.id === activeId) || res[0];
      if (activeComp) {
        setCurrentCompany(activeComp);
        setMandatoryList(JSON.parse(JSON.stringify(activeComp.mandatoryCriteria)));
        setPreferredList(JSON.parse(JSON.stringify(activeComp.preferredCriteria)));
        setHasUnsavedChanges(false);
      }
    });
  }, [searchParams]);

  const handleSelectCompany = (comp: Company) => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved criteria edits. Discard and switch company?')) {
        return;
      }
    }
    setSelectedCompanyId(comp.id);
    setCurrentCompany(comp);
    setMandatoryList(JSON.parse(JSON.stringify(comp.mandatoryCriteria)));
    setPreferredList(JSON.parse(JSON.stringify(comp.preferredCriteria)));
    setHasUnsavedChanges(false);
    setSaveSuccess(false);
    setConcurrencyError(null);
    setImpactPreview(null);
  };

  const handleAddMandatory = () => {
    const newCrit: Criterion = {
      id: `c-man-${Date.now()}`,
      field: 'cgpa',
      operator: 'gte',
      value: 7.0,
      type: 'mandatory',
      label: 'Minimum CGPA 7.0'
    };
    setMandatoryList([...mandatoryList, newCrit]);
    setHasUnsavedChanges(true);
  };

  const handleAddPreferred = () => {
    const newPref: Criterion = {
      id: `c-pref-${Date.now()}`,
      field: 'skills',
      operator: 'in',
      value: 'Python',
      type: 'preferred',
      weight: 30,
      label: 'Python Proficiency'
    };
    setPreferredList([...preferredList, newPref]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveMandatory = (idx: number) => {
    const next = [...mandatoryList];
    next.splice(idx, 1);
    setMandatoryList(next);
    setHasUnsavedChanges(true);
  };

  const handleRemovePreferred = (idx: number) => {
    const next = [...preferredList];
    next.splice(idx, 1);
    setPreferredList(next);
    setHasUnsavedChanges(true);
  };

  const handlePreviewImpact = () => {
    setImpactPreview({
      totalApplicants: 40,
      eligibleBefore: 40,
      eligibleAfter: 38,
      ineligibleAfter: 2,
      note: 'Simulated Impact: 2 candidates would drop below minimum thresholds with these criteria parameters.'
    });
  };

  const handleSaveCriteria = async () => {
    if (!currentCompany) return;
    setIsSaving(true);
    setConcurrencyError(null);
    try {
      const updated = await apiClient.updateCriteria(
        currentCompany.id,
        mandatoryList,
        preferredList,
        currentCompany.criteriaVersion
      );
      setCurrentCompany(updated);
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      if (err.status === 409) {
        setConcurrencyError('Criteria version conflict (409): Another coordinator has committed updates. Reload latest to review changes.');
      } else {
        alert('Failed to save criteria.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Top Header Card */}
      <Card className="border-[#E2E8F0] shadow-xs">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#2563EB]" />
              <h1 className="text-lg font-bold text-[#142C4E]">Company Management & Criteria Editor</h1>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Configure mandatory eligibility gates and preferred matching score weights with version tracking.
            </p>
          </div>
          {canEdit && (
            <Button
              variant="default"
              size="sm"
              onClick={() => alert('Add Company dialog ready for integration.')}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Company</span>
            </Button>
          )}
        </div>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Company List (320px) */}
        <aside className="w-full lg:w-80 bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-3 space-y-2 shrink-0">
          <div className="px-3 py-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
            <span>Registered Employers</span>
            <Badge variant="outline" className="font-mono text-[10px]">{companies.length}</Badge>
          </div>

          <div className="space-y-1.5">
            {companies.map(c => {
              const isSelected = selectedCompanyId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCompany(c)}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-[#2563EB]/5 border-[#2563EB] text-[#2563EB] font-medium shadow-2xs'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white text-[#172033]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#142C4E]">{c.name}</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] text-[#172033]">
                      {c.slots} slots
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] truncate">{c.roleTitle}</div>
                  <div className="text-[10px] text-[#64748B] flex items-center gap-2 mt-1">
                    <span className="font-mono">Criteria v{c.criteriaVersion}</span>
                    <span>&bull;</span>
                    <span className="text-[#16845B] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16845B]"></span>
                      Active Round
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Column: Company Detail & Criteria Editor */}
        <div className="flex-1 w-full bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-6 space-y-6">
          {currentCompany && (
            <>
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-[#142C4E]">{currentCompany.name}</h2>
                    <Badge variant="outline" className="font-mono text-xs">
                      Criteria v{currentCompany.criteriaVersion}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1 font-medium">
                    {currentCompany.roleTitle} &bull; {currentCompany.roundName}
                  </p>
                </div>

                {/* Quick Navigation Links */}
                <div className="flex items-center gap-2 text-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/eligibility?company=${currentCompany.id}`)}
                    className="text-[#2563EB] gap-1"
                  >
                    <span>View Applicants</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/capacity?company=${currentCompany.id}`)}
                    className="text-[#2563EB] gap-1"
                  >
                    <span>Capacity ({currentCompany.slots})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {concurrencyError && (
                <div className="p-4 bg-red-50 border-l-4 border-[#DC2626] rounded-r-lg text-xs text-[#DC2626] flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{concurrencyError}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleSelectCompany(currentCompany)}
                  >
                    Reload Latest
                  </Button>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-[#16845B] font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Criteria version saved successfully! Applicant eligibility dynamically re-evaluated.</span>
                </div>
              )}

              {/* Group 1: Mandatory Criteria */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2E6EC] pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-red-50 text-[#DC2626]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#142C4E]">1. Mandatory Criteria (Hard Gates)</h3>
                      <p className="text-[11px] text-[#DC2626] font-medium">
                        Must pass all rules to be eligible. Failing any criterion excludes the candidate.
                      </p>
                    </div>
                  </div>

                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddMandatory}
                      className="text-xs font-semibold"
                    >
                      + Add Rule
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {mandatoryList.map((crit, idx) => (
                    <div key={crit.id || idx} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <Lock className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                        <div>
                          <div className="font-bold text-[#142C4E]">{crit.label}</div>
                          <div className="text-[11px] text-[#64748B] mt-0.5">
                            Field: <strong className="text-[#172033] font-mono">{crit.field}</strong> &bull; Operator: <span className="font-mono">{crit.operator}</span> &bull; Required: <strong className="font-mono text-[#172033]">{String(crit.value)}</strong>
                          </div>
                        </div>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMandatory(idx)}
                          className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 rounded transition-colors"
                          title="Remove mandatory criterion"
                          aria-label="Remove mandatory criterion"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 2: Preferred Criteria */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between border-b border-[#E2E6EC] pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563EB]">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#142C4E]">2. Preferred Criteria & Weights</h3>
                      <p className="text-[11px] text-[#2563EB] font-medium">
                        Improves match score ranking only. Preferred criteria NEVER exclude a student.
                      </p>
                    </div>
                  </div>

                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddPreferred}
                      className="text-xs font-semibold"
                    >
                      + Add Preferred Skill
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {preferredList.map((pref, idx) => (
                    <div key={pref.id || idx} className="p-3 bg-white rounded-lg border border-[#E2E8F0] flex items-center justify-between text-xs shadow-2xs">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                        <div>
                          <div className="font-bold text-[#142C4E]">{pref.label}</div>
                          <div className="text-[11px] text-[#64748B] mt-0.5">
                            Target: <strong className="text-[#172033]">{String(pref.value)}</strong> &bull; Score Contribution: <strong className="font-mono text-[#2563EB]">+{pref.weight} points</strong>
                          </div>
                        </div>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemovePreferred(idx)}
                          className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 rounded transition-colors"
                          title="Remove preferred criterion"
                          aria-label="Remove preferred criterion"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Preview Box */}
              {impactPreview && (
                <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-200 text-xs space-y-2">
                  <div className="font-bold text-[#142C4E] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#0EA5E9]" />
                      Impact Preview Simulation
                    </span>
                    <Badge variant="info" className="font-mono text-[10px]">Simulated Sandbox</Badge>
                  </div>
                  <p className="text-[#172033]">{impactPreview.note}</p>
                  <div className="flex gap-4 font-mono text-[11px]">
                    <span>Eligible: <strong>{impactPreview.eligibleAfter} / {impactPreview.totalApplicants}</strong></span>
                    <span>Ineligible: <strong className="text-[#DC2626]">{impactPreview.ineligibleAfter}</strong></span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {canEdit && (
                <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviewImpact}
                    >
                      Preview Impact
                    </Button>
                    {hasUnsavedChanges && (
                      <span className="text-xs text-[#D97706] font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Unsaved criteria modifications
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="default"
                      size="sm"
                      disabled={isSaving || !hasUnsavedChanges}
                      onClick={handleSaveCriteria}
                      isLoading={isSaving}
                      className="gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save & Re-evaluate Criteria</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
