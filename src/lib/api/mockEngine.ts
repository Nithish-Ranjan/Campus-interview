import type {
  User,
  Student,
  Company,
  StudentApplication,
  Interview,
  RecoveryProposal,
  AuditEntry,
  DisruptionSimulation,
  UserRole
} from './types';
import {
  INITIAL_USERS,
  ROOMS,
  INTERVIEWERS,
  generateSyntheticStudents,
  generateInitialCompanies,
  generateInitialApplications,
  generateInitialSchedule,
  generateInitialAudit,
  PIPELINE_STEPS
} from './mockData';

// In-memory state store for the mock backend
class MockOperationsBackend {
  private users: User[] = [];
  private currentUser: User = INITIAL_USERS[2]!; // Default to Coordinator as main operator
  private students: Student[] = [];
  private companies: Company[] = [];
  private applications: StudentApplication[] = [];
  private publishedSchedule: Interview[] = [];
  private draftSchedule: Interview[] = [];
  private hasOpenDraft: boolean = true;
  private scheduleVersion: number = 1;
  private simulations: DisruptionSimulation[] = [];
  private proposals: RecoveryProposal[] = [];
  private auditEntries: AuditEntry[] = [];
  private listeners: Set<(event: { channel: string; type: string; payload: any }) => void> = new Set();

  constructor() {
    this.resetToInitialState();
  }

  public resetToInitialState() {
    this.users = JSON.parse(JSON.stringify(INITIAL_USERS));
    // Default currentUser to Coordinator
    this.currentUser = this.users.find(u => u.role === 'coordinator') || this.users[0]!;
    this.students = generateSyntheticStudents();
    this.companies = generateInitialCompanies();
    this.applications = generateInitialApplications(this.students, this.companies);
    this.publishedSchedule = generateInitialSchedule(this.students, this.companies);
    this.draftSchedule = JSON.parse(JSON.stringify(this.publishedSchedule));
    this.hasOpenDraft = true;
    this.scheduleVersion = 1;
    this.simulations = [];
    this.proposals = [];
    this.auditEntries = generateInitialAudit();

    // Setup an initial pending proposal for the demo approvals queue
    this.setupInitialProposal();

    this.emit('schedule', 'schedule.reset', { version: 1 });
    this.emit('live:today', 'live.reset', {});
    this.emit('proposals', 'proposals.reset', {});
    this.emit('audit', 'audit.reset', {});
  }

  private setupInitialProposal() {
    const p1: RecoveryProposal = {
      id: 'prop-rec-001',
      title: 'Recovery Proposal #1: Shift Room A Schedule by 30 mins',
      description: 'Mitigates 30-minute delay in interview int-ast-1 (Aarav Sharma) by shifting downstream interviews.',
      createdByUserId: 'user-coord',
      createdByUserName: 'Rishi Nair (Placement Coordinator)',
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      status: 'pending_approval',
      baseScheduleVersion: 1,
      proposedScheduleVersion: 2,
      diffItems: [
        {
          interviewId: 'int-ast-2',
          studentName: 'Priya Patel',
          rollNumber: 'DEMO-0002',
          companyName: 'Asteria Systems',
          before: { room: 'Room A', interviewer: 'Dr. V. Rao', time: '10:00 AM - 10:30 AM IST' },
          after: { room: 'Room A', interviewer: 'Dr. V. Rao', time: '10:30 AM - 11:00 AM IST' },
          hasConflict: false
        },
        {
          interviewId: 'int-ast-3',
          studentName: 'Rohan Verma',
          rollNumber: 'DEMO-0003',
          companyName: 'Asteria Systems',
          before: { room: 'Room A', interviewer: 'Dr. V. Rao', time: '10:30 AM - 11:00 AM IST' },
          after: { room: 'Room A', interviewer: 'Dr. V. Rao', time: '11:00 AM - 11:30 AM IST' },
          hasConflict: false
        }
      ],
      validationChecks: [
        { id: 'vc-1', label: 'Interviewer availability verified', status: 'passed', detail: 'Dr. V. Rao is free in the shifted time windows' },
        { id: 'vc-2', label: 'Room availability verified', status: 'passed', detail: 'Room A is reserved exclusively for Asteria Systems until 1:00 PM' },
        { id: 'vc-3', label: 'Student constraints checked', status: 'passed', detail: 'No candidate has cross-company overlap during the shifted slots' }
      ],
      note: 'Recommended mitigation alternative after Room A interview delayed due to extended technical discussion.'
    };
    this.proposals.push(p1);
  }

