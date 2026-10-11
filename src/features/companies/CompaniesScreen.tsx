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
  AlertCircle,
  Pencil,
  X,
  Layers,
  Settings2
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

  // Add Company Modal State
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompRole, setNewCompRole] = useState('');
  const [newCompRound, setNewCompRound] = useState('Round 1 - Technical Interview');
  const [newCompSlots, setNewCompSlots] = useState<number>(10);
  const [newCompMandatory, setNewCompMandatory] = useState<Criterion[]>([
    { id: 'nc-man-1', field: 'cgpa', operator: 'gte', value: 7.0, type: 'mandatory', label: 'Minimum CGPA 7.0' },
    { id: 'nc-man-2', field: 'backlogs', operator: 'eq', value: 0, type: 'mandatory', label: 'Zero Active Backlogs' }
  ]);
  const [newCompPreferred, setNewCompPreferred] = useState<Criterion[]>([
    { id: 'nc-pref-1', field: 'skills', operator: 'in', value: 'Problem Solving', type: 'preferred', weight: 40, label: 'Data Structures & Problem Solving' }
  ]);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [addCompanyError, setAddCompanyError] = useState<string | null>(null);

  // Edit Criterion Modal State (for both active company and new company creation)
  const [editingCriterion, setEditingCriterion] = useState<{
    criterion: Criterion;
    index: number;
    listType: 'mandatory' | 'preferred';
    targetSource: 'currentCompany' | 'newCompany';
  } | null>(null);

  const [editLabel, setEditLabel] = useState('');
  const [editField, setEditField] = useState('cgpa');
  const [editOperator, setEditOperator] = useState('gte');
  const [editValue, setEditValue] = useState<string>('7.0');
  const [editWeight, setEditWeight] = useState<number>(30);

  const canEdit = user?.role === 'admin' || user?.role === 'coordinator';

  useEffect(() => {
    apiClient.getCompanies().then(res => {
      setCompanies(res);
      const activeId = searchParams.get('id') || 'comp-asteria';
      setSelectedCompanyId(activeId);
      const activeComp = res.find(c => c.id === activeId) || res[0];
      if (activeComp) {
        setCurrentCompany(activeComp);
        setMandatoryList(JSON.parse(JSON.stringify(activeComp.mandatoryCriteria || [])));
        setPreferredList(JSON.parse(JSON.stringify(activeComp.preferredCriteria || [])));
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
    setMandatoryList(JSON.parse(JSON.stringify(comp.mandatoryCriteria || [])));
    setPreferredList(JSON.parse(JSON.stringify(comp.preferredCriteria || [])));
    setHasUnsavedChanges(false);
    setConcurrencyError(null);
    setImpactPreview(null);
  };

  // Open Edit Modal for a criterion
  const handleOpenEditCriterion = (
    crit: Criterion, 
    index: number, 
    listType: 'mandatory' | 'preferred', 
    targetSource: 'currentCompany' | 'newCompany'
  ) => {
    setEditingCriterion({ criterion: crit, index, listType, targetSource });
    setEditLabel(crit.label || '');
    setEditField(crit.field || (listType === 'mandatory' ? 'cgpa' : 'skills'));
    setEditOperator(crit.operator || (listType === 'mandatory' ? 'gte' : 'in'));
    setEditValue(Array.isArray(crit.value) ? crit.value.join(', ') : crit.value !== undefined ? String(crit.value) : '');
    setEditWeight(crit.weight || 30);
  };

  // Save changes from Edit Modal
  const handleSaveEditedCriterion = () => {
    if (!editingCriterion) return;
    const { index, listType, targetSource } = editingCriterion;

    const parsedVal = (editField === 'cgpa' || editField === 'backlogs') 
      ? Number(editValue) 
      : editOperator === 'in' && editValue.includes(',')
        ? editValue.split(',').map(s => s.trim()).filter(Boolean)
        : editValue;

    const updatedCrit: Criterion = {
      ...editingCriterion.criterion,
      label: editLabel.trim() || `${editField} ${editOperator} ${parsedVal}`,
      field: editField,
      operator: editOperator as any,
      value: parsedVal,
      type: listType,
      weight: listType === 'preferred' ? Number(editWeight) || 30 : undefined
    };

    if (targetSource === 'currentCompany') {
      if (listType === 'mandatory') {
        const next = [...mandatoryList];
        next[index] = updatedCrit;
        setMandatoryList(next);
      } else {
        const next = [...preferredList];
        next[index] = updatedCrit;
        setPreferredList(next);
      }
      setHasUnsavedChanges(true);
    } else {
      if (listType === 'mandatory') {
        const next = [...newCompMandatory];
        next[index] = updatedCrit;
        setNewCompMandatory(next);
      } else {
        const next = [...newCompPreferred];
        next[index] = updatedCrit;
        setNewCompPreferred(next);
      }
    }

    setEditingCriterion(null);
  };

  // Add rule to current company
  const handleAddMandatory = () => {
    const newCrit: Criterion = {
      id: `c-man-${Date.now()}`,
      field: 'cgpa',
      operator: 'gte',
      value: 7.0,
      type: 'mandatory',
      label: 'Minimum CGPA 7.0'
    };
    const next = [...mandatoryList, newCrit];
    setMandatoryList(next);
    setHasUnsavedChanges(true);
    handleOpenEditCriterion(newCrit, next.length - 1, 'mandatory', 'currentCompany');
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
    const next = [...preferredList, newPref];
    setPreferredList(next);
    setHasUnsavedChanges(true);
    handleOpenEditCriterion(newPref, next.length - 1, 'preferred', 'currentCompany');
  };

  // Add rule in New Company dialog
  const handleAddNewCompMandatory = () => {
    const newCrit: Criterion = {
      id: `nc-man-${Date.now()}`,
      field: 'cgpa',
      operator: 'gte',
      value: 7.5,
      type: 'mandatory',
      label: 'Minimum CGPA 7.5'
    };
    const next = [...newCompMandatory, newCrit];
    setNewCompMandatory(next);
    handleOpenEditCriterion(newCrit, next.length - 1, 'mandatory', 'newCompany');
  };

  const handleAddNewCompPreferred = () => {
    const newPref: Criterion = {
      id: `nc-pref-${Date.now()}`,
      field: 'skills',
      operator: 'in',
      value: 'Full-Stack React',
      type: 'preferred',
      weight: 35,
      label: 'Full-Stack React Proficiency'
    };
    const next = [...newCompPreferred, newPref];
    setNewCompPreferred(next);
    handleOpenEditCriterion(newPref, next.length - 1, 'preferred', 'newCompany');
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

  const handleRemoveNewCompMandatory = (idx: number) => {
    const next = [...newCompMandatory];
    next.splice(idx, 1);
    setNewCompMandatory(next);
  };

  const handleRemoveNewCompPreferred = (idx: number) => {
    const next = [...newCompPreferred];
    next.splice(idx, 1);
    setNewCompPreferred(next);
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
      setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      if (err.status === 409 || err.code === 'stale_version') {
        setConcurrencyError('Criteria version conflict (409): Another coordinator has committed updates. Reload latest to review changes.');
      } else {
        alert('Failed to save criteria: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Submit new company
  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim() || !newCompRole.trim()) {
      setAddCompanyError('Please provide both Company Name and Role Title.');
      return;
    }

    try {
      setIsCreatingCompany(true);
      setAddCompanyError(null);

      const created = await apiClient.createCompany({
        name: newCompName.trim(),
        roleTitle: newCompRole.trim(),
        roundName: newCompRound.trim() || 'Round 1 - Technical Interview',
        slots: Number(newCompSlots) || 10,
        mandatoryCriteria: newCompMandatory,
        preferredCriteria: newCompPreferred
      });

      // Update companies list and select newly created company
      setCompanies(prev => [created, ...prev.filter(c => c.id !== created.id)]);
      setSelectedCompanyId(created.id);
      setCurrentCompany(created);
      setMandatoryList(JSON.parse(JSON.stringify(created.mandatoryCriteria || [])));
      setPreferredList(JSON.parse(JSON.stringify(created.preferredCriteria || [])));
      setHasUnsavedChanges(false);

      // Reset modal fields
      setNewCompName('');
      setNewCompRole('');
      setNewCompRound('Round 1 - Technical Interview');
      setNewCompSlots(10);
      setIsAddCompanyOpen(false);
    } catch (err: any) {
      setAddCompanyError(err.message || 'Failed to create new company');
    } finally {
      setIsCreatingCompany(false);
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
              onClick={() => setIsAddCompanyOpen(true)}
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

          <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">
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
                      className="text-xs font-semibold gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Rule</span>
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {mandatoryList.map((crit, idx) => (
                    <div key={crit.id || idx} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between text-xs hover:border-slate-300 transition-colors">
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
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCriterion(crit, idx, 'mandatory', 'currentCompany')}
                            className="p-1.5 text-[#2563EB] hover:bg-blue-50 rounded transition-colors"
                            title="Edit criterion"
                            aria-label="Edit criterion"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMandatory(idx)}
                            className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 rounded transition-colors"
                            title="Remove mandatory criterion"
                            aria-label="Remove mandatory criterion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {mandatoryList.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      No mandatory criteria defined. All candidates will pass the hard gate.
                    </div>
                  )}
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
                      className="text-xs font-semibold gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Preferred Skill</span>
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {preferredList.map((pref, idx) => (
                    <div key={pref.id || idx} className="p-3 bg-white rounded-lg border border-[#E2E8F0] flex items-center justify-between text-xs shadow-2xs hover:border-blue-200 transition-colors">
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
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCriterion(pref, idx, 'preferred', 'currentCompany')}
                            className="p-1.5 text-[#2563EB] hover:bg-blue-50 rounded transition-colors"
                            title="Edit preferred criterion"
                            aria-label="Edit preferred criterion"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePreferred(idx)}
                            className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 rounded transition-colors"
                            title="Remove preferred criterion"
                            aria-label="Remove preferred criterion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {preferredList.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      No preferred criteria configured. Ranking will rely on baseline scores.
                    </div>
                  )}
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

      {/* ========================================================================= */}
      {/* ADD COMPANY MODAL                                                         */}
      {/* ========================================================================= */}
      {isAddCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#142C4E]">Register New Employer</h3>
                  <p className="text-xs text-[#64748B]">Set role requirements, interview capacity, and screening criteria.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddCompanyOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompanySubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {addCompanyError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{addCompanyError}</span>
                </div>
              )}

              {/* Company Details Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#142C4E]">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stripe, Razorpay, Amazon"
                    value={newCompName}
                    onChange={e => setNewCompName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#142C4E]">Role Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Development Engineer"
                    value={newCompRole}
                    onChange={e => setNewCompRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#142C4E]">Round / Stage Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Round 1 - Technical Interview"
                    value={newCompRound}
                    onChange={e => setNewCompRound(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#142C4E]">Total Slots (Capacity)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newCompSlots}
                    onChange={e => setNewCompSlots(Number(e.target.value) || 10)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              {/* Mandatory Criteria Builder */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#142C4E]">
                    <Lock className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span>Mandatory Criteria (Hard Gates)</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddNewCompMandatory}
                    className="text-[11px] h-7 gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Rule</span>
                  </Button>
                </div>

                <div className="space-y-1.5">
                  {newCompMandatory.map((crit, idx) => (
                    <div key={crit.id || idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-[#142C4E]">{crit.label}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {crit.field} &bull; {crit.operator} &bull; {String(crit.value)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCriterion(crit, idx, 'mandatory', 'newCompany')}
                          className="p-1 text-[#2563EB] hover:bg-blue-50 rounded"
                          title="Edit rule"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewCompMandatory(idx)}
                          className="p-1 text-[#64748B] hover:text-red-600 rounded"
                          title="Remove rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {newCompMandatory.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">No mandatory rules. Click + Add Rule to set threshold.</p>
                  )}
                </div>
              </div>

              {/* Preferred Criteria Builder */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#142C4E]">
                    <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Preferred Criteria & Scoring Weights</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddNewCompPreferred}
                    className="text-[11px] h-7 gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Preferred Skill</span>
                  </Button>
                </div>

                <div className="space-y-1.5">
                  {newCompPreferred.map((pref, idx) => (
                    <div key={pref.id || idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-[#142C4E]">{pref.label}</div>
                        <div className="text-[11px] text-[#64748B]">
                          Target: {String(pref.value)} &bull; Weight: +{pref.weight} pts
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCriterion(pref, idx, 'preferred', 'newCompany')}
                          className="p-1 text-[#2563EB] hover:bg-blue-50 rounded"
                          title="Edit preferred skill"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewCompPreferred(idx)}
                          className="p-1 text-[#64748B] hover:text-red-600 rounded"
                          title="Remove preferred skill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {newCompPreferred.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">No preferred criteria configured.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddCompanyOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={isCreatingCompany}
                  isLoading={isCreatingCompany}
                  className="gap-1.5"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Create Employer & Criteria</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT CRITERION MODAL                                                      */}
      {/* ========================================================================= */}
      {editingCriterion && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#2563EB]" />
                <h3 className="font-bold text-sm text-[#142C4E]">
                  {editingCriterion.listType === 'mandatory' ? 'Edit Mandatory Criterion' : 'Edit Preferred Criterion'}
                </h3>
              </div>
              <button
                onClick={() => setEditingCriterion(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#142C4E] mb-1">Criterion Label</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  placeholder="e.g. Minimum CGPA 7.5, Python Proficiency"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#142C4E] mb-1">Target Field</label>
                  <select
                    value={editField}
                    onChange={e => setEditField(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB] bg-white"
                  >
                    <option value="cgpa">CGPA (Academic)</option>
                    <option value="backlogs">Active Backlogs</option>
                    <option value="branch">Branch / Major</option>
                    <option value="skills">Technical Skills</option>
                    <option value="projects">Verified Projects</option>
                    <option value="experience">Experience</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#142C4E] mb-1">Operator</label>
                  <select
                    value={editOperator}
                    onChange={e => setEditOperator(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB] bg-white font-mono"
                  >
                    <option value="gte">&gt;= (Greater or Equal)</option>
                    <option value="eq">== (Exact Match)</option>
                    <option value="lte">&lt;= (Less or Equal)</option>
                    <option value="in">in (Includes / Contains)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#142C4E] mb-1">Required Threshold / Value</label>
                <input
                  type="text"
                  value={String(editValue)}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="e.g. 7.5, 0, Python, Computer Science"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              {editingCriterion.listType === 'preferred' && (
                <div>
                  <label className="block font-semibold text-[#142C4E] mb-1">
                    Score Contribution Weight (+{editWeight} pts)
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={editWeight}
                    onChange={e => setEditWeight(Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Low (+5)</span>
                    <span>Standard (+30)</span>
                    <span>High (+60)</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingCriterion(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveEditedCriterion}
              >
                Apply Rule Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
