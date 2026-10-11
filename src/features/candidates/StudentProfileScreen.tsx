import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Building2,
  Mail,
  Phone,
  Sparkles,
  Download,
  Upload,
  UserCheck,
  School,
  XCircle,
  AlertCircle,
  FolderGit2,
  Award,
  ShieldCheck
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { DecisionTrio } from '@/components/domain/DecisionTrio';
import { WhyDrawer } from '@/components/domain/WhyDrawer';
import { formatTimeIST } from '@/lib/format/date';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MatchReport } from '@/lib/api/types';

export const StudentProfileScreen: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [profile, setProfile] = useState<any | null>(null);
  const tabParam = searchParams.get('tab') as any;
  const validTabs = ['applications', 'academic', 'resume', 'schedule', 'history'];
  const [activeTab, setActiveTab] = useState<'applications' | 'academic' | 'resume' | 'schedule' | 'history'>(
    tabParam && validTabs.includes(tabParam) ? tabParam : 'applications'
  );
  const [activeExplanation, setActiveExplanation] = useState<any | null>(null);
  const [whyDrawerOpen, setWhyDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Resume upload & AI match state
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedMatchCompany, setSelectedMatchCompany] = useState<string>('');
  const [matchReport, setMatchReport] = useState<MatchReport | null>(null);
  const [isEvaluatingMatch, setIsEvaluatingMatch] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const handleTabChange = (tab: 'applications' | 'academic' | 'resume' | 'schedule' | 'history') => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  };

  const loadProfile = React.useCallback(() => {
    if (!studentId) return;
    setIsLoading(true);
    apiClient.getStudentById(studentId)
      .then(res => {
        setProfile(res);
        if (res && res.applications && res.applications.length > 0 && !selectedMatchCompany) {
          setSelectedMatchCompany(res.applications[0].companyId);
        }
      })
      .finally(() => setIsLoading(false));
  }, [studentId, selectedMatchCompany]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (isLoading || !profile) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-xs text-[#64748B] animate-pulse space-y-2">
        <div className="w-12 h-12 rounded-xl bg-slate-100 mx-auto"></div>
        <p>Loading candidate academic dossier...</p>
      </div>
    );
  }

  const { student, applications, interviews, overlaps, history } = profile;

  const handleOpenWhy = async (app: any) => {
    const exp = await apiClient.getExplanation(app.id);
    setActiveExplanation(exp);
    setWhyDrawerOpen(true);
  };

  const handleStaffResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !studentId) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadFeedback({ type: 'error', message: 'Only PDF resumes are supported.' });
      return;
    }

    try {
      setIsUploadingResume(true);
      setUploadFeedback(null);
      await apiClient.uploadStudentResume(studentId, file);
      // Reload profile data cleanly without unmounting
      const updated = await apiClient.getStudentById(studentId);
      if (updated) setProfile(updated);
      setUploadFeedback({ type: 'success', message: 'Candidate resume uploaded and parsed successfully!' });
    } catch (err: any) {
      setUploadFeedback({ type: 'error', message: err.message || 'Failed to upload candidate resume' });
    } finally {
      setIsUploadingResume(false);
      e.target.value = '';
    }
  };

  const handleRunAiMatch = async () => {
    if (!studentId || !selectedMatchCompany) return;
    try {
      setIsEvaluatingMatch(true);
      setMatchError(null);
      const report = await apiClient.evaluateMatch(studentId, selectedMatchCompany);
      setMatchReport(report);
    } catch (err: any) {
      setMatchError(err.message || 'AI matching analysis failed');
    } finally {
      setIsEvaluatingMatch(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/candidates')}
          className="text-[#2563EB] gap-1.5 -ml-2 mb-2 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Candidate Directory</span>
        </Button>

        {/* Profile Header Card */}
        <Card className="border-[#E2E8F0] shadow-xs">
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#142C4E]/5 text-[#142C4E] flex items-center justify-center font-bold text-xl border border-[#142C4E]/10">
                {student.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-[#142C4E]">{student.name}</h1>
                  <Badge variant="outline" className="font-mono text-xs font-semibold">
                    {student.rollNumber}
                  </Badge>
                  <Badge variant="success" className="text-[10px] gap-1">
                    <UserCheck className="w-3 h-3" />
                    Verified Candidate
                  </Badge>
                </div>
                <div className="text-xs text-[#64748B] mt-1.5 flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-[#172033]">{student.branch}</span>
                  <span>&bull;</span>
                  <span className="font-mono font-bold text-[#142C4E]">CGPA {Number(student.cgpa).toFixed(2)}</span>
                  <span>&bull;</span>
                  <span className="text-[#64748B]">{student.backlogs} Backlogs</span>
                  {student.academicYear && (
                    <>
                      <span>&bull;</span>
                      <span className="font-medium text-slate-700">{student.academicYear} ({student.graduationYear})</span>
                    </>
                  )}
                </div>
                {student.collegeName && (
                  <div className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1">
                    <School className="w-3.5 h-3.5 text-slate-400" />
                    <span>{student.collegeName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="text-xs text-[#64748B] space-y-1.5 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] min-w-56">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span className="font-mono text-[11px] truncate">{student.email || 'Restricted by privacy policy'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span className="font-mono text-[11px]">{student.phone || 'Restricted by privacy policy'}</span>
                </div>
              </div>
              <Button
                variant={student.resumeFileName ? "outline" : "navy"}
                size="sm"
                onClick={() => {
                  handleTabChange('resume');
                  if (!student.resumeFileName) {
                    setTimeout(() => {
                      document.getElementById('staff-resume-upload')?.click();
                    }, 100);
                  }
                }}
                className="text-xs gap-1.5 shrink-0"
              >
                <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{student.resumeFileName ? 'Resume on File' : 'Upload Resume'}</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Cross-company Overlap Alert */}
      {overlaps && overlaps.length > 0 && (
        <div className="p-4 bg-amber-50 border-l-4 border-[#D97706] rounded-r-lg text-xs text-[#D97706] space-y-1 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
            <span>Cross-Company Schedule Overlap Warning</span>
          </div>
          {overlaps.map((ov: any, idx: number) => (
            <p key={idx} className="text-[#172033]">
              Candidate has concurrent interviews scheduled for <strong>{ov.companyA}</strong> and <strong>{ov.companyB}</strong> around {ov.time}.
            </p>
          ))}
        </div>
      )}

      {/* Profile Navigation Tabs */}
      <div className="border-b border-[#E2E8F0] flex gap-6 text-xs font-semibold text-[#64748B]">
        <button
          type="button"
          onClick={() => handleTabChange('applications')}
          className={`pb-3 transition-colors ${
            activeTab === 'applications' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'hover:text-[#172033]'
          }`}
        >
          Company Applications ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('academic')}
          className={`pb-3 transition-colors ${
            activeTab === 'academic' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'hover:text-[#172033]'
          }`}
        >
          Verified Academic Record
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('resume')}
          className={`pb-3 transition-colors ${
            activeTab === 'resume' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'hover:text-[#172033]'
          }`}
        >
          Resume & Gemini AI Match
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('schedule')}
          className={`pb-3 transition-colors ${
            activeTab === 'schedule' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'hover:text-[#172033]'
          }`}
        >
          Interview Schedule ({interviews.length})
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('history')}
          className={`pb-3 transition-colors ${
            activeTab === 'history' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'hover:text-[#172033]'
          }`}
        >
          Audit History ({history.length})
        </button>
      </div>

      {/* Tab 1: Applications */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {applications.map((app: any) => (
            <Card key={app.id} className="border-[#E2E8F0] shadow-xs">
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#2563EB]" />
                    <span className="font-bold text-sm text-[#142C4E]">{app.companyName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenWhy(app)}
                    className="text-[#2563EB] text-xs h-7 px-2"
                  >
                    Open Why Explanation &rarr;
                  </Button>
                </div>

                <div>
                  <DecisionTrio
                    eligibility={app.eligibility}
                    matchScore={app.matchScore}
                    selection={app.selection}
                    onWhyClick={() => handleOpenWhy(app)}
                  />
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs text-[#64748B]">
                  <span className="font-semibold text-[#142C4E]">Selection Decision:</span> {app.selectionReason}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 2: Academic Record */}
      {activeTab === 'academic' && (
        <Card className="border-[#E2E8F0] shadow-xs">
          <div className="p-6 space-y-4 text-xs">
            <h2 className="font-bold text-sm text-[#142C4E]">Academic Eligibility Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[#64748B] block mb-1">Cumulative GPA</span>
                <span className="text-base font-bold font-mono text-[#142C4E]">{Number(student.cgpa).toFixed(2)}</span>
                <span className="ml-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#16845B]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified by Registrar</span>
                </span>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[#64748B] block mb-1">Active Backlogs</span>
                <span className="text-base font-bold font-mono text-[#142C4E]">{student.backlogs}</span>
                <span className="ml-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#16845B]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Clean</span>
                </span>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[#64748B] block mb-1">Enrolled Branch</span>
                <span className="text-sm font-semibold text-[#142C4E]">{student.branch}</span>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[#64748B] block mb-1">Academic Year / Cohort</span>
                <span className="text-sm font-semibold text-[#142C4E]">
                  {student.academicYear || '4th Year'} &bull; Graduation: {student.graduationYear || 2026}
                </span>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] md:col-span-2">
                <span className="text-[#64748B] block mb-1">Documented Skills</span>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {student.skills.map((s: string, idx: number) => (
                    <Badge key={idx} variant="info" className="text-[11px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Resume & AI Match */}
      {activeTab === 'resume' && (
        <div className="space-y-5">
          {uploadFeedback && (
            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
              uploadFeedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {uploadFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{uploadFeedback.message}</span>
            </div>
          )}

          {/* Resume Storage & Actions Card */}
          <Card className="border-[#E2E8F0] shadow-xs">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2563EB]" />
                  <h2 className="font-bold text-sm text-[#142C4E]">Private Resume Document</h2>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="staff-resume-upload"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleStaffResumeUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploadingResume}
                    className="text-xs gap-1.5 cursor-pointer"
                    onClick={() => document.getElementById('staff-resume-upload')?.click()}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingResume ? 'Uploading...' : 'Upload/Replace PDF'}</span>
                  </Button>

                  {student.resumeFileName && (
                    <Button
                      variant="navy"
                      size="sm"
                      onClick={() => window.open(apiClient.getStudentResumeUrl(student.id), '_blank')}
                      className="text-xs gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </Button>
                  )}
                </div>
              </div>

              {student.resumeFileName ? (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#142C4E]">{student.resumeFileName}</div>
                      <div className="text-[11px] text-[#64748B]">
                        Storage: Private server storage &bull; {student.resumeUploadedAt ? new Date(student.resumeUploadedAt).toLocaleDateString() : 'Verified on file'}
                      </div>
                    </div>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    Stored Outside Web Root
                  </Badge>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#64748B] bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-[#142C4E]">No resume uploaded yet</p>
                  <p className="text-[11px] mt-0.5">Use the Upload button above to upload a verified PDF for this candidate.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Parsed Resume Portfolio & Projects Card */}
          {student.parsedResume && (
            <Card className="border-[#E2E8F0] shadow-xs">
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#2563EB]" />
                    <h2 className="font-bold text-sm text-[#142C4E]">Extracted Resume Portfolio & Verified Dossier</h2>
                  </div>
                  <Badge variant="success" className="text-[10px] gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified Parsing ({student.parsedResume.skills?.length || 0} Skills Extracted)
                  </Badge>
                </div>

                {/* Projects */}
                {student.parsedResume.projects && student.parsedResume.projects.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#142C4E] uppercase tracking-wider">
                      <FolderGit2 className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Extracted Projects ({student.parsedResume.projects.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {student.parsedResume.projects.map((proj: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 hover:border-blue-300 transition-colors">
                          <h4 className="font-bold text-sm text-[#142C4E]">{proj.title}</h4>
                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {proj.technologies.map((t: string, tIdx: number) => (
                                <span key={tIdx} className="px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] text-[10px] font-semibold border border-blue-200">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          {proj.description && (
                            <p className="text-xs text-[#64748B] leading-relaxed">
                              {proj.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Skills & Tools */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#E2E8F0]">
                  <div>
                    <span className="block font-bold text-xs text-[#142C4E] uppercase tracking-wider mb-2">
                      Extracted Technical Skills ({student.parsedResume.skills?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {student.parsedResume.skills?.map((s: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[#142C4E] text-xs font-medium shadow-2xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block font-bold text-xs text-[#142C4E] uppercase tracking-wider mb-2">
                      Developer Tools & Platforms ({student.parsedResume.tools?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {student.parsedResume.tools?.map((tool: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Achievements & Certifications */}
                {((student.parsedResume.achievements && student.parsedResume.achievements.length > 0) || 
                  (student.parsedResume.certifications && student.parsedResume.certifications.length > 0)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#E2E8F0]">
                    {student.parsedResume.achievements && student.parsedResume.achievements.length > 0 && (
                      <div>
                        <span className="block font-bold text-xs text-[#142C4E] uppercase tracking-wider mb-2">
                          Achievements & Awards
                        </span>
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {student.parsedResume.achievements.map((ach: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <Award className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <span>{ach}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {student.parsedResume.certifications && student.parsedResume.certifications.length > 0 && (
                      <div>
                        <span className="block font-bold text-xs text-[#142C4E] uppercase tracking-wider mb-2">
                          Verified Certifications
                        </span>
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {student.parsedResume.certifications.map((cert: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{cert}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Gemini AI Match Analysis Card */}
          <Card className="border-[#E2E8F0] shadow-xs">
            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <div>
                    <h2 className="font-bold text-sm text-[#142C4E]">Gemini AI Resume-to-Company Matching</h2>
                    <p className="text-[11px] text-[#64748B]">Explainable skill extraction and criteria alignment (Deterministic gates remain authoritative)</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedMatchCompany}
                    onChange={e => setSelectedMatchCompany(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium"
                  >
                    {applications.map((app: any) => (
                      <option key={app.companyId} value={app.companyId}>
                        {app.companyName}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="navy"
                    size="sm"
                    onClick={handleRunAiMatch}
                    disabled={isEvaluatingMatch || !selectedMatchCompany}
                    className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isEvaluatingMatch ? 'Analyzing...' : 'Run Match Analysis'}</span>
                  </Button>
                </div>
              </div>

              {matchError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{matchError}</span>
                </div>
              )}

              {matchReport && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#142C4E]">
                        {matchReport.companyName} &bull; {matchReport.roleTitle}
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        Mandatory Eligibility: <span className="font-semibold text-emerald-700">{matchReport.mandatoryPassed ? 'Passed Hard Gates' : 'Failed Gates'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-indigo-700">
                        {matchReport.matchScore}%
                      </div>
                      <span className="text-[10px] text-indigo-600 font-medium">Semantic Fit</span>
                    </div>
                  </div>

                  {/* Matching Skills with Evidence */}
                  <div>
                    <h3 className="text-xs font-bold text-[#142C4E] mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Matching Skills with Supporting Resume Evidence</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {matchReport.matchingSkills.map((m, idx) => (
                        <div key={idx} className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs">
                          <div className="font-bold text-[#142C4E] text-[11px]">{m.skill}</div>
                          <div className="text-[11px] text-[#64748B] mt-0.5">{m.evidence}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  {matchReport.missingSkills && matchReport.missingSkills.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-[#142C4E] mb-2 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Missing or Unclear Preferred Skills</span>
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {matchReport.missingSkills.map((s, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-200">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advisory Notice */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{matchReport.advisoryDisclaimer || 'AI match scoring is advisory only. Selection decisions are made by placement coordinators.'}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {matchReport.confidence || 'High Confidence'}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4: Schedule */}
      {activeTab === 'schedule' && (
        <Card className="border-[#E2E8F0] shadow-xs">
          <div className="p-6 space-y-4 text-xs">
            <h2 className="font-bold text-sm text-[#142C4E]">Candidate Interview Schedule</h2>
            {interviews.length === 0 ? (
              <p className="text-[#64748B] py-6 text-center">No interviews scheduled yet for this round.</p>
            ) : (
              <div className="space-y-3">
                {interviews.map((int: any) => (
                  <div key={int.id} className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-[#142C4E]">{int.companyName}</div>
                      <div className="text-[#64748B] mt-0.5">
                        {int.roomName} &bull; Panel: {int.interviewerNames ? int.interviewerNames.join(', ') : 'Assigned Panellists'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-[#2563EB] block">
                        {formatTimeIST(int.scheduledStart)} - {formatTimeIST(int.scheduledEnd)}
                      </span>
                      <Badge variant="success" className="text-[10px] mt-1 capitalize">
                        {int.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Tab 5: History */}
      {activeTab === 'history' && (
        <Card className="border-[#E2E8F0] shadow-xs">
          <div className="p-6 space-y-3 text-xs">
            <h2 className="font-bold text-sm text-[#142C4E]">Candidate Audit Entries</h2>
            <div className="space-y-2">
              {history.map((h: any) => (
                <div key={h.id} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <div className="font-semibold text-[#142C4E]">{h.summary}</div>
                  <div className="text-[10px] text-[#64748B] mt-1 font-mono">
                    Actor: {h.actor.name} ({h.actor.role}) &bull; {formatTimeIST(h.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Why Drawer */}
      <WhyDrawer
        isOpen={whyDrawerOpen}
        onClose={() => setWhyDrawerOpen(false)}
        studentName={student.name}
        rollNumber={student.rollNumber}
        companyName={activeExplanation?.companyName || 'Evaluation'}
        explanation={activeExplanation}
      />
    </div>
  );
};
