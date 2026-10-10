import type { 
  User, 
  Student, 
  Company, 
  StudentApplication, 
  Interview, 
  Room, 
  Interviewer,
  DisruptionSimulation,
  RecoveryProposal,
  AuditEntry,
  PipelineStep
} from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Dr. K. Swaminathan',
    email: 'admin@placement.example',
    role: 'admin',
    environment: 'demo'
  },
  {
    id: 'user-officer',
    name: 'Prof. Meera Sen',
    email: 'officer@placement.example',
    role: 'officer',
    environment: 'demo'
  },
  {
    id: 'user-coord',
    name: 'Rishi Nair',
    email: 'coordinator@placement.example',
    role: 'coordinator',
    environment: 'demo'
  },
  {
    id: 'user-panel',
    name: 'Dr. S. Priya',
    email: 'panel@placement.example',
    role: 'panel_coordinator',
    assignedPanels: ['Room A'],
    environment: 'demo'
  },
  {
    id: 'user-student',
    name: 'Aarav Sharma',
    email: 'student@placement.example',
    role: 'student',
    environment: 'demo'
  },
  {
    id: 'user-observer',
    name: 'Dean Academics',
    email: 'observer@placement.example',
    role: 'observer',
    environment: 'demo'
  }
];

export const ROOMS: Room[] = [
  { id: 'room-a', name: 'Room A', building: 'Newton Hall (Main Block)', capacity: 4 },
  { id: 'room-b', name: 'Room B', building: 'Turing Computing Lab', capacity: 4 },
  { id: 'room-c', name: 'Room C', building: 'Babbage Suite 201', capacity: 4 }
];

export const INTERVIEWERS: Interviewer[] = [
  { id: 'int-1', name: 'Dr. V. Rao', department: 'Computer Science & Engg' },
  { id: 'int-2', name: 'Prof. A. Sharma', department: 'Information Technology' },
  { id: 'int-3', name: 'Dr. S. Priya', department: 'Electronics & Comm.' },
  { id: 'int-4', name: 'Dr. N. Anand', department: 'Data Science & AI' }
];

// Generate 44 deterministic synthetic students
const FIRST_NAMES = [
  'Aarav', 'Priya', 'Rohan', 'Sneha', 'Karthik', 'Ananya', 'Vikram', 'Divya',
  'Aditya', 'Meera', 'Rahul', 'Pooja', 'Siddharth', 'Tanvi', 'Varun', 'Isha',
  'Arjun', 'Rhea', 'Manish', 'Neha', 'Gaurav', 'Shreya', 'Nikhil', 'Kavya',
  'Pranav', 'Ritu', 'Akash', 'Swati', 'Harsh', 'Bhavna', 'Sameer', 'Deepa',
  'Kunal', 'Simran', 'Tushar', 'Payal', 'Mayank', 'Geeta', 'Sanjay', 'Tarun',
  'Dev', 'Chitrangada', 'Mohit', 'Sunita'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Verma', 'Iyer', 'Nair', 'Sen', 'Singh', 'Rao',
  'Deshmukh', 'Menon', 'Kulkarni', 'Reddy', 'Chatterjee', 'Bose', 'Gupta', 'Mehta',
  'Joshi', 'Pillai', 'Chauhan', 'Malhotra', 'Agarwal', 'Saxena', 'Bhat', 'Ghosh',
  'Hegde', 'Nambiar', 'Pandey', 'Dutta', 'Mishra', 'Shetty', 'Trivedi', 'Kapoor',
  'Venkatesh', 'Chopra', 'Dubey', 'Sengupta', 'Pawar', 'Narayanan', 'Majumdar', 'Das',
  'Bhardwaj', 'Purohit', 'Goswami', 'Choudhury'
];

const BRANCHES = ['Computer Science', 'Information Technology', 'Electronics & Comm.', 'Data Engineering'];
const SKILLS_POOL = ['React', 'Node.js', 'Python', 'SQL', 'System Design', 'TypeScript', 'Docker', 'AWS', 'Kubernetes', 'Algorithms'];