  // Realtime subscription helper
  public subscribe(listener: (event: { channel: string; type: string; payload: any }) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(channel: string, type: string, payload: any) {
    this.listeners.forEach(fn => fn({ channel, type, payload }));
  }

  // User and Auth APIs
  public getCurrentUser(): User {
    return this.currentUser;
  }

  public setCurrentUserRole(role: UserRole) {
    const found = this.users.find(u => u.role === role);
    if (found) {
      this.currentUser = found;
      this.emit('me', 'user.updated', this.currentUser);
    }
  }

  public getUsers(): User[] {
    return this.users;
  }

  public updateUserRole(userId: string, role: UserRole): User {
    const u = this.users.find(x => x.id === userId);
    if (!u) throw new Error('User not found');
    u.role = role;
    this.addAudit('user.role_changed', 'auth', { type: 'user', id: u.id, name: u.name }, `Updated role for ${u.name} to ${role}`);
    return u;
  }

  // Overview API
  public getOverview(companyId?: string) {
    const relevantApps = companyId && companyId !== 'all'
      ? this.applications.filter(a => a.companyId === companyId)
      : this.applications;

    const totalApplied = relevantApps.length;
    const eligibleCount = relevantApps.filter(a => a.eligibility === 'eligible').length;
    const selectedCount = relevantApps.filter(a => a.selection === 'selected').length;
    const waitlistedCount = relevantApps.filter(a => a.selection === 'waitlisted').length;
    const ineligibleCount = relevantApps.filter(a => a.eligibility === 'ineligible').length;
    const pendingVerificationCount = relevantApps.filter(a => a.eligibility === 'pending_verification').length;

    const pendingProposalsCount = this.proposals.filter(p => p.status === 'pending_approval').length;

    const attentionItems = [];
    if (pendingProposalsCount > 0) {
      attentionItems.push({
        id: 'att-1',
        type: 'proposal_review',
        label: `Review ${pendingProposalsCount} pending recovery proposal${pendingProposalsCount > 1 ? 's' : ''}`,
        route: '/approvals',
        priority: 'high'
      });
    }

    const delayedInterviews = this.publishedSchedule.filter(i => i.delayMinutes > 0);
    if (delayedInterviews.length > 0) {
      attentionItems.push({
        id: 'att-2',
        type: 'live_delay',
        label: `${delayedInterviews.length} delayed interview active in live tracking`,
        route: '/live',
        priority: 'medium'
      });
    }

    attentionItems.push({
      id: 'att-3',
      type: 'schedule_open',
      label: 'Open published schedule board for Day 1',
      route: '/schedule',
      priority: 'normal'
    });

    return {
      kpis: {
        applications: totalApplied,
        eligible: eligibleCount,
        selected: selectedCount,
        waitlisted: waitlistedCount,
        ineligible: ineligibleCount,
        pendingVerification: pendingVerificationCount
      },
      funnel: {
        applied: totalApplied,
        eligible: eligibleCount,
        selected: selectedCount,
        waitlisted: waitlistedCount
      },
      pipelineSteps: PIPELINE_STEPS,
      attentionItems,
      todaySummary: {
        totalInterviews: this.publishedSchedule.length,
        inProgress: this.publishedSchedule.filter(i => i.status === 'in_progress').length,
        completed: this.publishedSchedule.filter(i => i.status === 'completed').length,
        delayed: delayedInterviews.length,
        scheduled: this.publishedSchedule.filter(i => i.status === 'scheduled').length
      },
      charts: {
        byAcademicYear: [
          { academicYear: '4th Year', graduationYear: 2026, count: 6 },
          { academicYear: '3rd Year', graduationYear: 2027, count: 4 }
        ],
        byBranch: [
          { branch: 'Computer Science', registered: 4, eligible: 3, selected: 2 },
          { branch: 'Electrical Engineering', registered: 2, eligible: 2, selected: 1 },
          { branch: 'Information Technology', registered: 2, eligible: 2, selected: 1 },
          { branch: 'Mechanical Engineering', registered: 2, eligible: 1, selected: 0 }
        ],
        byCollege: [
          { collegeName: 'National Institute of Technology', count: 10 }
        ],
        interviewTimeline: [
          { timeSlot: '09:00 AM', total: 2, scheduled: 2, inProgress: 0, completed: 0, delayed: 0 },
          { timeSlot: '10:00 AM', total: 2, scheduled: 1, inProgress: 1, completed: 0, delayed: 0 },
          { timeSlot: '11:00 AM', total: 2, scheduled: 0, inProgress: 0, completed: 1, delayed: 1 },
          { timeSlot: '02:00 PM', total: 2, scheduled: 2, inProgress: 0, completed: 0, delayed: 0 }
        ],
        conflicts: [
          { type: 'interviewer', count: 1, open: 1, resolved: 0 },
          { type: 'room', count: 0, open: 0, resolved: 0 },
          { type: 'student', count: 0, open: 0, resolved: 0 }
        ]
      }
    };
  }

  // Students & Applications
  public getStudents(params: {
    query?: string;
    branch?: string;
    companyId?: string;
    eligibility?: string;
    selection?: string;
  }) {
    let result = [...this.students];

    if (params.query) {
      const q = params.query.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q));
    }

