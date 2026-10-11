export const TYPES_LOADED = true;
export type UserRole = 'admin' | 'officer' | 'coordinator' | 'panel_coordinator' | 'student' | 'observer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedPanels?: string[]; // e.g. ['Room A']
  environment: 'production' | 'demo';
  studentId?: string;
}

export type EligibilityStatus = 'eligible' | 'ineligible' | 'pending_verification';
export type SelectionStatus = 'selected' | 'waitlisted' | 'not_selected_this_round';
export type InterviewStatus = 
  | 'scheduled' 
  | 'checked_in' 
  | 'in_progress' 
  | 'completed' 
  | 'delayed' 
  | 'no_show' 
  | 'cancelled';

export type ConflictType = 'interviewer' | 'room' | 'student' | 'cross_company_student';

export interface ScheduleConflict {
  id?: string;
  interviewId?: string;
  counterpartInterviewId?: string;
  type: ConflictType;
  resource: string;
  timeRange: string;
  counterpart: string;
  message: string;
  severity?: string;
}

export type ProposalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'stale';
export type ScheduleMode = 'published' | 'draft' | 'simulation';

export interface PipelineStep {
  id: string;
  title: string;
  route: string;
  state: 'complete' | 'in_progress' | 'needs_attention' | 'blocked';
  detail: string;
}

export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  branch: string;
  cgpa: number;
  backlogs: number;
  skills: string[];
  email?: string;
  phone?: string;
  academicVerified: {
    cgpa: boolean;
    backlogs: boolean;
    branch: boolean;
    skills: boolean;
  };
}

export interface Criterion {
  id: string;
  field: string;
  operator: 'gte' | 'lte' | 'eq' | 'in' | 'min' | 'max';
  value: string | number | string[];
  type: 'mandatory' | 'preferred';
  weight?: number; // for preferred
  label: string;
}

export interface Company {
  id: string;
  name: string;
  roleTitle: string;
  roundName: string;
  status: 'active' | 'evaluating' | 'scheduled' | 'completed';
  criteriaVersion: number;
  slots: number;
  mandatoryCriteria: Criterion[];
  preferredCriteria: Criterion[];
}

export interface StudentApplication {
  id: string;
  studentId: string;
  student: Student;
  companyId: string;
  companyName: string;
  eligibility: EligibilityStatus;
  matchScore: number | null; // e.g. 85 (or null if not scored)
  selection: SelectionStatus;
  rank?: number;
  waitlistPosition?: number;
  criteriaSummary: {
    passed: number;
    total: number;
  };
  selectionReason: string;
  explanation?: ApplicationExplanation;
}

export interface MandatoryCheckResult {
  name: string;
  requiredValue: string;
  actualValue: string;
  result: 'pass' | 'fail' | 'pending';
  isVerified: boolean;
}

export interface PreferredCheckResult {
  name: string;
  weight: number;
  matched: boolean;
  pointsContributed: number;
}

export interface ApplicationExplanation {
  applicationId: string;
  studentId: string;
  companyId: string;
  evaluatedAt: string;
  criteriaVersion: number;
  stale: boolean;
  mandatoryResults: MandatoryCheckResult[];
  preferredResults: PreferredCheckResult[];
  totalScore: number | null;
  selectionReason: string;
  capacityAllocated: number;
  rankInRound: number;
}

export interface Interview {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  companyId: string;
  companyName: string;
  roomId: string;
  roomName: string;
  interviewerIds: string[];
  interviewerNames: string[];
  scheduledStart: string; // ISO string
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  estimatedStart?: string; // Estimated downstream start if delayed
  estimatedEnd?: string;
  status: InterviewStatus;
  delayMinutes: number;
  delayReason?: string;
  allowedActions: ('check_in' | 'start' | 'complete' | 'mark_delayed' | 'no_show' | 'cancel')[];
  conflicts?: ScheduleConflict[];
  hasMoved?: boolean;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
}

export interface Interviewer {
  id: string;
  name: string;
  department: string;
}

export interface RecoveryAlternative {
  id: string;
  title: string;
  description: string;
  isValid: boolean;
  blockers?: string[];
  changesSummary: string;
  affectedInterviewsCount: number;
  scheduleShifts: {
    interviewId: string;
    studentName: string;
    companyName: string;
    beforeTime: string;
    afterTime: string;
    roomName: string;
  }[];
}

export interface DisruptionSimulation {
  id: string;
  type: 'interview_delay' | 'interviewer_unavailable' | 'room_unavailable';
  targetId: string;
  targetName: string;
  delayMinutes?: number;
  timeRange?: {
    start: string;
    end: string;
  };
  impactSummary: {
    interviewsAffected: number;
    studentsAffected: number;
    conflictsCreated: number;
    interviewsWithNoSlot: number;
  };
  affectedInterviews: {
    interviewId: string;
    studentName: string;
    companyName: string;
    beforeTime: string;
    estimatedAfterTime: string;
    reason: string;
  }[];
  alternatives: RecoveryAlternative[];
  createdAt: string;
}

export interface ProposalDiffItem {
  interviewId: string;
  studentName: string;
  rollNumber: string;
  companyName: string;
  before: {
    room: string;
    interviewer: string;
    time: string;
  };
  after: {
    room: string;
    interviewer: string;
    time: string;
  };
  hasConflict: boolean;
}

export interface ValidationCheck {
  id: string;
  label: string;
  status: 'passed' | 'warning' | 'failed';
  detail: string;
}

export interface RecoveryProposal {
  id: string;
  title: string;
  description: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  status: ProposalStatus;
  simulationId?: string;
  baseScheduleVersion: number;
  proposedScheduleVersion: number;
  diffItems: ProposalDiffItem[];
  validationChecks: ValidationCheck[];
  note?: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
  isStale?: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: UserRole;
  };
  action: string;
  category: 'company' | 'eligibility' | 'capacity' | 'schedule' | 'live' | 'recovery' | 'approval' | 'auth';
  entity: {
    type: string;
    id: string;
    name: string;
  };
  summary: string;
  details?: {
    diff?: {
      field: string;
      before: string | number | null;
      after: string | number | null;
    }[];
    metadata?: Record<string, any>;
  };
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: {
      fieldErrors?: Record<string, string>;
      conflicts?: ScheduleConflict[];
      [key: string]: any;
    };
    requestId: string;
  };
}

export interface StudentProfileData {
  student: Student & {
    academicYear?: string;
    graduationYear?: number;
    collegeName?: string;
    resumeUrl?: string;
    resumeFileName?: string;
    resumeUploadedAt?: string;
    resumeParseStatus?: string;
    parsedResume?: any;
  };
  applications: StudentApplication[];
  interviews: Array<{
    id: string;
    scheduledStart: string;
    scheduledEnd: string;
    estimatedStart?: string;
    estimatedEnd?: string;
    status: InterviewStatus;
    delayMinutes?: number;
    delayReason?: string;
    companyName: string;
    roleTitle?: string;
    roomName: string;
    building?: string;
    panellists?: string[];
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

export interface MatchReport {
  studentId: string;
  companyId: string;
  companyName: string;
  roleTitle: string;
  eligibility: 'eligible' | 'ineligible';
  mandatoryPassed: boolean;
  mandatoryReasons: string[];
  matchScore: number;
  matchingSkills: Array<{ skill: string; evidence: string }>;
  missingSkills: string[];
  relevantProjects: Array<{ title: string; relevance: string }>;
  preparationSuggestions: string[];
  limitations: string;
  advisoryDisclaimer?: string;
  confidence?: string;
  isAiGenerated: boolean;
  modelUsed: string;
  evaluatedAt: string;
}
