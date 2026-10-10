# Placement Command — Product Requirements Document v1.1

**Product:** Placement Command  
**Team:** Nexora (4 members)  
**Problem Statement:** 41 — Campus Placement Interview Scheduler (Software & Web Development)  
**Format:** ~20 hours implementation after 2 hours analysis; top 6 teams present, top 3 awarded  
**Document status:** v1.1 — Revised for hackathon realism (supersedes v1.0 draft)  
**Revision date:** 2026-10-11  

> **Revision note:** This document was revised after a complete repository audit.
> All [V] labels below are verified against the live codebase. Requirements that
> existed in v1.0 are preserved with their original IDs wherever possible. Scope
> and priority changes are called out explicitly. No database or code was modified
> during this revision.

---

## 0. How to Use This Document

### 0.1 Evidence Labels

| Label | Meaning |
|---|---|
| [V] | Verified in the running codebase during repository audit |
| [R] | Required by PRD / problem statement; not yet implemented |
| [D] | Deferred — real but explicitly out of scope for this hackathon |
| [E] | Engineering enhancement — implement only after P0 workflow is green |

### 0.2 Priority Tiers

| Tier | Meaning |
|---|---|
| **P0** | Must pass acceptance tests to ship the demo |
| **P1** | Demo is better with it; implement after P0 is green |
| **P2** | Nice-to-have; defer if time is short |
| **[D]** | Explicitly deferred; do not start |

### 0.3 The Golden Rule

> **P0 workflow first, everything else second.**
> If any P1/P2 feature threatens the P0 end-to-end path, cut the feature,
> not the test.

---

## 1. Repository Audit — Verified Baseline

The following is a verified snapshot of the existing codebase as of the revision date.
All implementation work must reuse these verified assets unless a requirement
explicitly calls for replacement.

### 1.1 Tech Stack [V]

| Layer | Technology | Verified In |
|---|---|---|
| Framework | React 19 + Vite 8 | package.json |
| Language | TypeScript 6 | tsconfig.app.json |
| Routing | React Router v7 | router.tsx |
| Styling | Tailwind CSS v4 + Shadcn primitives | index.css, tokens.css |
| State | TanStack Query v5 + local React state | package.json |
| Validation | Zod 3 | package.json |
| Animation | Framer Motion 12 | package.json |
| Icons | Lucide React | package.json |
| Lint | OxLint | .oxlintrc.json |

**TypeScript status:** Zero errors as of audit date. [V]

### 1.2 Data Layer [V]

The application runs entirely on a **mock in-memory backend** (src/lib/api/mockEngine.ts, 791 lines).
There is no real database, no server, and no network calls. All persistence is in-process
and resets on page reload unless the demo-reset API is called.

Key verified capabilities of mockEngine.ts:

- [V] Deterministic student seed (44 students, 4 branches)
- [V] Two companies: Asteria Systems (10 slots), Harbor Analytics (6 slots)
- [V] Eligibility evaluation against mandatory + preferred criteria
- [V] Capacity allocation by match-score rank
- [V] Schedule (published + draft modes) with 3 rooms, 4 interviewers, 6 interviews
- [V] Conflict detection on moveInterviewDraft — throws 409 with ScheduleConflict[] on the prepared Dr. Rao 10:30 AM clash
- [V] Downstream delay propagation via markInterviewDelayed
- [V] Simulation engine (runSimulation) producing RecoveryAlternative[]
- [V] Proposal lifecycle: create → pending_approval → approve/reject
- [V] Audit log with actor, action, entity, diff
- [V] Realtime event bus (realtimeContext.tsx) with subscribe/emit pattern
- [V] Version-optimistic concurrency on criteria updates (throws 409 on stale version)

### 1.3 Auth & Roles [V]

File: src/lib/auth/authContext.tsx

Five roles implemented: admin, officer, coordinator, panel_coordinator, observer.
Role switching is live via Settings → Users (admin only) or the demo login quick-buttons.
RoleGuard component enforces route-level access.
isAllowed(roles[]) helper available anywhere via useAuth().

**Student role:** [R] **Not yet implemented.** No student role exists in the type system or route guard. See Section 3.7.

### 1.4 Screens [V]

