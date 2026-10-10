import {
  ValidatableSlot,
  ScheduleConflict,
  ValidationResult
} from './types.js';

/**
 * Format a time interval in India Standard Time (IST), e.g. "09:30 AM - 10:00 AM IST"
 */
export function formatTimeRangeIST(start: Date | string, end: Date | string): string {
  const dStart = typeof start === 'string' ? new Date(start) : start;
  const dEnd = typeof end === 'string' ? new Date(end) : end;

  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  };
  const fmt = new Intl.DateTimeFormat('en-US', options);
  return `${fmt.format(dStart)} - ${fmt.format(dEnd)} IST`;
}

/**
 * Deterministic half-open interval overlap check:
 * [startA, endA) overlaps [startB, endB) iff startA < endB && startB < endA.
 * Back-to-back intervals (startB == endA) return false (no overlap).
 */
export function doIntervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
}

/**
 * Deterministic pure function to validate a collection of interview slots.
 * Detects:
 *  1. Student double-booking (including cross-company conflicts)
 *  2. Interviewer panel overlap across concurrent rooms
 *  3. Room double-booking
 *  4. Invalid time ranges (end <= start)
 *
 * Rules:
 *  - Cancelled interviews (status === 'cancelled') are ignored and do not generate conflicts.
 *  - Checks every unique pair (i < j) deterministically to prevent double-counting.
 */
export function validateScheduleSlots(slots: ValidatableSlot[]): ValidationResult {
  const conflicts: ScheduleConflict[] = [];
  const conflictsBySlotId: Record<string, ScheduleConflict[]> = {};

  const addConflict = (slotId: string, conflict: ScheduleConflict) => {
    conflicts.push(conflict);
    if (!conflictsBySlotId[slotId]) conflictsBySlotId[slotId] = [];
    conflictsBySlotId[slotId].push(conflict);

    if (conflict.counterpartInterviewId) {
      const counterpartId = conflict.counterpartInterviewId;
      if (!conflictsBySlotId[counterpartId]) conflictsBySlotId[counterpartId] = [];
      // Also attach to counterpart for complete visibility
      conflictsBySlotId[counterpartId].push({
        ...conflict,
        interviewId: counterpartId,
        counterpartInterviewId: slotId
      });
    }
  };

  // 1. Check individual slot validity
  for (const slot of slots) {
    if (slot.status === 'cancelled') continue;

    const start = new Date(slot.scheduledStart);
    const end = new Date(slot.scheduledEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      addConflict(slot.id, {
        id: `conf-time-${slot.id}`,
        interviewId: slot.id,
        type: 'room',
        resource: slot.roomName || slot.roomId,
        timeRange: 'Invalid Time Range',
        counterpart: 'Self',
        message: `Invalid slot timing: scheduled end must be strictly after scheduled start.`,
        severity: 'critical'
      });
    }
  }

  // 2. Check pairwise overlaps (i < j to ensure determinism and zero duplicates)
  for (let i = 0; i < slots.length; i++) {
    const slotA = slots[i];
    if (slotA.status === 'cancelled') continue;

    const startA = new Date(slotA.scheduledStart);
    const endA = new Date(slotA.scheduledEnd);
    if (endA.getTime() <= startA.getTime()) continue;

    for (let j = i + 1; j < slots.length; j++) {
      const slotB = slots[j];
      if (slotB.status === 'cancelled') continue;

      const startB = new Date(slotB.scheduledStart);
      const endB = new Date(slotB.scheduledEnd);
      if (endB.getTime() <= startB.getTime()) continue;

      // Half-open interval overlap check: startA < endB && startB < endA
      if (!doIntervalsOverlap(startA, endA, startB, endB)) {
        continue;
      }

      // Calculate the overlapping window for precise error reporting
      const overlapStart = new Date(Math.max(startA.getTime(), startB.getTime()));
      const overlapEnd = new Date(Math.min(endA.getTime(), endB.getTime()));
      const timeRangeStr = formatTimeRangeIST(overlapStart, overlapEnd);

      // A. Check Student Conflict
      if (slotA.studentId === slotB.studentId) {
        const isCrossCompany = slotA.companyId !== slotB.companyId;
        const studentName = slotA.studentName || slotB.studentName || `Student ${slotA.studentId}`;
        const compA = slotA.companyName || slotA.companyId;
        const compB = slotB.companyName || slotB.companyId;

        addConflict(slotA.id, {
          id: `conf-stu-${slotA.id}-${slotB.id}`,
          interviewId: slotA.id,
          counterpartInterviewId: slotB.id,
          type: isCrossCompany ? 'cross_company_student' : 'student',
          resource: studentName,
          timeRange: timeRangeStr,
          counterpart: isCrossCompany
            ? `${compB} in ${slotB.roomName || slotB.roomId}`
            : `${compA} (Slot ${slotB.id})`,
          message: isCrossCompany
            ? `Candidate ${studentName} is double-booked across competing companies: ${compA} (${slotA.roomName || slotA.roomId}) and ${compB} (${slotB.roomName || slotB.roomId}).`
            : `Candidate ${studentName} is assigned to concurrent interview slots.`,
          severity: 'critical'
        });
      }

      // B. Check Room Conflict
      if (slotA.roomId === slotB.roomId) {
        const roomName = slotA.roomName || slotB.roomName || `Room ${slotA.roomId}`;
        const compA = slotA.companyName || slotA.companyId;
        const compB = slotB.companyName || slotB.companyId;

        addConflict(slotA.id, {
          id: `conf-room-${slotA.id}-${slotB.id}`,
          interviewId: slotA.id,
          counterpartInterviewId: slotB.id,
          type: 'room',
          resource: roomName,
          timeRange: timeRangeStr,
          counterpart: `${compB} (${slotB.studentName || slotB.studentId})`,
          message: `Physical Room ${roomName} has overlapping bookings: ${compA} and ${compB}.`,
          severity: 'critical'
        });
      }

      // C. Check Interviewer Panel Conflict
      if (slotA.interviewerIds && slotB.interviewerIds) {
        for (const interviewerId of slotA.interviewerIds) {
          if (slotB.interviewerIds.includes(interviewerId)) {
            // Find interviewer name
            const idxA = slotA.interviewerIds.indexOf(interviewerId);
            const interviewerName = (slotA.interviewerNames && slotA.interviewerNames[idxA])
              ? slotA.interviewerNames[idxA]
              : interviewerId;

            const roomA = slotA.roomName || slotA.roomId;
            const roomB = slotB.roomName || slotB.roomId;

            addConflict(slotA.id, {
              id: `conf-iv-${interviewerId}-${slotA.id}-${slotB.id}`,
              interviewId: slotA.id,
              counterpartInterviewId: slotB.id,
              type: 'interviewer',
              resource: interviewerName,
              timeRange: timeRangeStr,
              counterpart: `${slotB.companyName || slotB.companyId} (${roomB})`,
              message: `Interviewer ${interviewerName} is assigned to simultaneous interviews in ${roomA} and ${roomB}.`,
              severity: 'critical'
            });
          }
        }
      }
    }
  }

  return {
    isValid: conflicts.length === 0,
    conflicts,
    conflictCount: conflicts.length,
    conflictsBySlotId
  };
}
