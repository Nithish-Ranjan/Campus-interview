export type ConflictType = 'interviewer' | 'room' | 'student' | 'cross_company_student';

export interface ValidatableSlot {
  id: string;
  studentId: string;
  studentName?: string;
  rollNumber?: string;
  companyId: string;
  companyName?: string;
  roomId: string;
  roomName?: string;
  scheduledStart: string | Date;
  scheduledEnd: string | Date;
  status: string;
  interviewerIds: string[];
  interviewerNames?: string[];
}

export interface ScheduleConflict {
  id: string;
  interviewId: string;
  counterpartInterviewId?: string;
  type: ConflictType;
  resource: string;
  timeRange: string;
  counterpart: string;
  message: string;
  severity: 'critical' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  conflicts: ScheduleConflict[];
  conflictCount: number;
  conflictsBySlotId: Record<string, ScheduleConflict[]>;
}

export interface RecoveryProposalDiffItem {
  interviewId: string;
  studentName: string;
  rollNumber: string;
  companyName: string;
  before: {
    room: string;
    roomId?: string;
    interviewer: string;
    time: string;
    start?: string;
    end?: string;
  };
  after: {
    room: string;
    roomId?: string;
    interviewer: string;
    time: string;
    start?: string;
    end?: string;
  };
  hasConflict: boolean;
}

export interface RecoveryValidationCheck {
  id: string;
  label: string;
  status: 'passed' | 'warning' | 'failed';
  detail: string;
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
    roomId: string;
    newStart: string;
    newEnd: string;
  }[];
}