| Route | Screen | Status |
|---|---|---|
| /overview | Operations Dashboard | [V] Implemented, premium UI |
| /candidates | Candidates List + Side Inspector | [V] Implemented |
| /candidates/:id | Student Profile | [V] Implemented (coordinator view) |
| /companies | Company & Criteria Editor | [V] Implemented |
| /eligibility | Eligibility Matrix | [V] Implemented |
| /capacity | Capacity & Waitlist | [V] Implemented |
| /schedule | Schedule Board (draft/published) | [V] Implemented |
| /live | Live Operations Console | [V] Implemented |
| /recovery | Recovery & Disruption Sandbox | [V] Implemented |
| /approvals | Approvals Queue | [V] Implemented |
| /approvals/:id | Proposal Comparison Screen | [V] Implemented |
| /audit | Audit Log | [V] Implemented |
| /settings/* | Console Settings & Demo | [V] Implemented |
| /login | Login Screen | [V] Implemented |
| **/my-schedule** | **Student Portal** | **[R] Not yet implemented** |

### 1.5 Missing from Codebase — Required [R]

1. **Student role + student portal** — no student UserRole, no student-facing routes
2. **Resume / PDF upload** — no resumeUrl field on Student, no upload API
3. **Student-facing schedule view** — students cannot see their own interview slot
4. **Student notifications** — no mechanism to deliver schedule-change alerts to students
5. **Branch/year analytics widget** — overview shows aggregate KPIs but no branch breakdown chart

---

## 2. Product Vision (Unchanged from v1.0)

Placement Command is a single-day, multi-role operations console for college campus
placement drives. It handles the full lifecycle: employer registration → eligibility
gates → capacity allocation → schedule publication → live tracking → disruption
recovery → two-key approval → audit trail.

**Core thesis:** Scheduling is a constraint-satisfaction problem. The tool makes
constraints visible, enforces them computationally, and routes exceptions through a
governed approval chain — so that no single coordinator can accidentally publish a
conflicting schedule.

---

## 3. Requirements

Requirements are grouped by workflow stage. Each requirement retains its original ID
from v1.0 where one existed. New requirements introduced in v1.1 use the next
available number in each group.

---

### 3.1 Employer Registration & Criteria

**REQ-COMP-01 [V] P0** — Coordinator can register a new employer with name, role
title, round name, and slot count. Default mandatory criteria (CGPA >= 7.0, backlogs = 0)
are applied automatically.

**REQ-COMP-02 [V] P0** — Coordinator can add/edit/remove mandatory criteria (hard
gates). Saving increments the criteria version. Stale-version 409 is returned if
another coordinator saved first.

**REQ-COMP-03 [V] P0** — Coordinator can add/edit/remove preferred criteria with
weight points. Preferred criteria affect match score ranking only; they never exclude
a student.

**REQ-COMP-04 [V] P1** — Criteria changes are recorded in the audit log with
before/after diff.

---

### 3.2 Student Data & Profile

**REQ-STU-01 [V] P0** — System holds a student record with: roll number, name,
branch, CGPA, active backlogs, top skills, email, phone. Verification flags per field.

**REQ-STU-02 [R] P0** — *(New in v1.1, promoted from P1)* Student record includes
a resumeUrl field. Coordinator can upload or replace a PDF resume for a student.
For the hackathon implementation, a mock file-picker that stores a local object URL
is sufficient — no cloud storage required.

> Rationale for promotion to P0: Resume upload is an explicit product requirement
> in the problem statement. A working demo without it is incomplete. The mock
> implementation is low-cost: add `resumeUrl?: string` to the Student type, add an
> `<input type="file" accept=".pdf">` to StudentProfileScreen, and store the
> URL.createObjectURL(file) result in mockEngine state.

**REQ-STU-03 [V] P0** — Coordinator can view the full student profile (academics,
verification flags, eligibility across companies, interview slot, audit history).

**REQ-STU-04 [V] P1** — WhyDrawer provides explainability: mandatory gate
pass/fail per criterion, preferred score breakdown, selection reason.

---

### 3.3 Eligibility & Capacity

**REQ-ELIG-01 [V] P0** — System evaluates each student against each company's
mandatory criteria; result is eligible | ineligible | pending_verification.

**REQ-ELIG-02 [V] P0** — System computes a match score from preferred criteria
weights. Score is null if the student is ineligible.

**REQ-ELIG-03 [V] P0** — Coordinator can trigger re-evaluation after criteria
change. Stale evaluations are flagged.