    if (params.branch && params.branch !== 'all') {
      result = result.filter(s => s.branch === params.branch);
    }

    // Attach student applications
    return result.map(s => {
      const studentApps = this.applications.filter(a => a.studentId === s.id);
      const selectedCompanyApp = params.companyId && params.companyId !== 'all'
        ? studentApps.find(a => a.companyId === params.companyId)
        : studentApps[0];

      return {
        ...s,
        applications: studentApps,
        activeApplication: selectedCompanyApp
      };
    });
  }

  public getStudentById(id: string) {
    const student = this.students.find(s => s.id === id);
    if (!student) return null;
    const apps = this.applications.filter(a => a.studentId === id);
    const interviews = this.publishedSchedule.filter(i => i.studentId === id);
    
    // Check if student has overlapping interviews across companies
    const overlaps = [];
    if (interviews.length > 1) {
      // Check time overlap
      for (let i = 0; i < interviews.length; i++) {
        for (let j = i + 1; j < interviews.length; j++) {
          const a = interviews[i]!;
          const b = interviews[j]!;
          if (a.companyId !== b.companyId) {
            overlaps.push({
              companyA: a.companyName,
              companyB: b.companyName,
              time: '10:00 AM - 10:30 AM IST'
            });
          }
        }
      }
    }

    return {
      student,
      applications: apps,
      interviews,
      overlaps,
      history: this.auditEntries.filter(e => e.entity.id === id || e.summary.includes(student.name))
    };
  }

  // Companies
  public getCompanies(): Company[] {
    return this.companies;
  }

  public getCompanyById(id: string): Company | null {
    return this.companies.find(c => c.id === id) || null;
  }

  public createCompany(data: { name: string; roleTitle: string; roundName: string; slots: number }): Company {
    const newCompany: Company = {
      id: `comp-${Date.now().toString(36)}`,
      name: data.name,
      roleTitle: data.roleTitle,
      roundName: data.roundName || 'Round 1 - Technical Interview',
      status: 'active',
      slots: data.slots || 10,
      criteriaVersion: 1,
      mandatoryCriteria: [
        {
          id: `crit-man-${Date.now()}-1`,
          field: 'cgpa',
          operator: 'gte',
          value: 7.0,
          type: 'mandatory',
          label: 'Minimum CGPA 7.0'
        },
        {
          id: `crit-man-${Date.now()}-2`,
          field: 'backlogs',
          operator: 'eq',
          value: 0,
          type: 'mandatory',
          label: 'Zero Active Backlogs'
        }
      ],
      preferredCriteria: [
        {
          id: `crit-pref-${Date.now()}-1`,
          field: 'skills',
          operator: 'in',
          value: 'Problem Solving',
          type: 'preferred',
          weight: 40,
          label: 'Data Structures & Problem Solving'
        }
      ]
    };
    this.companies.push(newCompany);
    this.addAudit('company.created', 'company', { type: 'company', id: newCompany.id, name: newCompany.name }, `Registered new employer ${newCompany.name} with ${newCompany.slots} slots`);
    return newCompany;
  }

  public updateCompanyCriteria(companyId: string, mandatoryCriteria: any[], preferredCriteria: any[], expectedVersion: number) {
    const comp = this.companies.find(c => c.id === companyId);
    if (!comp) throw new Error('Company not found');
    if (comp.criteriaVersion !== expectedVersion) {
      throw {
        status: 409,
        error: {
          code: 'stale_version',
          message: 'Criteria were modified by another coordinator.',
          requestId: 'REQ-409-STALE'
        }
      };
    }
    comp.mandatoryCriteria = mandatoryCriteria;
    comp.preferredCriteria = preferredCriteria;
    comp.criteriaVersion += 1;

    this.addAudit('company.criteria_updated', 'company', { type: 'company', id: comp.id, name: comp.name }, `Saved criteria version ${comp.criteriaVersion} for ${comp.name}`);
    return comp;
  }

  // Eligibility
  public getEligibilityResults(companyId: string, statusFilter?: string) {
    let apps = this.applications.filter(a => a.companyId === companyId);
    if (statusFilter && statusFilter !== 'all') {
      apps = apps.filter(a => a.eligibility === statusFilter);
    }
    return apps;
  }

  public getApplicationExplanation(applicationId: string) {
    const app = this.applications.find(a => a.id === applicationId);
    return app?.explanation || null;
  }

  // Capacity
  public getCompanyCapacity(companyId: string) {
    const comp = this.companies.find(c => c.id === companyId);
    if (!comp) return null;
    const apps = this.applications.filter(a => a.companyId === companyId && a.eligibility === 'eligible');
    const selected = apps.filter(a => a.selection === 'selected');
    const waitlisted = apps.filter(a => a.selection === 'waitlisted');
    const ineligible = this.applications.filter(a => a.companyId === companyId && a.eligibility === 'ineligible');

    return {
      company: comp,
      totalEligible: apps.length,
      slots: comp.slots,
      selectedCount: selected.length,
      waitlistedCount: waitlisted.length,
      ineligibleCount: ineligible.length,
      selected,
      waitlisted
    };
  }

  public runCapacityAllocation(companyId: string, newSlots?: number) {
    const comp = this.companies.find(c => c.id === companyId);
    if (!comp) throw new Error('Company not found');
    if (typeof newSlots === 'number') {
      comp.slots = newSlots;
    }

    const apps = this.applications.filter(a => a.companyId === companyId && a.eligibility === 'eligible');
    // Sort by match score descending
    apps.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    apps.forEach((app, idx) => {
      const isSelected = idx < comp.slots;
      app.selection = isSelected ? 'selected' : 'waitlisted';
      app.rank = idx + 1;
      app.waitlistPosition = isSelected ? undefined : idx + 1 - comp.slots;
      app.selectionReason = isSelected 
        ? `Ranked ${idx + 1} of ${apps.length} by match score; awarded slot ${idx + 1} of ${comp.slots}`
        : `Ranked ${idx + 1} of ${apps.length} by match score; waitlist position #${app.waitlistPosition} (capacity ${comp.slots})`;
    });

    this.addAudit('capacity.allocation_executed', 'capacity', { type: 'company', id: comp.id, name: comp.name }, `Re-allocated capacity: ${comp.slots} slots for ${comp.name}`);
    return this.getCompanyCapacity(companyId);
  }

  // Schedule & Moves
  public getSchedule(mode: 'published' | 'draft' | 'simulation') {
    if (mode === 'draft') {
      return { version: this.scheduleVersion, interviews: this.draftSchedule, hasDraft: this.hasOpenDraft };
    }
    return { version: this.scheduleVersion, interviews: this.publishedSchedule };
  }

  public moveInterviewDraft(interviewId: string, targetRoomId: string, targetStart: string) {
    const item = this.draftSchedule.find(i => i.id === interviewId);
    if (!item) throw new Error('Interview not found');

    // Check for the prepared clash:
    // If target interviewer is Dr. V. Rao at 10:30 AM in Room B, throw 409 conflict!
    const targetDate = new Date(targetStart);
    const targetHours = targetDate.getHours();
    const targetMins = targetDate.getMinutes();

    const isClashTime = (targetHours === 10 && targetMins === 30);
    const isDrRaoInterview = item.interviewerNames.includes('Dr. V. Rao');

    if (isClashTime && (targetRoomId === 'room-b' || isDrRaoInterview)) {
      throw {
        status: 409,
        error: {
          code: 'schedule_conflict',
          message: 'Schedule conflict detected',
          details: {
            conflicts: [
              {
                type: 'interviewer',
                resource: 'Dr. V. Rao',
                timeRange: '10:30 AM - 11:00 AM IST',
                counterpart: 'Harbor Analytics Interview (Room B, Ananya Sen)',
                message: 'Dr. V. Rao is booked 10:30 AM to 11:00 AM IST for Harbor Analytics in Room B.'
              }
            ]
          },
          requestId: 'REQ-SCH-409'
        }
      };
    }

    // Otherwise success: move it!
    const room = ROOMS.find(r => r.id === targetRoomId);
    item.roomId = targetRoomId;
    if (room) item.roomName = room.name;
    item.scheduledStart = targetStart;
    const dur = 30 * 60000;
    item.scheduledEnd = new Date(new Date(targetStart).getTime() + dur).toISOString();
    item.hasMoved = true;

    this.emit('schedule', 'interview.moved', item);
    return item;
  }

  public submitDraftForApproval(note: string) {
    const proposal: RecoveryProposal = {
      id: `prop-draft-${Date.now()}`,
      title: 'Schedule Draft Revision Proposal',
      description: 'Submitted schedule draft with manual slot relocations.',
      createdByUserId: this.currentUser.id,
      createdByUserName: `${this.currentUser.name} (${this.currentUser.role})`,
      createdAt: new Date().toISOString(),
      status: 'pending_approval',
      baseScheduleVersion: this.scheduleVersion,
      proposedScheduleVersion: this.scheduleVersion + 1,
      diffItems: [
        {
          interviewId: 'int-ast-2',
          studentName: 'Priya Patel',
          rollNumber: 'DEMO-0002',
          companyName: 'Asteria Systems',
          before: { room: 'Room A', interviewer: 'Dr. V. Rao', time: '10:00 AM - 10:30 AM IST' },
          after: { room: 'Room A', interviewer: 'Dr. V. Rao', time: '11:30 AM - 12:00 PM IST' },
          hasConflict: false
        }
      ],
      validationChecks: [
        { id: 'vc-1', label: 'All interviewers available', status: 'passed', detail: 'No overlaps detected in verified calendar' },
        { id: 'vc-2', label: 'All rooms unblocked', status: 'passed', detail: 'Rooms confirmed available' },
        { id: 'vc-3', label: 'Student limits respected', status: 'passed', detail: 'No double booking for candidates' }
      ],
      note
    };

    this.proposals.unshift(proposal);
    this.addAudit('schedule.draft_submitted', 'schedule', { type: 'proposal', id: proposal.id, name: proposal.title }, `Submitted schedule draft proposal #${proposal.id}`);
    this.emit('proposals', 'proposal.created', proposal);
    return proposal;
  }

  // Live Operations
  public getLiveOperations() {
    return {
      date: new Date().toISOString(),
      rooms: ROOMS.map(room => {
        const roomInterviews = this.publishedSchedule.filter(i => i.roomId === room.id);
        const current = roomInterviews.find(i => i.status === 'in_progress') || roomInterviews[0];
        const next = roomInterviews.find(i => i.status === 'scheduled' && i.id !== current?.id);

        return {
          room,
          currentInterview: current,
          nextInterview: next,
          allInterviews: roomInterviews
        };
      })
    };
  }

  public updateInterviewStatus(interviewId: string, newStatus: any) {
    const item = this.publishedSchedule.find(i => i.id === interviewId);
    if (!item) throw new Error('Interview not found');

    item.status = newStatus;
    if (newStatus === 'in_progress' && !item.actualStart) {
      item.actualStart = new Date().toISOString();
      item.allowedActions = ['complete', 'mark_delayed'];
    } else if (newStatus === 'completed') {
      item.actualEnd = new Date().toISOString();
      item.allowedActions = [];
    }

    this.addAudit('live.status_updated', 'live', { type: 'interview', id: item.id, name: `${item.studentName} (${item.companyName})` }, `Updated interview status to ${newStatus}`);
    this.emit('live:today', 'interview.status_changed', item);
    return item;
  }

  public markInterviewDelayed(interviewId: string, delayMinutes: number, reason: string) {
    const item = this.publishedSchedule.find(i => i.id === interviewId);
    if (!item) throw new Error('Interview not found');

    item.delayMinutes = delayMinutes;
    item.delayReason = reason;

    // Update downstream interviews in the same room with estimated starts!
    const roomInterviews = this.publishedSchedule.filter(i => i.roomId === item.roomId);
    roomInterviews.forEach(downstream => {
      if (downstream.id !== item.id && downstream.status === 'scheduled') {
        const origStart = new Date(downstream.scheduledStart);
        const estimatedStart = new Date(origStart.getTime() + delayMinutes * 60000);
        const estimatedEnd = new Date(new Date(downstream.scheduledEnd).getTime() + delayMinutes * 60000);
        downstream.estimatedStart = estimatedStart.toISOString();
        downstream.estimatedEnd = estimatedEnd.toISOString();
      }
    });

    this.addAudit('live.delay_recorded', 'live', { type: 'interview', id: item.id, name: `${item.studentName} (${item.companyName})` }, `Recorded ${delayMinutes} min delay. Reason: ${reason}`);
    this.emit('live:today', 'interview.delayed', { interviewId, delayMinutes, downstream: roomInterviews });
    return item;
  }

  // Disruption Simulation & Recovery
  public runSimulation(disruptionType: string, targetId: string, delayMinutes: number = 30): DisruptionSimulation {
    const delayedInt = this.publishedSchedule.find(i => i.id === targetId) || this.publishedSchedule[0]!;

    const sim: DisruptionSimulation = {
      id: `sim-${Date.now()}`,
      type: 'interview_delay',
      targetId: delayedInt.id,
      targetName: `${delayedInt.studentName} - Room A`,
      delayMinutes,
      impactSummary: {
        interviewsAffected: 2,
        studentsAffected: 2,
        conflictsCreated: 0,
        interviewsWithNoSlot: 0
      },
      affectedInterviews: [
        {
          interviewId: 'int-ast-2',
          studentName: 'Priya Patel',
          companyName: 'Asteria Systems',
          beforeTime: '10:00 AM IST',
          estimatedAfterTime: '10:30 AM IST (+30 min)',
          reason: 'Downstream delay ripple in Room A'
        },
        {
          interviewId: 'int-ast-3',
          studentName: 'Rohan Verma',
          companyName: 'Asteria Systems',
          beforeTime: '10:30 AM IST',
          estimatedAfterTime: '11:00 AM IST (+30 min)',
          reason: 'Downstream delay ripple in Room A'
        }
      ],
      alternatives: [
        {
          id: 'alt-valid-1',
          title: 'Alternative 1: Shift downstream Room A interviews by 30 mins (Recommended)',
          description: 'Keeps all interviews in Room A with Dr. V. Rao, shifting start times later by 30 minutes.',
          isValid: true,
          blockers: [],
          changesSummary: 'Shifts 2 interviews later; 0 room changes; 0 conflicts',
          affectedInterviewsCount: 2,
          scheduleShifts: [
            {
              interviewId: 'int-ast-2',
              studentName: 'Priya Patel',
              companyName: 'Asteria Systems',
              beforeTime: '10:00 AM - 10:30 AM IST',
              afterTime: '10:30 AM - 11:00 AM IST',
              roomName: 'Room A'
            },
            {
              interviewId: 'int-ast-3',
              studentName: 'Rohan Verma',
              companyName: 'Asteria Systems',
              beforeTime: '10:30 AM - 11:00 AM IST',
              afterTime: '11:00 AM - 11:30 AM IST',
              roomName: 'Room A'
            }
          ]
        },
        {
          id: 'alt-invalid-2',
          title: 'Alternative 2: Reroute delayed interviews to Room C (Invalid)',
          description: 'Attempts to absorb delay by moving remaining Room A interviews immediately to Room C.',
          isValid: false,
          blockers: [
            'Room C is booked by Harbor Analytics from 10:30 AM to 11:30 AM IST for Data Analyst assessments.'
          ],
          changesSummary: 'Cannot execute: Room C booking conflict with Harbor Analytics',
          affectedInterviewsCount: 2,
          scheduleShifts: []
        }
      ],
      createdAt: new Date().toISOString()
    };

    this.simulations.unshift(sim);
    return sim;
  }

  public createProposalFromAlternative(simulationId: string, alternativeId: string, note: string) {
    const sim = this.simulations.find(s => s.id === simulationId);
    if (!sim) throw new Error('Simulation not found');
    const alt = sim.alternatives.find(a => a.id === alternativeId);
    if (!alt || !alt.isValid) throw new Error('Cannot create proposal from an invalid alternative');

    const proposal: RecoveryProposal = {
      id: `prop-rec-${Date.now()}`,
      title: `Recovery Proposal: ${alt.title}`,
      description: alt.description,
      createdByUserId: this.currentUser.id,
      createdByUserName: `${this.currentUser.name} (${this.currentUser.role})`,
      createdAt: new Date().toISOString(),
      status: 'pending_approval',
      simulationId: sim.id,
      baseScheduleVersion: this.scheduleVersion,
      proposedScheduleVersion: this.scheduleVersion + 1,
      diffItems: alt.scheduleShifts.map(s => ({
        interviewId: s.interviewId,
        studentName: s.studentName,
        rollNumber: 'DEMO-0002',
        companyName: s.companyName,
        before: { room: s.roomName, interviewer: 'Dr. V. Rao', time: s.beforeTime },
        after: { room: s.roomName, interviewer: 'Dr. V. Rao', time: s.afterTime },
        hasConflict: false
      })),
      validationChecks: [
        { id: 'vc-1', label: 'Dr. V. Rao availability verified', status: 'passed', detail: 'Free from 10:30 AM to 12:00 PM IST' },
        { id: 'vc-2', label: 'Room A availability confirmed', status: 'passed', detail: 'Reserved through 1:00 PM IST' },
        { id: 'vc-3', label: 'Candidate availability confirmed', status: 'passed', detail: 'No competing interview commitments' }
      ],
      note
    };

    this.proposals.unshift(proposal);
    this.addAudit('recovery.proposal_created', 'recovery', { type: 'proposal', id: proposal.id, name: proposal.title }, `Created recovery proposal #${proposal.id} from simulation ${sim.id}`);
    this.emit('proposals', 'proposal.created', proposal);
    return proposal;
  }

  // Proposals & Approvals
  public getProposals(): RecoveryProposal[] {
    return this.proposals;
  }

  public getProposalById(id: string): RecoveryProposal | null {
    return this.proposals.find(p => p.id === id) || null;
  }

  public decideProposal(proposalId: string, decision: 'approve' | 'reject', note?: string) {
    const prop = this.proposals.find(p => p.id === proposalId);
    if (!prop) throw new Error('Proposal not found');

    // Rule: Separation of duties (AC-APR): creator cannot approve their own proposal!
    if (prop.createdByUserId === this.currentUser.id && decision === 'approve') {
      throw {
        status: 403,
        error: {
          code: 'self_approval',
          message: 'Separation of duties: you created this proposal and cannot approve or reject it.',
          requestId: 'REQ-403-SELF'
        }
      };
    }

    if (this.currentUser.role !== 'admin' && this.currentUser.role !== 'officer') {
      throw {
        status: 403,
        error: {
          code: 'insufficient_role',
          message: 'Only Placement Officers and Administrators can approve proposals.',
          requestId: 'REQ-403-ROLE'
        }
      };
    }

    prop.status = decision === 'approve' ? 'approved' : 'rejected';
    prop.decidedBy = `${this.currentUser.name} (${this.currentUser.role})`;
    prop.decidedAt = new Date().toISOString();
    prop.decisionNote = note;

    if (decision === 'approve') {
      this.scheduleVersion += 1;
      // Apply diff to published schedule
      prop.diffItems.forEach(diff => {
        const int = this.publishedSchedule.find(i => i.id === diff.interviewId);
        if (int) {
          int.scheduledStart = new Date(new Date().setHours(10, 30, 0, 0)).toISOString();
          int.scheduledEnd = new Date(new Date().setHours(11, 0, 0, 0)).toISOString();
          int.hasMoved = true;
        }
      });

      this.addAudit(
        'proposal.approved',
        'approval',
        { type: 'proposal', id: prop.id, name: prop.title },
        `Approved proposal #${prop.id}. Published new Schedule Version ${this.scheduleVersion}. Note: ${note || 'None'}`
      );
      this.emit('schedule', 'schedule.published', { version: this.scheduleVersion });
    } else {
      this.addAudit(
        'proposal.rejected',
        'approval',
        { type: 'proposal', id: prop.id, name: prop.title },
        `Rejected proposal #${prop.id}. Note: ${note || 'None'}`
      );
    }

    this.emit('proposals', 'proposal.decided', prop);
    return prop;
  }

  // Audit
  public getAudit(limit: number = 50): AuditEntry[] {
    return this.auditEntries.slice(0, limit);
  }

  private addAudit(action: string, category: any, entity: any, summary: string) {
    const entry: AuditEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actor: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        role: this.currentUser.role
      },
      action,
      category,
      entity,
      summary
    };
    this.auditEntries.unshift(entry);
    this.emit('audit', 'audit.entry_created', entry);
  }
}

export const mockBackend = new MockOperationsBackend();
