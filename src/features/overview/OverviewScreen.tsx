import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  Hourglass, 
  Clock, 
  ArrowRight, 
  Check, 
  AlertCircle,
  Calendar,
  Activity,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  School,
  Database,
  RefreshCw,
  GitFork,
  Briefcase
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { Company, StudentApplication } from '@/lib/api/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export const OverviewScreen: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedCompany = searchParams.get('company') || 'comp-asteria';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [topApplications, setTopApplications] = useState<StudentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Live');

  const loadData = React.useCallback(() => {
    setIsLoading(true);
    Promise.all([
      apiClient.getCompanies(),
      apiClient.getOverview(selectedCompany),
      apiClient.getEligibility(selectedCompany, 'all')
    ]).then(([comps, data, apps]) => {
      setCompanies(comps);
      setOverviewData(data);
      setTopApplications(apps.slice(0, 6));
      setLastRefreshed(new Date().toLocaleTimeString());
    }).finally(() => {
      setIsLoading(false);
    });
  }, [selectedCompany]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompanyChange = (compVal: string) => {
    const next = new URLSearchParams(searchParams);
    if (compVal === 'all') next.delete('company');
    else next.set('company', compVal);
    setSearchParams(next);
  };

  if (isLoading || !overviewData) {
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true">
        <div className="h-12 bg-slate-200/80 rounded-xl w-full" />
        <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          <div className="h-28 bg-slate-200/80 rounded-xl" />
          <div className="h-28 bg-slate-200/80 rounded-xl" />
          <div className="h-28 bg-slate-200/80 rounded-xl" />
          <div className="h-28 bg-slate-200/80 rounded-xl" />
        </div>
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-2 h-80 bg-slate-200/80 rounded-xl" />
          <div className="h-80 bg-slate-200/80 rounded-xl" />
        </div>
      </div>
    );
  }

  const { kpis, funnel, pipelineSteps, attentionItems, todaySummary, charts, dataSource } = overviewData;
  const currentCompanyObj = companies.find(c => c.id === selectedCompany);

  // Derive charts safely
  const academicYearData: Array<{ academicYear: string; graduationYear: number; count: number }> = 
    charts?.byAcademicYear || [
      { academicYear: '4th Year', graduationYear: 2026, count: 6 },
      { academicYear: '3rd Year', graduationYear: 2027, count: 4 }
    ];

  const branchData: Array<{ branch: string; registered: number; eligible: number; selected: number }> = 
    charts?.byBranch || [
      { branch: 'Computer Science', registered: 4, eligible: 3, selected: 2 },
      { branch: 'Electrical Engineering', registered: 2, eligible: 2, selected: 1 },
      { branch: 'Information Technology', registered: 2, eligible: 2, selected: 1 },
      { branch: 'Mechanical Engineering', registered: 2, eligible: 1, selected: 0 }
    ];

  const collegeData: Array<{ collegeName: string; count: number }> = 
    charts?.byCollege || [
      { collegeName: 'National Institute of Technology', count: 10 }
    ];

  const timelineData: Array<{ timeSlot: string; total: number; scheduled: number; inProgress: number; completed: number; delayed: number }> = 
    charts?.interviewTimeline || [
      { timeSlot: '09:00 AM', total: 2, scheduled: 2, inProgress: 0, completed: 0, delayed: 0 },
      { timeSlot: '10:00 AM', total: 2, scheduled: 1, inProgress: 1, completed: 0, delayed: 0 },
      { timeSlot: '11:00 AM', total: 2, scheduled: 0, inProgress: 0, completed: 1, delayed: 1 },
      { timeSlot: '02:00 PM', total: 2, scheduled: 2, inProgress: 0, completed: 0, delayed: 0 }
    ];

  const conflictsData: Array<{ type: string; count: number; open: number; resolved: number }> = 
    charts?.conflicts || [
      { type: 'interviewer', count: 1, open: 1, resolved: 0 }
    ];

  const totalRegistered = kpis?.totalRegisteredStudents || 10;
  const maxBranchRegistered = Math.max(...branchData.map(b => b.registered), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Scope Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-pulse" />
            <h1 className="text-base font-bold text-[#142C4E] tracking-tight">Operations Command Dashboard</h1>
          </div>
          <span className="hidden sm:inline text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <label htmlFor="company-filter" className="text-xs font-medium text-[#64748B] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Drive Scope:</span>
            </label>
            <select
              id="company-filter"
              value={selectedCompany}
              onChange={e => handleCompanyChange(e.target.value)}
              className="text-xs bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] rounded-lg px-3 py-1.5 font-semibold text-[#172033] focus:ring-2 focus:ring-[#2563EB] transition-colors cursor-pointer"
            >
              <option value="all">All Participating Companies</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.slots} slots)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Data Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">{dataSource === 'postgres' ? 'Live PostgreSQL' : 'Mock Fallback'}</span>
            <span className="text-[10px] text-emerald-600">({lastRefreshed})</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="text-xs gap-1 h-8"
            title="Refresh metrics from PostgreSQL"
          >
            <RefreshCw className="w-3 h-3 text-slate-500" />
            <span>Refresh</span>
          </Button>

          {attentionItems?.[0] && (
            <Button
              variant="navy"
              size="sm"
              onClick={() => navigate(attentionItems[0].route || '/approvals')}
              className="w-full sm:w-auto gap-1.5 h-8 text-xs"
            >
              <span>{attentionItems[0].label || attentionItems[0].title}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* 1. Primary Operational KPI Cards (PRD Section 7.1) */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {/* Card 1: Registered Pool */}
        <Card 
          onClick={() => navigate('/candidates')}
          className="hover:border-[#2563EB]/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3.5">
            <CardTitle className="text-xs font-medium text-[#64748B]">Total Registered</CardTitle>
            <Users className="h-3.5 w-3.5 text-[#64748B]" />
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="text-xl font-bold text-[#142C4E]">{totalRegistered}</div>
            <p className="text-[10px] text-[#64748B] mt-0.5">Verified candidate pool</p>
          </CardContent>
        </Card>

        {/* Card 2: Eligible Candidates */}
        <Card 
          onClick={() => navigate('/eligibility')}
          className="hover:border-[#16845B]/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3.5">
            <CardTitle className="text-xs font-medium text-[#64748B]">Eligible Passed</CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 text-[#16845B]" />
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="text-xl font-bold text-[#16845B]">{kpis.eligible}</div>
            <p className="text-[10px] text-[#16845B] mt-0.5 font-medium flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>Passed hard gates</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Allocated Slots */}
        <Card 
          onClick={() => navigate('/capacity')}
          className="hover:border-[#2563EB]/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3.5">
            <CardTitle className="text-xs font-medium text-[#64748B]">Allocated Slots</CardTitle>
            <Briefcase className="h-3.5 w-3.5 text-[#2563EB]" />
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="text-xl font-bold text-[#2563EB]">
              {kpis.selected} / {currentCompanyObj?.slots || 10}
            </div>
            <p className="text-[10px] text-[#2563EB] mt-0.5 font-medium">Capacity allocated</p>
          </CardContent>
        </Card>

        {/* Card 4: Waitlisted */}
        <Card 
          onClick={() => navigate('/capacity?tab=waitlisted')}
          className="hover:border-slate-400 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3.5">
            <CardTitle className="text-xs font-medium text-[#64748B]">Waitlisted</CardTitle>
            <Hourglass className="h-3.5 w-3.5 text-[#64748B]" />
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="text-xl font-bold text-[#172033]">{kpis.waitlisted}</div>
            <p className="text-[10px] text-[#64748B] mt-0.5">Awaiting slot capacity</p>
          </CardContent>
        </Card>

        {/* Card 5: Interviews Scheduled */}
        <Card 
          onClick={() => navigate('/schedule')}
          className="hover:border-[#2563EB]/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3.5">
            <CardTitle className="text-xs font-medium text-[#64748B]">Scheduled Interviews</CardTitle>
            <Calendar className="h-3.5 w-3.5 text-[#2563EB]" />
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="text-xl font-bold text-[#142C4E]">
              {todaySummary?.totalInterviews || kpis.applications}
            </div>
            <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">
              {todaySummary?.completed || 0} completed &bull; {todaySummary?.inProgress || 0} active
            </p>
          </CardContent>
        </Card>

        {/* Card 6: Conflicts & Approvals */}
        <Card 
          onClick={() => navigate('/approvals')}
          className={`cursor-pointer transition-all hover:shadow-sm ${
            (kpis.openConflicts > 0 || kpis.pendingProposals > 0)
              ? 'border-amber-300 bg-amber-50/20 hover:border-amber-400' 
              : 'hover:border-slate-300'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3.5">
            <CardTitle className="text-xs font-medium text-[#64748B]">Open Conflicts</CardTitle>
            <AlertTriangle className={`h-3.5 w-3.5 ${kpis.openConflicts > 0 ? 'text-[#D97706]' : 'text-[#64748B]'}`} />
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="text-xl font-bold text-[#D97706]">{kpis.openConflicts || 0}</div>
            <p className="text-[10px] text-[#D97706] mt-0.5 font-medium">
              {kpis.pendingProposals || 0} pending 2-key approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Analytical Charts Section (PRD Section 7.2) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Chart 1: Students by Academic Year & Graduation Cohort */}
        <Card className="border-[#E2E8F0] shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[#142C4E] flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#2563EB]" />
                <span>Academic Year & Cohort</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                {totalRegistered} Students
              </Badge>
            </div>
            <CardDescription className="text-xs text-[#64748B]">
              Registered candidate breakdown by year of study & graduation batch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {academicYearData.map((item, idx) => {
              const pct = Math.round((item.count / totalRegistered) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-[#142C4E]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                      {item.academicYear} (Class of {item.graduationYear})
                    </span>
                    <span className="font-mono text-slate-600 font-semibold">{item.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-linear-to-r from-[#2563EB] to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Institution Badge */}
            <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-xs text-[#64748B]">
              <span className="flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-slate-400" />
                <span>Institution:</span>
              </span>
              <span className="font-medium text-[#142C4E] truncate max-w-44 text-right">
                {collegeData[0]?.collegeName || 'National Institute of Technology'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Students by Branch / Department Pipeline */}
        <Card className="border-[#E2E8F0] shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[#142C4E] flex items-center gap-2">
                <GitFork className="w-4 h-4 text-[#16845B]" />
                <span>Department Pipeline</span>
              </CardTitle>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2 h-2 rounded bg-slate-300" /> Reg
                </span>
                <span className="flex items-center gap-1 text-[#16845B]">
                  <span className="w-2 h-2 rounded bg-[#16845B]" /> Elig
                </span>
                <span className="flex items-center gap-1 text-[#2563EB]">
                  <span className="w-2 h-2 rounded bg-[#2563EB]" /> Sel
                </span>
              </div>
            </div>
            <CardDescription className="text-xs text-[#64748B]">
              Registered vs. Passed Eligibility vs. Selected by Engineering Branch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {branchData.map((b, idx) => {
              const regW = Math.round((b.registered / maxBranchRegistered) * 100);
              const eligW = Math.round((b.eligible / maxBranchRegistered) * 100);
              const selW = Math.round((b.selected / maxBranchRegistered) * 100);

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-[#142C4E]">
                    <span className="truncate max-w-40">{b.branch}</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {b.registered}R &bull; <span className="text-[#16845B] font-semibold">{b.eligible}E</span> &bull; <span className="text-[#2563EB] font-semibold">{b.selected}S</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 h-2">
                    <div className="h-full bg-slate-200 rounded-sm" style={{ width: `${regW}%` }} title={`Registered: ${b.registered}`} />
                    <div className="h-full bg-[#16845B] rounded-sm" style={{ width: `${eligW}%` }} title={`Eligible: ${b.eligible}`} />
                    <div className="h-full bg-[#2563EB] rounded-sm" style={{ width: `${selW}%` }} title={`Selected: ${b.selected}`} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Chart 3: Interview Timeline by Time Slot */}
        <Card className="border-[#E2E8F0] shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[#142C4E] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2563EB]" />
                <span>Interview Timeline</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                IST (Asia/Kolkata)
              </Badge>
            </div>
            <CardDescription className="text-xs text-[#64748B]">
              Slots distribution by time window and live execution state
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {timelineData.map((slot, idx) => {
              return (
                <div key={idx} className="p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#142C4E] text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                      {slot.timeSlot}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {slot.total} interview{slot.total > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {slot.delayed > 0 && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                        {slot.delayed} Delayed
                      </Badge>
                    )}
                    {slot.inProgress > 0 && (
                      <Badge variant="warning" className="text-[9px] px-1.5 py-0">
                        {slot.inProgress} Live
                      </Badge>
                    )}
                    {slot.completed > 0 && (
                      <Badge variant="success" className="text-[9px] px-1.5 py-0">
                        {slot.completed} Done
                      </Badge>
                    )}
                    {slot.scheduled > 0 && (
                      <Badge variant="info" className="text-[9px] px-1.5 py-0">
                        {slot.scheduled} Scheduled
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Room & Interviewer Deployment Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
              <span>Deployment:</span>
              <span className="font-medium text-[#142C4E]">
                {kpis.roomUtilization || '2/3 rooms'} &bull; {kpis.interviewerUtilization || '3/4 panellists'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Drive Funnel Progression Strip (PRD Section 7.2) */}
      <Card className="border-[#E2E8F0] shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[#142C4E] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#2563EB]" />
              <span>Placement Drive Operational Funnel</span>
            </CardTitle>
            <span className="text-xs text-[#64748B]">
              Stage-by-stage candidate throughput for {currentCompanyObj?.name || 'Selected Drive'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {/* Step 1: Applied */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">1. Applied</div>
              <div className="text-xl font-bold text-[#142C4E] mt-1">{funnel?.applied || kpis.applications}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">100% pool</div>
            </div>

            {/* Step 2: Eligible */}
            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 text-center">
              <div className="text-[10px] uppercase font-bold text-[#16845B] tracking-wider">2. Eligible</div>
              <div className="text-xl font-bold text-[#16845B] mt-1">{funnel?.eligible || kpis.eligible}</div>
              <div className="text-[10px] text-[#16845B] mt-0.5">
                {Math.round(((funnel?.eligible || kpis.eligible) / Math.max(funnel?.applied || kpis.applications, 1)) * 100)}% passed gates
              </div>
            </div>

            {/* Step 3: Selected */}
            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 text-center">
              <div className="text-[10px] uppercase font-bold text-[#2563EB] tracking-wider">3. Selected</div>
              <div className="text-xl font-bold text-[#2563EB] mt-1">{funnel?.selected || kpis.selected}</div>
              <div className="text-[10px] text-[#2563EB] mt-0.5">Assigned to slots</div>
            </div>

            {/* Step 4: Waitlisted */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">4. Waitlist</div>
              <div className="text-xl font-bold text-slate-700 mt-1">{funnel?.waitlisted || kpis.waitlisted}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Capacity overflow</div>
            </div>

            {/* Step 5: Scheduled */}
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-200 text-center">
              <div className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">5. Scheduled</div>
              <div className="text-xl font-bold text-indigo-700 mt-1">{funnel?.scheduled || todaySummary?.totalInterviews || 4}</div>
              <div className="text-[10px] text-indigo-600 mt-0.5">Published slots</div>
            </div>

            {/* Step 6: Completed */}
            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">6. Completed</div>
              <div className="text-xl font-bold text-emerald-800 mt-1">{funnel?.completed || todaySummary?.completed || 0}</div>
              <div className="text-[10px] text-emerald-700 mt-0.5">Conducted successfully</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Main Operational Split (Candidates Table + Attention Queue) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Left Card: Recent Candidates & Interview Roster (lg:col-span-2) */}
        <Card className="lg:col-span-2 border-[#E2E8F0] shadow-xs">
          <CardHeader className="flex flex-row items-center pb-3">
            <div className="grid gap-1">
              <CardTitle className="text-base font-semibold text-[#142C4E]">
                Candidate Evaluations & Roster
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B]">
                Recent candidates evaluated for {currentCompanyObj?.name || 'Asteria Systems'} across criteria gates and capacity.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/candidates')}
              className="ml-auto gap-1 text-xs"
            >
              <span>View All</span>
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Eligibility</TableHead>
                  <TableHead className="text-right">Match Score</TableHead>
                  <TableHead className="text-right">Selection Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topApplications.map(app => (
                  <TableRow 
                    key={app.id} 
                    className="cursor-pointer hover:bg-slate-50/80"
                    onClick={() => navigate(`/candidates/${app.student.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 text-[11px] font-bold">
                          <AvatarFallback>
                            {app.student.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-xs text-[#142C4E]">{app.student.name}</div>
                          <div className="text-[10px] text-[#64748B] font-mono">{app.student.rollNumber}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-[#64748B]">
                      {app.student.branch}
                    </TableCell>
                    <TableCell>
                      {app.eligibility === 'eligible' && (
                        <Badge variant="success" className="text-[10px]">Eligible</Badge>
                      )}
                      {app.eligibility === 'ineligible' && (
                        <Badge variant="destructive" className="text-[10px]">Ineligible</Badge>
                      )}
                      {app.eligibility === 'pending_verification' && (
                        <Badge variant="warning" className="text-[10px]">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-[#142C4E]">
                      {app.matchScore ? `${app.matchScore}%` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {app.selection === 'selected' && (
                        <Badge variant="info" className="text-[10px]">Selected</Badge>
                      )}
                      {app.selection === 'waitlisted' && (
                        <Badge variant="outline" className="text-[10px] text-slate-700 bg-slate-50">Waitlisted</Badge>
                      )}
                      {app.selection === 'not_selected_this_round' && (
                        <Badge variant="secondary" className="text-[10px]">Not Selected</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right Card: Attention & Activity Feed (lg:col-span-1) */}
        <Card className="border-[#E2E8F0] shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#142C4E] flex items-center justify-between">
              <span>Attention & Activity Feed</span>
              {conflictsData.some(c => c.open > 0) && (
                <Badge variant="destructive" className="text-[10px]">
                  {conflictsData.reduce((acc, c) => acc + c.open, 0)} Urgent
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Active conflicts, delays, and coordinator action items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Attention Item 1: Conflict Proposal */}
            <div 
              onClick={() => navigate('/approvals')}
              className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100/60 transition-colors flex items-start gap-3"
            >
              <div className="p-1.5 rounded-full bg-amber-100 text-[#D97706] shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#142C4E]">Review Pending Recovery Proposal</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Dr. Rao Room B 10:30 AM timetable relocation draft ready.</div>
                <span className="text-[10px] font-semibold text-[#D97706] mt-1 inline-flex items-center gap-1">
                  Open 2-Key Approval &rarr;
                </span>
              </div>
            </div>

            {/* Attention Item 2: Live Ops Delay Tracking */}
            <div 
              onClick={() => navigate('/live')}
              className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100/60 transition-colors flex items-start gap-3"
            >
              <div className="p-1.5 rounded-full bg-blue-100 text-[#2563EB] shrink-0 mt-0.5">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#142C4E]">Room A Execution Monitoring</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">30-min ripple delay active across 2 downstream interviews.</div>
                <span className="text-[10px] font-semibold text-[#2563EB] mt-1 inline-flex items-center gap-1">
                  Inspect Live Ops &rarr;
                </span>
              </div>
            </div>

            {/* Attention Item 3: Criteria Update */}
            <div 
              onClick={() => navigate('/companies')}
              className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-lg cursor-pointer hover:bg-slate-100 transition-colors flex items-start gap-3"
            >
              <div className="p-1.5 rounded-full bg-slate-200 text-[#142C4E] shrink-0 mt-0.5">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#142C4E]">Employer Criteria v2 Active</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Asteria Systems criteria version locked and evaluated.</div>
                <span className="text-[10px] font-semibold text-[#64748B] mt-1 inline-flex items-center gap-1">
                  View Criteria Rules &rarr;
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. End-to-End Placement Lifecycle Strip */}
      <Card className="border-[#E2E8F0] shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-xs uppercase tracking-wider text-[#64748B] font-bold">
              End-to-End Placement Lifecycle Pipeline
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Operational phases from criteria definition to published interview schedules
            </CardDescription>
          </div>
          <span className="text-[11px] text-[#2563EB] font-medium hidden sm:inline">
            Interactive Workflow Map
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
            {pipelineSteps.map((step: any, idx: number) => {
              const isComplete = step.state === 'complete';
              const isAttention = step.state === 'needs_attention';
              const isInProgress = step.state === 'in_progress';

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => navigate(step.route)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all flex flex-col justify-between cursor-pointer ${
                    isAttention
                      ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400'
                      : isInProgress
                        ? 'bg-blue-50/70 border-blue-200 hover:border-blue-400'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                  title={step.detail}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] font-semibold text-slate-400">0{idx + 1}</span>
                    {isComplete && <Check className="w-3.5 h-3.5 text-[#16845B]" />}
                    {isAttention && <AlertCircle className="w-3.5 h-3.5 text-[#D97706]" />}
                    {isInProgress && <Clock className="w-3.5 h-3.5 text-[#2563EB]" />}
                  </div>

                  <div>
                    <div className="font-semibold text-slate-900 leading-snug line-clamp-2 text-[11px]">
                      {step.title}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-1">
                      {step.detail}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
