import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Calendar, 
  Clock, 
  Building2, 
  MapPin, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Bell, 
  ShieldCheck, 
  LogOut, 
  Download, 
  RefreshCw, 
  ChevronRight, 
  Phone, 
  Mail, 
  BookOpen, 
  Check, 
  AlertTriangle,
  FolderGit2,
  Award,
  Pencil,
  X,
  School,
  User
} from 'lucide-react';
import { useAuth } from '@/lib/auth/authContext';
import { apiClient } from '@/lib/api/client';
import type { StudentProfileData, MatchReport } from '@/lib/api/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const StudentPortalScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<StudentProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Match report modal state
  const [activeMatchReport, setActiveMatchReport] = useState<MatchReport | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);

  // Full student profile edit state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [editAcademicYear, setEditAcademicYear] = useState('4th Year');
  const [editGraduationYear, setEditGraduationYear] = useState<number>(2027);
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null);

  // Self-edit phone/skills state (inline legacy)
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  const loadStudentData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await apiClient.getStudentMe();
      if (!res || !res.student) {
        throw new Error('Student profile data is unavailable.');
      }
      setData(res);
      setPhoneInput(res.student?.phone || '');
    } catch (err: any) {
      console.error('Failed to load student data:', err);
      setLoadError(err.message || 'Failed to retrieve student profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Invalid file type: Please select a valid PDF document.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File exceeds 5 MB limit. Please upload a smaller PDF.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const res = await apiClient.uploadMyResume(file);
      setUploadSuccess(`Resume uploaded successfully! ${res.isAiParsed ? 'Parsed by Gemini AI.' : 'Validated.'}`);
      await loadStudentData();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload resume.');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleViewMatchReport = async (companyId: string) => {
    if (!data?.student) return;
    setIsLoadingMatch(true);
    setActiveMatchReport(null);
    try {
      const report = await apiClient.getMatchReport(data.student.id, companyId);
      setActiveMatchReport(report);
    } catch (err: any) {
      console.error('Failed to get match report:', err);
    } finally {
      setIsLoadingMatch(false);
    }
  };

  const handleSavePhone = async () => {
    try {
      await apiClient.updateStudentMe({ phone: phoneInput });
      setIsEditingPhone(false);
      await loadStudentData();
    } catch (err: any) {
      alert('Failed to update phone: ' + err.message);
    }
  };

  const handleOpenEditProfile = () => {
    if (!data?.student) return;
    setEditName(data.student.name || '');
    setEditEmail(data.student.email || '');
    setEditPhone(data.student.phone || '');
    setEditCollege(data.student.collegeName || 'Apex Institute of Technology');
    setEditAcademicYear(data.student.academicYear || '4th Year');
    setEditGraduationYear(Number(data.student.graduationYear) || 2027);
    setEditSkills([...(data.student.skills || [])]);
    setProfileSaveError(null);
    setProfileSaveSuccess(null);
    setIsEditProfileOpen(true);
  };

  const handleAddSkill = (skillToAdd?: string) => {
    const s = (skillToAdd || newSkillInput).trim();
    if (!s) return;
    if (!editSkills.some(existing => existing.toLowerCase() === s.toLowerCase())) {
      setEditSkills([...editSkills, s]);
    }
    if (!skillToAdd) setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setEditSkills(editSkills.filter(s => s !== skillToRemove));
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setProfileSaveError('Student name cannot be empty.');
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileSaveError(null);
      setProfileSaveSuccess(null);

      await apiClient.updateStudentMe({
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        collegeName: editCollege.trim(),
        academicYear: editAcademicYear,
        graduationYear: Number(editGraduationYear),
        skills: editSkills
      });

      setProfileSaveSuccess('Profile updated successfully!');
      await loadStudentData();
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setProfileSaveSuccess(null);
      }, 1000);
    } catch (err: any) {
      setProfileSaveError(err.message || 'Failed to update student profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleMarkRead = async (notifId: string) => {
    try {
      await apiClient.markNotificationRead(notifId);
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          notifications: prev.notifications.map(n => n.id === notifId ? { ...n, isRead: true } : n)
        };
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-md text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#142C4E]">Student Portal Unavailable</h2>
            <p className="text-xs text-[#64748B] mt-1">{loadError}</p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="navy" size="sm" onClick={loadStudentData} className="gap-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs">
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#2563EB] animate-spin" />
          <p className="text-xs text-[#64748B] font-medium">Loading your secure student portal...</p>
        </div>
      </div>
    );
  }

  const { 
    student, 
    applications = [], 
    interviews = [], 
    notifications = [] 
  } = data;
  const nextInterview = (interviews || []).find(iv => iv.status === 'scheduled' || iv.status === 'in_progress' || iv.status === 'delayed') || (interviews || [])[0];

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#172033] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-[#142C4E] text-white border-b border-slate-700 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">Placement Command</div>
              <div className="text-[11px] text-blue-200">Candidate Self-Service Portal</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold">{student.name}</span>
              <span className="text-[10px] text-slate-300">{student.rollNumber} • {student.branch}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 w-full flex-1 space-y-6">
        {/* Welcome & Highlights Banner */}
        <div className="bg-gradient-to-r from-[#142C4E] to-[#1E3A8A] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-[11px] font-semibold text-blue-200 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                Verified Academic Profile
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
              <p className="text-xs text-blue-100 mt-1 max-w-xl">
                {student.collegeName || 'Apex Institute of Technology'} • {student.academicYear || '4th Year'} (Graduating {student.graduationYear || '2027'})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 text-center border border-white/15 min-w-[90px]">
                <div className="text-xl font-bold tracking-tight">{Number(student.cgpa || 0).toFixed(2)}</div>
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Verified CGPA</div>
              </div>
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 text-center border border-white/15 min-w-[90px]">
                <div className="text-xl font-bold tracking-tight">{student.backlogs}</div>
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Backlogs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Alert Bar (If any unread) */}
        {notifications && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs transition-all ${
                  n.isRead ? 'bg-white border-[#E2E8F0] text-[#64748B]' : 'bg-blue-50/70 border-blue-200 text-[#142C4E] shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <Bell className={`w-4 h-4 mt-0.5 shrink-0 ${n.isRead ? 'text-[#64748B]' : 'text-[#2563EB]'}`} />
                  <div>
                    <span className="font-bold mr-2">{n.title}</span>
                    <span>{n.message}</span>
                  </div>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-[11px] font-semibold text-[#2563EB] hover:underline shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Next Interview & Applications */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prominent Next Interview Card */}
            <Card className="border-[#E2E8F0] shadow-sm bg-white overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#2563EB]" />
                  <span className="text-xs font-bold text-[#142C4E]">Your Interview Schedule</span>
                </div>
                {nextInterview && (
                  <Badge variant={nextInterview.status === 'in_progress' ? 'default' : 'secondary'} className="capitalize text-[11px]">
                    {nextInterview.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>

              <CardContent className="p-6">
                {nextInterview ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold text-[#142C4E]">{nextInterview.companyName}</div>
                        <div className="text-xs text-[#64748B] font-medium">{nextInterview.roleTitle || 'Technical Round 1'}</div>
                      </div>
                      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200/60 text-xs font-semibold text-[#2563EB]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {new Date(nextInterview.scheduledStart).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Kolkata'
                          })} - {new Date(nextInterview.scheduledEnd).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Kolkata'
                          })} IST
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0] text-xs">
                      <div className="flex items-center gap-2 text-[#64748B]">
                        <MapPin className="w-4 h-4 text-[#2563EB] shrink-0" />
                        <span>
                          <strong>Location:</strong> {nextInterview.roomName} ({nextInterview.building || 'Campus Placement Cell'})
                        </span>
                      </div>
                      {nextInterview.panellists && nextInterview.panellists.length > 0 && (
                        <div className="flex items-center gap-2 text-[#64748B]">
                          <GraduationCap className="w-4 h-4 text-[#2563EB] shrink-0" />
                          <span>
                            <strong>Panellist:</strong> {nextInterview.panellists.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {nextInterview.delayMinutes && nextInterview.delayMinutes > 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold">Schedule Update: </span>
                          <span>Interview is estimated to be delayed by ~{nextInterview.delayMinutes} mins. Please remain on standby in the candidate waiting hall.</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="py-8 text-center text-[#64748B] text-xs">
                    No confirmed interview slots assigned currently. Check company eligibility status below.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company Applications & Match Insights */}
            <Card className="border-[#E2E8F0] shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-[#E2E8F0]">
                <CardTitle className="text-sm font-bold text-[#142C4E]">Company Applications & Selection Status</CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  Deterministic eligibility gate results and advisory AI match analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[#E2E8F0]">
                  {applications.map(app => (
                    <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#142C4E]">{app.companyName}</span>
                          <Badge variant={app.eligibility === 'eligible' ? 'default' : app.eligibility === 'pending_verification' ? 'outline' : 'destructive'} className="text-[10px]">
                            {app.eligibility.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B]">
                          Status: <strong className="capitalize text-[#142C4E]">{app.selection?.replace(/_/g, ' ')}</strong>
                          {app.rank ? ` • Rank #${app.rank}` : ''}
                          {app.waitlistPosition ? ` • Waitlist Pos #${app.waitlistPosition}` : ''}
                        </p>
                        {app.selectionReason && (
                          <p className="text-[11px] text-[#64748B] italic">"{app.selectionReason}"</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMatchReport(app.companyId)}
                          className="text-xs font-semibold gap-1.5 h-8 text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI Match Analysis</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Extracted Resume Dossier Card */}
            {student.parsedResume && (
              <Card className="border-[#E2E8F0] shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-3 border-b border-[#E2E8F0] bg-slate-50/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#2563EB]" />
                      <CardTitle className="text-sm font-bold text-[#142C4E]">
                        Extracted Resume Dossier & Portfolio
                      </CardTitle>
                    </div>
                    <Badge variant="success" className="text-[10px] gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Verified Extraction ({student.parsedResume.skills?.length || 0} Skills)
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-[#64748B]">
                    Extracted from {student.resumeFileName || 'uploaded PDF'} &bull; Used for role criteria and AI match analysis.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-5 text-xs">
                  {/* Extracted Projects */}
                  {student.parsedResume.projects && student.parsedResume.projects.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#142C4E] uppercase tracking-wider">
                        <FolderGit2 className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>Verified Projects ({student.parsedResume.projects.length})</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {student.parsedResume.projects.map((proj: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 hover:border-blue-300 transition-colors">
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

                  {/* Extracted Technical Skills & Tools */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <span className="block font-bold text-xs text-[#142C4E] uppercase tracking-wider mb-2">
                        Extracted Skills ({student.parsedResume.skills?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {student.parsedResume.skills?.map((s: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#142C4E] text-[11px] font-medium shadow-2xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block font-bold text-xs text-[#142C4E] uppercase tracking-wider mb-2">
                        Tools & Environments ({student.parsedResume.tools?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {student.parsedResume.tools?.map((tool: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-medium shadow-2xs">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Achievements & Certifications */}
                  {((student.parsedResume.achievements && student.parsedResume.achievements.length > 0) || 
                    (student.parsedResume.certifications && student.parsedResume.certifications.length > 0)) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
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
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Private Resume & Profile Details */}
          <div className="space-y-6">
            {/* Private Resume Management Card */}
            <Card className="border-[#E2E8F0] shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-[#142C4E]">Private Resume Storage</CardTitle>
                  <Badge variant="outline" className="text-[10px] text-[#2563EB] border-[#2563EB]/30">
                    PDF Only • 5MB
                  </Badge>
                </div>
                <CardDescription className="text-xs text-[#64748B]">
                  Privately hosted outside public web root with access authorization.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {uploadError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-[#DC2626] flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
                {uploadSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                {student.resumeFileName ? (
                  <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate mr-2">
                      <FileText className="w-5 h-5 text-[#2563EB] shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-[#142C4E] truncate">{student.resumeFileName}</div>
                        <div className="text-[10px] text-[#64748B]">
                          Status: <span className="text-emerald-700 font-medium capitalize">{student.resumeParseStatus || 'Verified'}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={apiClient.getMyResumeUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-slate-100 text-[#142C4E] transition-colors"
                      title="Download / View PDF"
                    >
                      <Download className="w-4 h-4 text-[#2563EB]" />
                    </a>
                  </div>
                ) : (
                  <div className="p-4 border-2 border-dashed border-[#E2E8F0] rounded-xl text-center text-xs text-[#64748B]">
                    No resume uploaded yet. Upload your PDF to enable explainable matching.
                  </div>
                )}

                <div>
                  <label
                    htmlFor="resume-upload-input"
                    className={`w-full py-2.5 px-4 rounded-xl border border-dashed text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      isUploading
                        ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-50/50 border-[#2563EB]/40 hover:bg-blue-50 text-[#2563EB]'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{isUploading ? 'Uploading & Parsing...' : student.resumeFileName ? 'Replace Resume (PDF)' : 'Upload Resume (PDF)'}</span>
                  </label>
                  <input
                    id="resume-upload-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Profile & Self-Service Fields Card */}
            <Card className="border-[#E2E8F0] shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-[#142C4E]">Student Academic Profile</CardTitle>
                  <CardDescription className="text-xs text-[#64748B]">
                    Official verified records and candidate contact information.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEditProfile}
                  className="text-xs gap-1.5 text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/5 font-semibold"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </Button>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Full Name</span>
                    <span className="font-semibold text-[#142C4E]">{student.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Roll Number</span>
                    <span className="font-semibold text-[#142C4E] font-mono">{student.rollNumber}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Branch / Major</span>
                    <span className="font-semibold text-[#142C4E]">{student.branch}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Academic Standing</span>
                    <span className="font-semibold text-[#142C4E]">{student.academicYear || '4th Year'} ({student.graduationYear || '2027'})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">CGPA (Verified)</span>
                    <span className="font-semibold text-[#142C4E]">{Number(student.cgpa || 0).toFixed(2)} / 10.0</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Active Backlogs</span>
                    <span className="font-semibold text-[#142C4E]">{student.backlogs}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">College / Campus</span>
                    <span className="font-semibold text-[#142C4E]">{student.collegeName || 'Apex Institute of Technology'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Email Address</span>
                    <span className="font-semibold text-[#142C4E] truncate max-w-[190px]">{student.email || 'student@placement.example'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Contact Phone</span>
                    <span className="font-semibold text-[#142C4E]">{student.phone || 'No phone registered'}</span>
                  </div>
                </div>

                {/* Technical Skills */}
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="block text-xs font-semibold text-[#142C4E]">Technical Skills & Tags</span>
                    <button
                      onClick={handleOpenEditProfile}
                      className="text-[11px] text-[#2563EB] hover:underline font-medium"
                    >
                      Manage Skills
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {student.skills && student.skills.length > 0 ? (
                      student.skills.map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-[#142C4E] text-[11px] font-medium border border-slate-200">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#64748B]">No skills tagged</span>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenEditProfile}
                    className="w-full text-xs gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Edit Profile Details</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* AI Match Explanation Modal / Drawer */}
      {activeMatchReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-[#E2E8F0] shadow-xl p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2563EB]" />
                  <h3 className="text-base font-bold text-[#142C4E]">AI Match Analysis</h3>
                  <Badge variant={activeMatchReport.isAiGenerated ? 'default' : 'secondary'} className="text-[10px]">
                    {activeMatchReport.isAiGenerated ? 'Gemini 2.5 Flash' : 'Deterministic Engine'}
                  </Badge>
                </div>
                <p className="text-xs text-[#64748B] mt-1">
                  Fit explanation for <strong>{activeMatchReport.companyName}</strong> ({activeMatchReport.roleTitle})
                </p>
              </div>
              <button
                onClick={() => setActiveMatchReport(null)}
                className="text-[#64748B] hover:text-[#172033] p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Score & Hard Gate Status */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-[#E2E8F0]">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Advisory Match Score</div>
                <div className="text-2xl font-bold text-[#142C4E]">{activeMatchReport.matchScore} / 100</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Mandatory Eligibility</div>
                <Badge variant={activeMatchReport.mandatoryPassed ? 'default' : 'destructive'} className="text-xs">
                  {activeMatchReport.mandatoryPassed ? 'Hard Gates Met' : 'Ineligible'}
                </Badge>
              </div>
            </div>

            {/* Matching Skills with Evidence */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#142C4E] uppercase tracking-wider">Verified Matching Skills</h4>
              {activeMatchReport.matchingSkills.length > 0 ? (
                <div className="space-y-1.5">
                  {activeMatchReport.matchingSkills.map((m, i) => (
                    <div key={i} className="p-2.5 bg-emerald-50/60 border border-emerald-200/70 rounded-lg text-xs">
                      <div className="font-bold text-emerald-900">{m.skill}</div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">{m.evidence}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#64748B]">No direct matching skills recorded.</p>
              )}
            </div>

            {/* Missing Preferred Skills */}
            {activeMatchReport.missingSkills && activeMatchReport.missingSkills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#142C4E] uppercase tracking-wider">Unmatched Preferred Criteria</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeMatchReport.missingSkills.map((skill, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preparation Suggestions */}
            {activeMatchReport.preparationSuggestions && activeMatchReport.preparationSuggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#142C4E] uppercase tracking-wider">Interview Preparation Recommendations</h4>
                <ul className="list-disc list-inside text-xs text-[#64748B] space-y-1">
                  {activeMatchReport.preparationSuggestions.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Limitations Notice */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900">
              <strong>Advisory Policy: </strong>{activeMatchReport.limitations}
            </div>

            <div className="text-right">
              <Button onClick={() => setActiveMatchReport(null)} className="text-xs">
                Close Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Profile Details Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#2563EB] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#142C4E]">Edit Profile Details</h3>
                  <p className="text-xs text-[#64748B]">Update candidate contact information and technical skillset.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {profileSaveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{profileSaveError}</span>
                </div>
              )}
              {profileSaveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profileSaveSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#142C4E]">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#142C4E]">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#142C4E]">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#142C4E]">College / Institution Name</label>
                <input
                  type="text"
                  value={editCollege}
                  onChange={e => setEditCollege(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#142C4E]">Academic Year</label>
                  <select
                    value={editAcademicYear}
                    onChange={e => setEditAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB] bg-white"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#142C4E]">Graduation Year</label>
                  <input
                    type="number"
                    min="2024"
                    max="2030"
                    value={editGraduationYear}
                    onChange={e => setEditGraduationYear(Number(e.target.value) || 2027)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              {/* Skills Management */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-[#142C4E]">Technical Skills & Tags</label>
                
                {/* Current skills pills with delete */}
                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {editSkills.map((s, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[#142C4E] text-xs font-medium shadow-2xs"
                    >
                      <span>{s}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s)}
                        className="text-slate-400 hover:text-red-500 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {editSkills.length === 0 && (
                    <span className="text-xs text-slate-400">No skills added yet.</span>
                  )}
                </div>

                {/* Add Custom Skill */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom skill (e.g. Docker, GraphQL)"
                    value={newSkillInput}
                    onChange={e => setNewSkillInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSkill()}
                    className="text-xs"
                  >
                    Add
                  </Button>
                </div>

                {/* Quick Add Suggestions */}
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Quick Add:</span>
                  <div className="flex flex-wrap gap-1">
                    {['React', 'TypeScript', 'Node.js', 'Python', 'SQL', 'Docker', 'AWS', 'Java', 'DSA', 'Next.js'].map(sugg => (
                      <button
                        key={sugg}
                        type="button"
                        onClick={() => handleAddSkill(sugg)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          editSkills.includes(sugg)
                            ? 'bg-blue-50 text-blue-700 border-blue-200 cursor-default'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        + {sugg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditProfileOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={isSavingProfile}
                  isLoading={isSavingProfile}
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
