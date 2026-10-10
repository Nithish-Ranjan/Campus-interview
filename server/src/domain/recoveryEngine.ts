import {
  ValidatableSlot,
  RecoveryAlternative,
  RecoveryProposalDiffItem,
  RecoveryValidationCheck
} from './types.js';
import { validateScheduleSlots, formatTimeRangeIST } from './validator.js';

export interface DisruptionSimulationResult {
  id: string;
  type: string;
  targetId: string;
  targetName: string;
  delayMinutes: number;
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

/**
 * Deterministic Recovery Engine
 * Models disruption scenarios, evaluates alternative slot allocations,
 * and rigorously revalidates every constraint without guesswork.
 */
export function simulateDisruption(
  currentSlots: ValidatableSlot[],
  allRooms: { id: string; name: string }[],
  disruptionType: string,
  targetSlotId: string,
  delayMinutes: number = 30
): DisruptionSimulationResult {
  const targetSlot = currentSlots.find(s => s.id === targetSlotId);
  if (!targetSlot) {
    throw new Error(`Target interview slot ${targetSlotId} not found in schedule.`);
  }

  const delayMs = delayMinutes * 60 * 1000;
  const targetStart = new Date(targetSlot.scheduledStart);

  // Identify downstream interviews in the same room scheduled to start after or at the target
  const downstreamSameRoom = currentSlots.filter(s =>
    s.id !== targetSlot.id &&
    s.roomId === targetSlot.roomId &&
    s.status === 'scheduled' &&
    new Date(s.scheduledStart).getTime() >= targetStart.getTime()
  );

  const affectedInterviews = [
    {
      interviewId: targetSlot.id,
      studentName: targetSlot.studentName || targetSlot.studentId,
      companyName: targetSlot.companyName || targetSlot.companyId,
      beforeTime: formatTimeRangeIST(targetSlot.scheduledStart, targetSlot.scheduledEnd),
      estimatedAfterTime: formatTimeRangeIST(
        new Date(new Date(targetSlot.scheduledStart).getTime() + delayMs),
        new Date(new Date(targetSlot.scheduledEnd).getTime() + delayMs)
      ),
      reason: `Primary delayed interview (+${delayMinutes} mins)`
    },
    ...downstreamSameRoom.map(downstream => ({
      interviewId: downstream.id,
      studentName: downstream.studentName || downstream.studentId,
      companyName: downstream.companyName || downstream.companyId,
      beforeTime: formatTimeRangeIST(downstream.scheduledStart, downstream.scheduledEnd),
      estimatedAfterTime: formatTimeRangeIST(
        new Date(new Date(downstream.scheduledStart).getTime() + delayMs),
        new Date(new Date(downstream.scheduledEnd).getTime() + delayMs)
      ),
      reason: `Downstream delay ripple in ${targetSlot.roomName || targetSlot.roomId}`
    }))
  ];

  const alternatives: RecoveryAlternative[] = [];

  // =========================================================================
  // Alternative 1: Shift downstream interviews in the SAME room by delay delta
  // =========================================================================
  const alt1Slots: ValidatableSlot[] = currentSlots.map(s => {
    if (s.id === targetSlot.id || downstreamSameRoom.some(d => d.id === s.id)) {
      const newStart = new Date(new Date(s.scheduledStart).getTime() + delayMs);
      const newEnd = new Date(new Date(s.scheduledEnd).getTime() + delayMs);
      return {
        ...s,
        scheduledStart: newStart.toISOString(),
        scheduledEnd: newEnd.toISOString()
      };
    }
    return { ...s };
  });

  const alt1Validation = validateScheduleSlots(alt1Slots);
  const alt1Shifts = downstreamSameRoom.map(d => {
    const origStart = new Date(d.scheduledStart);
    const origEnd = new Date(d.scheduledEnd);
    const newStart = new Date(origStart.getTime() + delayMs);
    const newEnd = new Date(origEnd.getTime() + delayMs);
    return {
      interviewId: d.id,
      studentName: d.studentName || d.studentId,
      companyName: d.companyName || d.companyId,
      beforeTime: formatTimeRangeIST(origStart, origEnd),
      afterTime: formatTimeRangeIST(newStart, newEnd),
      roomName: d.roomName || d.roomId,
      roomId: d.roomId,
      newStart: newStart.toISOString(),
      newEnd: newEnd.toISOString()
    };
  });

  alternatives.push({
    id: 'alt-shift-same-room',
    title: `Alternative 1: Shift downstream ${targetSlot.roomName || 'Room'} interviews by ${delayMinutes} mins (Recommended)`,
    description: `Maintains room assignment in ${targetSlot.roomName || 'Room'}, moving downstream start times later by ${delayMinutes} minutes to absorb delay.`,
    isValid: alt1Validation.isValid,
    blockers: alt1Validation.isValid
      ? []
      : alt1Validation.conflicts.map(c => `${c.type.toUpperCase()} Conflict: ${c.message}`),
    changesSummary: `Shifts ${alt1Shifts.length} downstream interview(s) later; 0 room transfers; ${alt1Validation.conflictCount} conflict(s).`,
    affectedInterviewsCount: alt1Shifts.length,
    scheduleShifts: alt1Shifts
  });

  // =========================================================================
  // Alternative 2: Reroute delayed downstream interview to an alternate room
  // =========================================================================
  const otherRooms = allRooms.filter(r => r.id !== targetSlot.roomId);
  for (const altRoom of otherRooms) {
    // Attempt moving the first downstream interview to this alt room at its original scheduled time
    if (downstreamSameRoom.length > 0) {
      const firstDownstream = downstreamSameRoom[0];
      const alt2Slots: ValidatableSlot[] = currentSlots.map(s => {
        if (s.id === firstDownstream.id) {
          return {
            ...s,
            roomId: altRoom.id,
            roomName: altRoom.name
          };
        }
        return { ...s };
      });

      const alt2Validation = validateScheduleSlots(alt2Slots);
      alternatives.push({
        id: `alt-reroute-${altRoom.id}`,
        title: `Alternative 2: Reroute ${firstDownstream.studentName} to ${altRoom.name}`,
        description: `Transfers ${firstDownstream.studentName} to ${altRoom.name} to preserve original timetable start time.`,
        isValid: alt2Validation.isValid,
        blockers: alt2Validation.isValid
          ? []
          : alt2Validation.conflicts.map(c => `${c.type.toUpperCase()} Conflict: ${c.message}`),
        changesSummary: alt2Validation.isValid
          ? `Transfers 1 interview to ${altRoom.name}; preserves start time; 0 conflicts.`
          : `Cannot execute: ${altRoom.name} has conflicting bookings or interviewer clashes.`,
        affectedInterviewsCount: 1,
        scheduleShifts: [
          {
            interviewId: firstDownstream.id,
            studentName: firstDownstream.studentName || firstDownstream.studentId,
            companyName: firstDownstream.companyName || firstDownstream.companyId,
            beforeTime: formatTimeRangeIST(firstDownstream.scheduledStart, firstDownstream.scheduledEnd),
            afterTime: formatTimeRangeIST(firstDownstream.scheduledStart, firstDownstream.scheduledEnd),
            roomName: altRoom.name,
            roomId: altRoom.id,
            newStart: new Date(firstDownstream.scheduledStart).toISOString(),
            newEnd: new Date(firstDownstream.scheduledEnd).toISOString()
          }
        ]
      });
      break; // Evaluate top alternative room
    }
  }

  // Deterministic sorting: valid alternatives first, then fewer moved interviews
  alternatives.sort((a, b) => {
    if (a.isValid && !b.isValid) return -1;
    if (!a.isValid && b.isValid) return 1;
    return a.affectedInterviewsCount - b.affectedInterviewsCount;
  });

  return {
    id: `sim-${Date.now()}`,
    type: disruptionType,
    targetId: targetSlot.id,
    targetName: `${targetSlot.studentName || targetSlot.studentId} - ${targetSlot.roomName || targetSlot.roomId}`,
    delayMinutes,
    impactSummary: {
      interviewsAffected: affectedInterviews.length,
      studentsAffected: affectedInterviews.length,
      conflictsCreated: alt1Validation.conflictCount,
      interviewsWithNoSlot: 0
    },
    affectedInterviews,
    alternatives,
    createdAt: new Date().toISOString()
  };
}

/**
 * Builds proposal diff items and validation checks for formal governance storage.
 */
export function buildProposalArtifacts(
  shifts: RecoveryAlternative['scheduleShifts'],
  currentSlots: ValidatableSlot[],
  validation: { isValid: boolean; conflicts: any[] }
): {
  diffItems: RecoveryProposalDiffItem[];
  validationChecks: RecoveryValidationCheck[];
} {
  const diffItems: RecoveryProposalDiffItem[] = shifts.map(shift => {
    const orig = currentSlots.find(s => s.id === shift.interviewId);
    const interviewerStr = orig?.interviewerNames && orig.interviewerNames.length > 0
      ? orig.interviewerNames.join(', ')
      : 'Assigned Panel';

    return {
      interviewId: shift.interviewId,
      studentName: shift.studentName,
      rollNumber: orig?.rollNumber || 'DEMO-CAND',
      companyName: shift.companyName,
      before: {
        room: orig?.roomName || orig?.roomId || 'Unassigned',
        roomId: orig?.roomId,
        interviewer: interviewerStr,
        time: shift.beforeTime,
        start: orig ? new Date(orig.scheduledStart).toISOString() : undefined,
        end: orig ? new Date(orig.scheduledEnd).toISOString() : undefined
      },
      after: {
        room: shift.roomName,
        roomId: shift.roomId,
        interviewer: interviewerStr,
        time: shift.afterTime,
        start: shift.newStart,
        end: shift.newEnd
      },
      hasConflict: false
    };
  });

  const validationChecks: RecoveryValidationCheck[] = [
    {
      id: 'vc-1',
      label: 'Interviewer panel availability verified',
      status: validation.isValid ? 'passed' : 'failed',
      detail: validation.isValid
        ? 'No interviewer time overlaps found in verified timetable'
        : 'Interviewer double-booking detected'
    },
    {
      id: 'vc-2',
      label: 'Room availability and capacity confirmed',
      status: validation.isValid ? 'passed' : 'failed',
      detail: validation.isValid
        ? 'Target rooms confirmed unblocked'
        : 'Room overlap constraint violated'
    },
    {
      id: 'vc-3',
      label: 'Student cross-company limits respected',
      status: validation.isValid ? 'passed' : 'failed',
      detail: validation.isValid
        ? 'No candidate double-bookings across drives'
        : 'Candidate conflict detected'
    }
  ];

  return { diffItems, validationChecks };
}