**REQ-CAP-01 [V] P0** — System allocates slots by match-score rank up to company
capacity. Students beyond capacity are waitlisted with position.

**REQ-CAP-02 [V] P0** — Coordinator can adjust slot count and re-run allocation.
Waitlist shifts automatically.

**REQ-CAP-03 [V] P1** — Capacity screen shows selected list, waitlist, and
ineligible counts per company.

---

### 3.4 Schedule & Conflict Detection

**REQ-SCH-01 [V] P0** — Published schedule is immutable. All edits happen in draft
mode. Draft and published views are distinct.

**REQ-SCH-02 [V] P0** — Moving an interview in draft mode runs a conflict check.
If the target slot creates a room or interviewer overlap, the API returns 409 with a
ScheduleConflict[] payload. The UI renders a ConflictCallout and does not apply
the move.

**REQ-SCH-03 [V] P0** — A valid move (no conflict) is applied to draft state and
marked hasMoved = true.

**REQ-SCH-04 [V] P0** — Coordinator submits draft for approval. Submission creates
a RecoveryProposal in pending_approval state.

**REQ-SCH-05 [V] P1** — Schedule board shows Published / Draft / Simulation tabs.
Simulation tab shows a sandboxed view of the proposed recovery alternative.

> Architecture note: The existing single validator in moveInterviewDraft is the
> correct P0 implementation. Complex database exclusion constraints and duplicated
> TypeScript/SQL validation are [E] engineering enhancements, not prerequisites.
> The mock engine's 409-on-clash behaviour already satisfies the acceptance test.

---

### 3.5 Live Operations

**REQ-LIVE-01 [V] P0** — Panel coordinator can mark an interview In Progress,
Complete, or Delayed (with minutes + reason).

**REQ-LIVE-02 [V] P0** — When an interview is marked Delayed, estimated start
times for all downstream interviews in the same room shift by the same delta.

**REQ-LIVE-03 [V] P0** — Realtime event bus propagates delay events. Connected
clients receive updates without full-page reload.

**REQ-LIVE-04 [V] P1** — Live Operations screen shows current + next interview per
room, plus a Downstream Impact Monitor sidebar.

**REQ-LIVE-05 [R] P0** — *(New in v1.1)* Students can view **only their own** live
interview status (scheduled time, estimated start if delayed, room, panel name).
Students **must not** see the global Live Operations feed, other students slots, or
interviewer assignments for other rooms.

> Implementation path: Add student to UserRole. Add a protected /my-schedule
> route visible only to student role. The existing getStudentById API already
> returns interviews[] filtered by studentId. Filter server-side before returning
> to the student view. No new engine logic required.

---

### 3.6 Recovery & Approvals (Two-Key)

**REQ-REC-01 [V] P0** — Coordinator runs a disruption simulation. System returns
a list of RecoveryAlternative[] each marked valid/invalid with blocker reasons.

**REQ-REC-02 [V] P0** — Coordinator selects a valid alternative and creates a
recovery proposal with a note.

**REQ-REC-03 [V] P0** — Proposal goes to pending_approval. Officer reviews the
before/after diff and validation checks, then approves or rejects with a decision note.

**REQ-REC-04 [V] P0** — On approval, the proposed schedule becomes the new
published version. Version counter increments. Stale proposals are invalidated.

**REQ-REC-05 [R] P0** — *(New in v1.1)* On approval, affected students receive a
schedule-change notification visible on their /my-schedule view. For the hackathon,
a mock notification banner (persistent until dismissed, stored in mockEngine state
keyed by studentId) is sufficient.

> Implementation path: Add notifications: Notification[] to student state in mockEngine.
> When decideProposal approves, push a notification for each studentId in diffItems.
> The student portal reads getMyNotifications(studentId). No external service needed.

**REQ-REC-06 [V] P0** — Proposal Comparison Screen shows side-by-side before/after
diff per interview slot with conflict flags.

**REQ-APPROV-01 [V] P0** — Two-key rule: the same user who created the proposal
cannot approve it. If proposal.createdByUserId === currentUser.id, the Approve
button is disabled.

---

### 3.7 Student Portal (New Section, v1.1)

> Context: The problem statement requires students to have access to their own
> data. The existing system has no student role or student-facing screens. This
> section defines the minimum viable student portal.

