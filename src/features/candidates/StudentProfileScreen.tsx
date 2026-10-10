import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  GraduationCap, 
  ShieldCheck, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2,
  Mail,
  Phone,
  Sparkles,
  ExternalLink,
  UserCheck
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { DecisionTrio } from '@/components/domain/DecisionTrio';
import { WhyDrawer } from '@/components/domain/WhyDrawer';
import { formatTimeIST } from '@/lib/format/date';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const StudentProfileScreen: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'applications' | 'academic' | 'schedule' | 'history'>('applications');
  const [activeExplanation, setActiveExplanation] = useState<any | null>(null);
  const [whyDrawerOpen, setWhyDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setIsLoading(true);
    apiClient.getStudentById(studentId)
      .then(res => setProfile(res))
      .finally(() => setIsLoading(false));
  }, [studentId]);

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
                <div className="text-xs text-[#64748B] mt-1.5 flex items-center gap-3">
                  <span className="font-medium text-[#172033]">{student.branch}</span>
                  <span>&bull;</span>
                  <span className="font-mono font-bold text-[#142C4E]">CGPA {student.cgpa.toFixed(2)}</span>
                  <span>&bull;</span>
                  <span className="text-[#64748B]">{student.backlogs} Backlogs</span>
                </div>
              </div>
            </div>

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
          onClick={() => setActiveTab('applications')}
          className={`pb-3 transition-colors ${
            activeTab === 'applications' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'hover:text-[#172033]'
          }`}
        >
          Company Applications ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('academic')}
          className={`pb-3 transition-colors ${
            activeTab === 'academic' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'hover:text-[#172033]'
          }`}
        >
          Verified Academic Record
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 transition-colors ${
            activeTab === 'schedule' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'hover:text-[#172033]'
          }`}
        >
          Interview Schedule ({interviews.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
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
                <span className="text-base font-bold font-mono text-[#142C4E]">{student.cgpa.toFixed(2)}</span>
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

      {/* Tab 3: Schedule */}
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
                        {int.roomName} &bull; Panel: {int.interviewerNames.join(', ')}
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

      {/* Tab 4: History */}
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
