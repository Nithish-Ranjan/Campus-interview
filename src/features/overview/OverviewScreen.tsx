import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  Hourglass, 
  ShieldX, 
  Clock, 
  ArrowRight, 
  Check, 
  AlertCircle,
  Calendar,
  Layers,
  Activity,
  DoorOpen,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ExternalLink
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

  const selectedCompany = searchParams.get('company') || 'comp-asteria'; // Default to Asteria Systems

  const [companies, setCompanies] = useState<Company[]>([]);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [topApplications, setTopApplications] = useState<StudentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      apiClient.getCompanies(),
      apiClient.getOverview(selectedCompany),
      apiClient.getEligibility(selectedCompany, 'all')
    ]).then(([comps, data, apps]) => {
      setCompanies(comps);
      setOverviewData(data);
      setTopApplications(apps.slice(0, 6));
    }).finally(() => {
      setIsLoading(false);
    });
  }, [selectedCompany]);

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
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <div className="h-28 bg-slate-200/80 rounded-xl" />
          <div className="h-28 bg-slate-200/80 rounded-xl" />
          <div className="h-28 bg-slate-200/80 rounded-xl" />
          <div className="h-28 bg-slate-200/80 rounded-xl" />
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-2 h-80 bg-slate-200/80 rounded-xl" />
          <div className="h-80 bg-slate-200/80 rounded-xl" />
        </div>
      </div>
    );
  }

  const { kpis, funnel, pipelineSteps, attentionItems, todaySummary } = overviewData;
  const currentCompanyObj = companies.find(c => c.id === selectedCompany);

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

        <div className="flex items-center gap-2">
          {attentionItems[0] && (
            <Button
              variant="navy"
              size="sm"
              onClick={() => navigate(attentionItems[0].route)}
              className="w-full sm:w-auto gap-1.5"
            >
              <span>{attentionItems[0].label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* 1. Iconic Shadcn Dashboard 01 KPI Cards (grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4) */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
        {/* Card 1: Total Applicants */}
        <Card 
          onClick={() => navigate('/candidates')}
          className="hover:border-[#2563EB]/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#64748B]">
              Total Applicants
            </CardTitle>
            <Users className="h-4 w-4 text-[#64748B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#142C4E] tracking-tight">
              {kpis.applications}
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              +100% verified application pool
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Eligible Candidates */}
        <Card 
          onClick={() => navigate('/eligibility')}
          className="hover:border-[#16845B]/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#64748B]">
              Eligible Candidates
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-[#16845B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#16845B] tracking-tight">
              {kpis.eligible}
            </div>
            <p className="text-xs text-[#16845B] mt-1 font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>100% passed mandatory criteria</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Interview Slots Allocated */}
        <Card 
          onClick={() => navigate('/capacity')}
          className="hover:border-[#2563EB]/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#64748B]">
              Allocated Interview Slots
            </CardTitle>
            <Calendar className="h-4 w-4 text-[#2563EB]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2563EB] tracking-tight">
              {kpis.selected} / {currentCompanyObj?.slots || 10}
            </div>
            <p className="text-xs text-[#2563EB] mt-1 font-medium">
              100% capacity filled (Round 1)
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Waitlisted (Capacity Limit) */}
        <Card 
          onClick={() => navigate('/capacity?tab=waitlisted')}
          className="hover:border-slate-400 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#64748B]">
              Waitlisted (Capacity Limit)
            </CardTitle>
            <Hourglass className="h-4 w-4 text-[#64748B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#172033] tracking-tight">
              {kpis.waitlisted}
            </div>
            <p className="text-xs text-[#64748B] mt-1 font-medium">
              Eligible students awaiting slots
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Iconic Shadcn Dashboard 01 Main Grid (grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3) */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Left Card: Recent Candidates & Interview Roster (xl:col-span-2) */}
        <Card className="xl:col-span-2 border-[#E2E8F0] shadow-xs">
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
                      {app.matchScore}%
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

        {/* Right Card: Recent Operational Activity & Attention Queue (xl:col-span-1) */}
        <Card className="border-[#E2E8F0] shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#142C4E] flex items-center justify-between">
              <span>Attention & Activity Feed</span>
              {attentionItems.length > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {attentionItems.length} Urgent
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Active conflicts, delays, and coordinator action items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

      {/* 3. Secondary Section: End-to-End Placement Lifecycle Strip */}
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