**REQ-SPORT-01 [R] P0** — Student can log in with their roll-number email. After
login, they see only their own data. No coordinator screens are accessible.

**REQ-SPORT-02 [R] P0** — Student portal shows: name, branch, CGPA, skills, resume
link (if uploaded), list of company applications with eligibility and selection status.

**REQ-SPORT-03 [R] P0** — Student portal shows their confirmed interview slot:
company, room, date, time, interviewer panel name. If the interview has been delayed,
the estimated start time is shown prominently.

**REQ-SPORT-04 [R] P0** — If a schedule change (approval of a proposal that
affects this student) has occurred, a persistent notification banner appears at the
top of the student portal until dismissed.

**REQ-SPORT-05 [R] P1** — Student can see their waitlist position if not yet
selected (without seeing other students names or positions).

**REQ-SPORT-06 [D] Deferred** — Student can update their own profile (skills, phone).
Deferred to avoid scope creep; coordinator is responsible for data accuracy in the
hackathon scenario.

---

### 3.8 Audit & Governance

**REQ-AUD-01 [V] P0** — Every state-changing operation is recorded in the audit
log with: timestamp, actor (id, name, role), action code, entity (type, id, name),
human-readable summary, and optional field diff.

**REQ-AUD-02 [V] P1** — Audit screen allows filtering by category and time range.

**REQ-AUD-03 [V] P1** — Audit entries are immutable. No delete or edit API exists.

---

### 3.9 Analytics (Preserved from v1.0)

**REQ-ANA-01 [V] P1** — Overview dashboard shows aggregate KPIs: total applicants,
eligible count, selected count, waitlisted count, interview slots filled.

**REQ-ANA-02 [R] P2** — Branch/year breakdown chart on Overview screen shows
eligible vs. selected by engineering branch. Implement after P0 workflow is green.

> Note: REQ-ANA-02 is kept as P2 (not deferred) because the data is already
> available in mockEngine. A simple grouped summary table takes ~30 minutes if
> the P0 path is done early.

---

## 4. Role-Permission Matrix

This matrix is authoritative. All route guards, API permission checks, and UI
visibility logic must agree with it after implementation.

| Capability | admin | officer | coordinator | panel_coord | observer | student |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View overview / KPIs | Y | Y | Y | Y | Y | N |
| View all candidates | Y | Y | Y | - | Y | N |
| View own profile | - | - | - | - | - | Y |
| Upload student resume | Y | Y | Y | - | - | N |
| Manage companies & criteria | Y | - | Y | - | - | N |
| View companies | Y | Y | Y | - | Y | N |
| Run eligibility evaluation | Y | - | Y | - | - | N |
| View eligibility matrix | Y | Y | Y | - | Y | N |
| Adjust capacity / re-allocate | Y | - | Y | - | - | N |
| View capacity | Y | Y | Y | - | Y | N |
| View published schedule | Y | Y | Y | Y | Y | N |
| Edit draft schedule | Y | - | Y | - | - | N |
| Submit draft for approval | Y | - | Y | - | - | N |
| View global live operations | Y | Y | Y | Y | Y | N |
| Mark interview status | Y | - | Y | Y | - | N |
| Run disruption simulation | Y | - | Y | - | - | N |
| Create recovery proposal | Y | - | Y | - | - | N |
| Approve / reject proposal | Y | Y | - | - | - | N |
| View audit log | Y | Y | Y | - | Y | N |
| Manage user roles | Y | - | - | - | - | N |
| View own interview slot | N | N | N | N | N | **Y** |
| View own notifications | N | N | N | N | N | **Y** |
| View own application status | N | N | N | N | N | **Y** |

**Privacy rule:** Student role sees only their own studentId-scoped data.
The API must filter by studentId === currentUser.studentId server-side before
returning. No student can see another student's name, slot, score, or rank.

---

## 5. Scope Table