export function generateSyntheticStudents(): Student[] {
  return Array.from({ length: 44 }, (_, idx) => {
    const idNum = idx + 1;
    const rollNumber = `DEMO-${String(idNum).padStart(4, '0')}`;
    const firstName = FIRST_NAMES[idx] || `Student${idNum}`;
    const lastName = LAST_NAMES[idx] || 'Kumar';
    const name = `${firstName} ${lastName}`;
    const branch = BRANCHES[idx % BRANCHES.length]!;
    
    // Students 1 to 40 have CGPA >= 7.5 and 0 backlogs (satisfies Asteria mandatory criteria)
    // Students 41 and 42 have lower CGPA or backlogs (ineligible for Harbor)
    // Student 43 is pending verification
    let cgpa = 7.6 + ((idx * 7) % 24) / 10; // 7.6 to 9.9
    let backlogs = 0;
    let verified = { cgpa: true, backlogs: true, branch: true, skills: true };

    if (idNum === 41) {
      cgpa = 6.4; // Ineligible
    } else if (idNum === 42) {
      backlogs = 1; // Ineligible
    } else if (idNum === 43) {
      verified = { cgpa: false, backlogs: true, branch: true, skills: false }; // Pending verification
    }

    const primarySkill = SKILLS_POOL[idx % SKILLS_POOL.length]!;
    const secondarySkill = SKILLS_POOL[(idx + 3) % SKILLS_POOL.length]!;
    const tertiarySkill = SKILLS_POOL[(idx + 5) % SKILLS_POOL.length]!;

    return {
      id: `std-${idNum}`,
      rollNumber,
      name,
      branch,
      cgpa: Math.round(cgpa * 100) / 100,
      backlogs,
      skills: [primarySkill, secondarySkill, tertiarySkill],
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.example`,
      phone: `+91 98${String(10000000 + idNum).substring(0, 8)}`,
      academicVerified: verified
    };
  });
}

export function generateInitialCompanies(): Company[] {
  return [
    {
      id: 'comp-asteria',
      name: 'Asteria Systems',
      roleTitle: 'Software Engineer - Distributed Systems',
      roundName: 'Round 1 - Technical Interview',
      status: 'active',
      criteriaVersion: 2,
      slots: 10,
      mandatoryCriteria: [
        { id: 'c-1', field: 'cgpa', operator: 'gte', value: 7.5, type: 'mandatory', label: 'Minimum CGPA 7.5' },
        { id: 'c-2', field: 'backlogs', operator: 'eq', value: 0, type: 'mandatory', label: 'Zero Active Backlogs' },
        { id: 'c-3', field: 'branch', operator: 'in', value: ['Computer Science', 'Information Technology', 'Electronics & Comm.', 'Data Engineering'], type: 'mandatory', label: 'Eligible Engg Branches' }
      ],
      preferredCriteria: [
        { id: 'c-4', field: 'skills', operator: 'in', value: 'System Design', type: 'preferred', weight: 40, label: 'Distributed Systems / System Design' },
        { id: 'c-5', field: 'skills', operator: 'in', value: 'TypeScript', type: 'preferred', weight: 30, label: 'Modern TypeScript' },
        { id: 'c-6', field: 'skills', operator: 'in', value: 'Docker', type: 'preferred', weight: 30, label: 'Containerization / Docker' }
      ]
    },
    {
      id: 'comp-harbor',
      name: 'Harbor Analytics',
      roleTitle: 'Data Analyst & Machine Learning Trainee',
      roundName: 'Round 1 - Analytics Assessment',
      status: 'active',
      criteriaVersion: 1,
      slots: 6,
      mandatoryCriteria: [
        { id: 'c-7', field: 'cgpa', operator: 'gte', value: 7.0, type: 'mandatory', label: 'Minimum CGPA 7.0' },
        { id: 'c-8', field: 'backlogs', operator: 'eq', value: 0, type: 'mandatory', label: 'Zero Backlogs' }
      ],
      preferredCriteria: [
        { id: 'c-9', field: 'skills', operator: 'in', value: 'Python', type: 'preferred', weight: 50, label: 'Advanced Python' },
        { id: 'c-10', field: 'skills', operator: 'in', value: 'SQL', type: 'preferred', weight: 50, label: 'SQL Query Optimization' }
      ]
    }
  ];
}

// Generates the Asteria 40-applicant, 10-slot dataset and Harbor Analytics dataset
export function generateInitialApplications(students: Student[], companies: Company[]): StudentApplication[] {
  const asteria = companies.find(c => c.id === 'comp-asteria')!;
  const harbor = companies.find(c => c.id === 'comp-harbor')!;
  
  const apps: StudentApplication[] = [];

  // Asteria Systems: Students 1 to 40 (all 40 meet mandatory criteria!)
  // Exactly 10 Selected, 30 Waitlisted. 0 Ineligible.
  const asteriaStudents = students.slice(0, 40);
  
  asteriaStudents.forEach((std, index) => {
    // Generate deterministic match scores from 96 down to 55
    const matchScore = 96 - Math.round(index * 1.05);
    const isSelected = index < 10;
    const selection = isSelected ? 'selected' : 'waitlisted';
    const rank = index + 1;
    const waitlistPos = isSelected ? undefined : index - 9;
    
    const selectionReason = isSelected 
      ? `Ranked ${rank} of 40 by match score; awarded slot ${rank} of 10`
      : `Ranked ${rank} of 40 by match score; waitlist position #${waitlistPos} (capacity 10)`;

    apps.push({
      id: `app-ast-${std.id}`,
      studentId: std.id,
      student: std,
      companyId: asteria.id,
      companyName: asteria.name,
      eligibility: 'eligible',
      matchScore,
      selection,
      rank,
      waitlistPosition: waitlistPos,
      criteriaSummary: { passed: 3, total: 3 },
      selectionReason,
      explanation: {
        applicationId: `app-ast-${std.id}`,
        studentId: std.id,
        companyId: asteria.id,
        evaluatedAt: new Date().toISOString(),
        criteriaVersion: 2,
        stale: false,
        mandatoryResults: [
          { name: 'Minimum CGPA 7.5', requiredValue: '>= 7.50', actualValue: std.cgpa.toFixed(2), result: 'pass', isVerified: true },
          { name: 'Zero Active Backlogs', requiredValue: '0', actualValue: String(std.backlogs), result: 'pass', isVerified: true },
          { name: 'Eligible Engg Branches', requiredValue: 'CS/IT/ECE/Data', actualValue: std.branch, result: 'pass', isVerified: true }
        ],
        preferredResults: [
          { name: 'Distributed Systems / System Design', weight: 40, matched: std.skills.includes('System Design'), pointsContributed: std.skills.includes('System Design') ? 40 : 0 },
          { name: 'Modern TypeScript', weight: 30, matched: std.skills.includes('TypeScript'), pointsContributed: std.skills.includes('TypeScript') ? 30 : 0 },
          { name: 'Containerization / Docker', weight: 30, matched: std.skills.includes('Docker'), pointsContributed: std.skills.includes('Docker') ? 30 : 0 }
        ],
        totalScore: matchScore,
        selectionReason,
        capacityAllocated: 10,
        rankInRound: rank
      }
    });
  });

  // Harbor Analytics: 12 applicants (Students 1 to 8 apply to both; students 41, 42, 43, 44 apply here)
  // 9 Eligible, 2 Ineligible (41, 42), 1 Pending verification (43).
  // 6 Selected, 3 Waitlisted.
  const harborCandidates = [...students.slice(0, 8), ...students.slice(40, 44)];
  harborCandidates.forEach((std, index) => {
    let eligibility: 'eligible' | 'ineligible' | 'pending_verification' = 'eligible';
    let matchScore: number | null = 88 - index * 3;
    let criteriaPassed = 2;
    let selection: 'selected' | 'waitlisted' | 'not_selected_this_round' = 'waitlisted';

    if (std.id === 'std-41') {
      eligibility = 'ineligible';
      matchScore = null;
      criteriaPassed = 1;
      selection = 'not_selected_this_round';
    } else if (std.id === 'std-42') {
      eligibility = 'ineligible';
      matchScore = null;
      criteriaPassed = 1;
      selection = 'not_selected_this_round';
    } else if (std.id === 'std-43') {
      eligibility = 'pending_verification';
      matchScore = 74;
      criteriaPassed = 2;
      selection = 'waitlisted';
    } else if (index < 6) {
      selection = 'selected';
    }

    const rank = eligibility === 'eligible' ? index + 1 : undefined;

    apps.push({
      id: `app-hrb-${std.id}`,
      studentId: std.id,
      student: std,
      companyId: harbor.id,
      companyName: harbor.name,
      eligibility,
      matchScore,
      selection,
      rank,
      criteriaSummary: { passed: criteriaPassed, total: 2 },
      selectionReason: selection === 'selected' 
        ? `Selected: Eligible and ranked #${rank} of 9 eligible for 6 slots`
        : eligibility === 'ineligible' 
          ? `Ineligible: Does not satisfy mandatory criterion (CGPA or Backlog)`
          : eligibility === 'pending_verification'
            ? `Pending verification: Academic records awaiting registrar sign-off`
            : `Eligible, waitlisted (capacity 6 slots filled)`,
      explanation: {
        applicationId: `app-hrb-${std.id}`,
        studentId: std.id,
        companyId: harbor.id,
        evaluatedAt: new Date().toISOString(),
        criteriaVersion: 1,
        stale: false,
        mandatoryResults: [
          { name: 'Minimum CGPA 7.0', requiredValue: '>= 7.00', actualValue: std.cgpa.toFixed(2), result: std.cgpa >= 7.0 ? 'pass' : 'fail', isVerified: std.academicVerified.cgpa },
          { name: 'Zero Backlogs', requiredValue: '0', actualValue: String(std.backlogs), result: std.backlogs === 0 ? 'pass' : 'fail', isVerified: std.academicVerified.backlogs }
        ],
        preferredResults: [
          { name: 'Advanced Python', weight: 50, matched: std.skills.includes('Python'), pointsContributed: std.skills.includes('Python') ? 50 : 0 },
          { name: 'SQL Query Optimization', weight: 50, matched: std.skills.includes('SQL'), pointsContributed: std.skills.includes('SQL') ? 50 : 0 }
        ],
        totalScore: matchScore,
        selectionReason: selection === 'selected' ? `Selected in top 6` : `Waitlisted`,
        capacityAllocated: 6,
        rankInRound: rank || 0
      }
    });
  });

  return apps;
}

export function generateInitialSchedule(students: Student[], companies: Company[]): Interview[] {
  const asteria = companies.find(c => c.id === 'comp-asteria')!;
  const harbor = companies.find(c => c.id === 'comp-harbor')!;
  
  const today = new Date();
  today.setHours(9, 30, 0, 0); // 09:30 AM IST today

  const interviews: Interview[] = [];

  // Room A: Asteria Systems interviews (Selected students 1, 2, 3, 4)
  // Interview 1: Aarav Sharma (DEMO-0001), 09:30 - 10:00 (In progress / ready to delay)
  const t0 = new Date(today);
  const t0End = new Date(t0.getTime() + 30 * 60000);
  interviews.push({
    id: 'int-ast-1',
    studentId: students[0]!.id,
    studentName: students[0]!.name,
    rollNumber: students[0]!.rollNumber,
    companyId: asteria.id,
    companyName: asteria.name,
    roomId: 'room-a',
    roomName: 'Room A',
    interviewerIds: ['int-1'],
    interviewerNames: ['Dr. V. Rao'],
    scheduledStart: t0.toISOString(),
    scheduledEnd: t0End.toISOString(),
    status: 'in_progress',
    delayMinutes: 0,
    allowedActions: ['complete', 'mark_delayed']
  });

  // Interview 2: Priya Patel (DEMO-0002), 10:00 - 10:30 (Room A)
  const t1 = new Date(t0.getTime() + 30 * 60000);
  const t1End = new Date(t1.getTime() + 30 * 60000);
  interviews.push({
    id: 'int-ast-2',
    studentId: students[1]!.id,
    studentName: students[1]!.name,
    rollNumber: students[1]!.rollNumber,
    companyId: asteria.id,
    companyName: asteria.name,
    roomId: 'room-a',
    roomName: 'Room A',
    interviewerIds: ['int-1'],
    interviewerNames: ['Dr. V. Rao'],
    scheduledStart: t1.toISOString(),
    scheduledEnd: t1End.toISOString(),
    status: 'scheduled',
    delayMinutes: 0,
    allowedActions: ['check_in', 'start', 'mark_delayed', 'cancel']
  });

  // Interview 3: Rohan Verma (DEMO-0003), 10:30 - 11:00 (Room A)
  const t2 = new Date(t1.getTime() + 30 * 60000);
  const t2End = new Date(t2.getTime() + 30 * 60000);
  interviews.push({
    id: 'int-ast-3',
    studentId: students[2]!.id,
    studentName: students[2]!.name,
    rollNumber: students[2]!.rollNumber,
    companyId: asteria.id,
    companyName: asteria.name,
    roomId: 'room-a',
    roomName: 'Room A',
    interviewerIds: ['int-1'],
    interviewerNames: ['Dr. V. Rao'],
    scheduledStart: t2.toISOString(),
    scheduledEnd: t2End.toISOString(),
    status: 'scheduled',
    delayMinutes: 0,
    allowedActions: ['check_in', 'start', 'mark_delayed']
  });

  // Room B: Harbor Analytics interviews (Interviewer: Prof. A. Sharma)
  const tb0 = new Date(today);
  const tb0End = new Date(tb0.getTime() + 30 * 60000);
  interviews.push({
    id: 'int-hrb-1',
    studentId: students[4]!.id, // Karthik Nair
    studentName: students[4]!.name,
    rollNumber: students[4]!.rollNumber,
    companyId: harbor.id,
    companyName: harbor.name,
    roomId: 'room-b',
    roomName: 'Room B',
    interviewerIds: ['int-2'],
    interviewerNames: ['Prof. A. Sharma'],
    scheduledStart: tb0.toISOString(),
    scheduledEnd: tb0End.toISOString(),
    status: 'in_progress',
    delayMinutes: 0,
    allowedActions: ['complete', 'mark_delayed']
  });

  // Prepared clash slot for Draft Schedule demo:
  // In Room B at 10:30 AM, Dr. V. Rao is scheduled for Company Harbor!
  const tb2 = new Date(t1.getTime() + 30 * 60000);
  const tb2End = new Date(tb2.getTime() + 30 * 60000);
  interviews.push({
    id: 'int-hrb-prepared-clash',
    studentId: students[5]!.id, // Ananya Sen
    studentName: students[5]!.name,
    rollNumber: students[5]!.rollNumber,
    companyId: harbor.id,
    companyName: harbor.name,
    roomId: 'room-b',
    roomName: 'Room B',
    interviewerIds: ['int-1'], // Dr. V. Rao is booked here!
    interviewerNames: ['Dr. V. Rao'],
    scheduledStart: tb2.toISOString(),
    scheduledEnd: tb2End.toISOString(),
    status: 'scheduled',
    delayMinutes: 0,
    allowedActions: ['check_in', 'start', 'mark_delayed']
  });

  // Room C: Harbor Analytics booking (blocks Alternative 2 in simulation!)
  const tc1 = new Date(t1.getTime() + 30 * 60000); // 10:30 AM
  const tc1End = new Date(tc1.getTime() + 60 * 60000); // 11:30 AM
  interviews.push({
    id: 'int-hrb-room-c-blocking',
    studentId: students[6]!.id,
    studentName: students[6]!.name,
    rollNumber: students[6]!.rollNumber,
    companyId: harbor.id,
    companyName: harbor.name,
    roomId: 'room-c',
    roomName: 'Room C',
    interviewerIds: ['int-4'],
    interviewerNames: ['Dr. N. Anand'],
    scheduledStart: tc1.toISOString(),
    scheduledEnd: tc1End.toISOString(),
    status: 'scheduled',
    delayMinutes: 0,
    allowedActions: ['check_in', 'start', 'mark_delayed']
  });

  return interviews;
}

export function generateInitialAudit(): AuditEntry[] {
  return [
    {
      id: 'aud-001',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      actor: { id: 'user-coord', name: 'Rishi Nair', role: 'coordinator' },
      action: 'criteria.updated',
      category: 'company',
      entity: { type: 'company', id: 'comp-asteria', name: 'Asteria Systems' },
      summary: 'Updated criteria to version 2 (CGPA min 7.5, 3 mandatory criteria)'
    },
    {
      id: 'aud-002',
      timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      actor: { id: 'user-coord', name: 'Rishi Nair', role: 'coordinator' },
      action: 'allocation.executed',
      category: 'capacity',
      entity: { type: 'company', id: 'comp-asteria', name: 'Asteria Systems' },
      summary: 'Executed capacity allocation: 10 selected, 30 waitlisted out of 40 eligible'
    },
    {
      id: 'aud-003',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      actor: { id: 'user-officer', name: 'Prof. Meera Sen', role: 'officer' },
      action: 'schedule.published',
      category: 'schedule',
      entity: { type: 'schedule', id: 'sched-v1', name: 'Published Schedule v1' },
      summary: 'Approved and published schedule version 1 for Day 1'
    }
  ];
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: 'step-req', title: 'Company Requirements', route: '/companies', state: 'complete', detail: '2 companies active' },
  { id: 'step-elg', title: 'Student Eligibility', route: '/eligibility', state: 'complete', detail: '40 eligible for Asteria' },
  { id: 'step-cap', title: 'Capacity Allocation', route: '/capacity', state: 'complete', detail: '10 selected, 30 waitlisted' },
  { id: 'step-sch', title: 'Interview Scheduling', route: '/schedule', state: 'complete', detail: 'Schedule v1 published' },
  { id: 'step-liv', title: 'Live Tracking', route: '/live', state: 'in_progress', detail: '3 rooms running' },
  { id: 'step-dis', title: 'Disruption Simulation', route: '/recovery', state: 'complete', detail: 'Sandboxed impact models' },
  { id: 'step-rec', title: 'Recovery Proposal', route: '/recovery', state: 'needs_attention', detail: '1 recovery alternative ready' },
  { id: 'step-app', title: 'Human Approval', route: '/approvals', state: 'needs_attention', detail: '1 proposal in queue' },
  { id: 'step-pub', title: 'Published Schedule', route: '/schedule?version=published', state: 'complete', detail: 'Version 1 active' }
];