| Feature | Status | Priority | Notes |
|---|---|---|---|
| Company registration & criteria editor | [V] Done | P0 | Reuse as-is |
| Eligibility evaluation + explainability | [V] Done | P0 | Reuse as-is |
| Capacity allocation + waitlist | [V] Done | P0 | Reuse as-is |
| Schedule board (draft + published) | [V] Done | P0 | Reuse as-is |
| Conflict detection (409 on move) | [V] Done | P0 | Single validator — sufficient |
| Live operations console | [V] Done | P0 | Reuse as-is |
| Delay propagation (downstream) | [V] Done | P0 | Reuse as-is |
| Recovery simulation + proposals | [V] Done | P0 | Reuse as-is |
| Two-key approval (officer approve) | [V] Done | P0 | Reuse as-is |
| Audit log | [V] Done | P0 | Reuse as-is |
| Student role + UserRole type | [R] Not done | P0 | ~1 hour |
| Student portal (/my-schedule) | [R] Not done | P0 | ~2 hours |
| Resume upload (mock, local URL) | [R] Not done | P0 | ~1 hour |
| Student live status view | [R] Not done | P0 | Included in student portal |
| Schedule-change notification banner | [R] Not done | P0 | ~1 hour |
| Branch/year breakdown chart | [R] Not done | P2 | ~30 min if time permits |
| Real database / persistence | [D] Deferred | - | Not feasible in 20 hours |
| Email/SMS notifications | [D] Deferred | - | External API — out of scope |
| AI resume parsing | [D] Deferred | - | Advisory only per companion PRD |
| Cloud file storage for resumes | [D] Deferred | - | Local object URL is sufficient |
| DB exclusion constraints | [E] Enhancement | - | After P0 demo is green |
| Duplicated TS+SQL validation | [E] Enhancement | - | After P0 demo is green |

---

## 6. Implementation Plan (20-Hour Budget)

### Phase 0 — Repository Audit (Hours 0-2) COMPLETE

Done. All [V] labels in this document are the output of Phase 0.
- Verified all 14 screens render without TypeScript errors
- Confirmed mock engine API surface covers all existing coordinator flows
- Identified 5 missing features (see Section 1.5)
- No database or code was modified during audit

### Phase 1 — P0 Student Portal (Hours 2-7)

**Hour 2-3: Add student role to type system**
- Add 'student' to UserRole union in types.ts
- Add studentId?: string to User interface (links auth user to student record)
- Add a demo student user to INITIAL_USERS in mockData.ts
  e.g. { id: 'user-stu-001', name: 'Aarav Sharma', role: 'student', studentId: 'DEMO-0001' }
- Add RoleGuard check to existing routes to exclude student from all coordinator screens
- Add demo login quick-button for Student role in LoginScreen.tsx

**Hour 3-4: Student portal route + screen scaffold**
- Add route /my-schedule to router.tsx, guarded to student only
- Create src/features/student/MyScheduleScreen.tsx
- Reuse existing Shadcn Card, Badge, Button components
- Left sidebar: hide all coordinator nav items for student role (update SideNav.tsx)

**Hour 4-5: Implement getMySchedule(studentId) in mockEngine**
- Reuse existing getStudentById(id) — it already returns student, applications[], interviews[]
- Add a thin getMySchedule wrapper that enforces currentUser.studentId === id guard
- Add getMyNotifications(studentId) returning Notification[] keyed by studentId

**Hour 5-6: Resume upload (mock)**
- Add resumeUrl?: string to Student type
- Add updateStudentResume(studentId, url) to mockEngine
- Add file picker to StudentProfileScreen.tsx (coordinator view) — stores URL.createObjectURL(file)
- Show "View Resume" link in student portal and coordinator profile view

**Hour 6-7: Schedule-change notification banner**
- Add notifications: { id, message, timestamp, dismissed }[] to student state in mockEngine
- In decideProposal (approve branch): push notification for each studentId in diffItems
- Student portal: show persistent banner if any undismissed notification exists
- Add dismissNotification(notifId) API call; updates mockEngine state

### Phase 2 — Integration & Acceptance Testing (Hours 7-10)

**Hour 7-8: End-to-end P0 workflow test**
Run the milestone chain manually:
1. Seed data → verify 44 students, 2 companies load
2. Eligibility evaluation → confirm eligible/ineligible counts
3. Capacity allocation → confirm 10 selected, 30 waitlisted for Asteria
4. Schedule draft → move interview → trigger 409 conflict → resolve with valid move
5. Submit draft → create recovery proposal
6. Officer approves → schedule version increments
7. Affected student logs in → sees updated slot + notification banner

**Hour 8-9: Role-permission verification**
- Switch to each of the 6 roles (including new student)
- Verify each role can only access permitted routes and API responses
- Verify student cannot navigate to /candidates, /companies, /live, /schedule
- Verify student sees only their own data on /my-schedule

**Hour 9-10: Bug triage and polish**
- Fix any broken state transitions discovered in testing
- Ensure demo-reset button also clears student notifications
- Verify realtime event updates propagate to student portal (delay estimate)

### Phase 3 — P1 Enhancements (Hours 10-14)

**Hour 10-11:** Waitlist position on student portal (no other names visible)

**Hour 11-12:** Branch/year analytics (REQ-ANA-02) if time permits — simple grouped table

**Hour 12-13:** Ensure student notification events appear in audit log; verify self-approve block

**Hour 13-14:** UI consistency pass — student portal matches premium design system

### Phase 4 — Demo Rehearsal (Hours 14-20)

**Hours 14-16:** Full 5-minute demo rehearsal (dry run x2, see Section 9)

**Hours 16-18:** Buffer for discovered bugs from rehearsal

**Hours 18-19:** Final TypeScript check + production build test
```
npx tsc --noEmit   # must be zero errors
npm run build      # must succeed
```

**Hour 19-20:** Demo environment prep
- Reset demo seed (Settings → Demo Controls → Reset)
- Verify all 6 role logins work with the quick-login buttons
- Keep browser console open during presentation to catch runtime errors

---

## 7. Milestone Checkpoint (Gate Before P1 Work)

The following milestone is the gate condition before any P1 work begins.

**Milestone: P0 End-to-End Path**

Trigger: Seeded data is present
Step 1: Genuine conflict detection fires on invalid move (409 with ScheduleConflict[])
Step 2: Valid move succeeds; draft shows hasMoved = true
Step 3: Coordinator submits draft → feasible swap proposal created
Step 4: Officer approves → validationChecks[] all pass → proposal approved
Step 5: Schedule version increments → new published schedule is conflict-free
Step 6: Affected student's /my-schedule shows updated slot + notification banner

**If any step fails, stop P1 work and fix P0 first.**

---

## 8. Acceptance Tests

All P0 requirements must pass the following tests before demo.

### AT-01: Conflict Detection
- Given a draft schedule with Dr. V. Rao assigned to Room A at 10:00 AM
- When coordinator moves any interview to Room B at 10:30 AM with Dr. V. Rao
- Then API returns 409, ConflictCallout renders with resource name and time range
- And the move is NOT applied to draft state

### AT-02: Valid Move Applied
- Given the same draft schedule
- When coordinator moves an interview to an unoccupied slot (e.g., Room C at 12:00 PM)
- Then move succeeds, interview shows hasMoved = true, no conflict callout

### AT-03: Proposal Created and Queued
- Given a draft with at least one valid move
- When coordinator submits the draft with a note
- Then a RecoveryProposal appears in Approvals queue with status pending_approval

### AT-04: Two-Key Approval Rule
- Given a proposal created by Coordinator (Rishi Nair, user-coord)
- When the same user is logged in and views the Approvals screen
- Then Approve button is disabled; a tooltip explains "You created this proposal"

### AT-05: Officer Approves
- Given the same pending proposal
- When Officer (Prof. Meera Sen) approves it with a decision note
- Then proposal status is approved, schedule version increments, audit entry created

### AT-06: Conflict-Free Result
- Given the approved proposal
- When coordinator views the published schedule
- Then no interview shows a conflict flag; Dr. Rao's time conflict is resolved

### AT-07: Student Sees Notification
- Given AT-05 has passed and Aarav Sharma's slot is in diffItems
- When Aarav Sharma logs in as student
- Then /my-schedule shows a notification banner: "Your interview schedule has been updated"
- And the updated slot time matches the approved proposal

### AT-08: Student Data Isolation
- Given student Aarav Sharma is logged in
- When Aarav attempts to navigate to /candidates, /companies, or /live
- Then RoleGuard redirects to /my-schedule or /403
- And no API call returns another student's data

### AT-09: Resume Upload
- Given coordinator is on Aarav Sharma's profile screen
- When coordinator selects a PDF file via the file picker
- Then student.resumeUrl is set, a "View Resume" link appears on both the
  coordinator profile view and the student's own portal

### AT-10: Delay Notification on Student Portal
- Given Aarav Sharma's interview is In Progress and marked 30-min delayed
- When Aarav views /my-schedule
- Then the estimated start time is shown (scheduled + 30 min) with a delay indicator

---

## 9. Demonstration Script (5-Minute Version)

> This script must be rehearsed at least twice before presentation.
> Reset demo data before each rehearsal (Settings → Demo Controls → Reset).

| Minute | Actor | Screen | Action | Talking Point |
|---|---|---|---|---|
| 0:00 | Coordinator | Overview | Show KPIs | "40 eligible students, 10 slots filled, 30 on waitlist — calculated in real time" |
| 0:30 | Coordinator | Companies | Show Asteria criteria | "Mandatory gates: CGPA 7.5 and zero backlogs. Preferred: TypeScript gets +30 pts" |
| 1:00 | Coordinator | Schedule (Draft) | Move Priya Patel → Room B 10:30 AM | "Watch — the system detects a clash" |
| 1:15 | Coordinator | Schedule (Draft) | ConflictCallout fires | "Dr. Rao is already in Room B at 10:30 for Harbor Analytics. Move is blocked." |
| 1:30 | Coordinator | Schedule (Draft) | Move to valid slot → submit | "Valid move succeeds. Submitting for officer approval." |
| 2:00 | Switch to Officer | Approvals | Open proposal → Before/After diff | "Officer sees exactly what changed — two slots shifted, all validation checks green" |
| 2:30 | Officer | Approvals | Approve with note | "Approved. Schedule v2 is now live." |
| 3:00 | Switch to Student | My Schedule | Show notification banner | "Aarav sees: your slot changed. One tap to dismiss." |
| 3:15 | Student | My Schedule | Show updated slot + delay estimate | "Original 09:30 AM, now estimated 10:00 AM due to upstream delay" |
| 3:45 | Coordinator | Audit Log | Show full trail | "Every action — criteria change, move, approval — is immutable and timestamped" |
| 4:15 | Coordinator | Live Ops | Show Room A in-progress | "Panel coordinator marks interview complete; next slot auto-advances" |
| 4:45 | Coordinator | Recovery | Run disruption simulation | "30-min delay — two alternatives: one valid, one blocked by Harbor" |
| 5:00 | End | — | — | "Questions?" |

---

## 10. What Was Changed from v1.0

### Summary of Revisions

| Change | v1.0 | v1.1 | Reason |
|---|---|---|---|
| Resume upload priority | Unspecified/P1 | **P0** | Explicit product requirement; mock impl is low-cost |
| Student portal | Not mentioned | **P0 (new Section 3.7)** | Problem statement requires student access |
| Student live status | Not specified | **P0 (REQ-LIVE-05)** | Privacy-safe student view added |
| Student data isolation | Not specified | **P0 (AT-08)** | Required to prevent privacy leak |
| Schedule-change notification | Not specified | **P0 (REQ-REC-05)** | Core student experience |
| P0 milestone defined | Not defined | **Section 7** | Needed to gate P1 work |
| Complex DB constraints | Implied prerequisite | **[E] Enhancement** | Not feasible in 20-hour hackathon |
| Duplicated TS/SQL validation | Implied | **[E] Enhancement** | Mock engine single validator is sufficient |
| Branch/year analytics | P0 (implied) | **P2** | Deprioritized behind student portal |
| Hour budget breakdown | Vague | **Explicit 20-hour plan** | Realistic estimation with buffer |
| Demo rehearsal time | Not allocated | **Hours 14-20** | 6 hours explicitly reserved |
| Student role in permission matrix | Not included | **New column added** | Matrix must agree with implementation |
| Acceptance tests | Not formal | **AT-01 through AT-10** | Testable exit criteria for each P0 req |
| Repository audit as first step | Not specified | **Phase 0, marked COMPLETE** | Reuse existing work; do not rebuild |
| Email/SMS notifications | Implied possible | **[D] Deferred** | External API dependency; cut |
| Cloud file storage | Implied possible | **[D] Deferred** | Local object URL is sufficient |

### What Was NOT Changed

- Core product vision and thesis (Section 2) — unchanged
- All existing requirement IDs (REQ-COMP-*, REQ-ELIG-*, etc.) — preserved
- Two-key approval rule — preserved and strengthened in AT-04
- Audit log requirements — preserved
- Realtime event bus requirements — preserved
- All [V] verified features — preserved exactly as implemented
- The mock-backend architecture — preserved; no database work during revision
- Premium UI design system — preserved; all screens retain teal/navy tokens

---

*End of PRD v1.1 — Placement Command*
