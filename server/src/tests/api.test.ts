import http from 'http';
import { app } from '../app.js';
import { pool } from '../db.js';

let server: http.Server;
let BASE_URL = 'http://localhost:4005/api';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message });
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// Helper to login and get session token
async function loginAs(email: string, password = 'Demo@2026!') {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  console.log('================================================================');
  console.log(' Placement Command PRD v1.2 — Comprehensive Test Suite');
  console.log('================================================================\n');

  // Start internal test server on port 4005
  await new Promise<void>((resolve) => {
    server = app.listen(4005, () => {
      console.log(`[Test Runner] Test server listening on http://localhost:4005\n`);
      resolve();
    });
  });

  // 1. System Health Probes
  await test('GET /api/health returns server status ok', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'ok', `Expected status ok, got ${data.status}`);
    assert(data.service === 'placement-command-backend', `Expected service name, got ${data.service}`);
  });

  await test('GET /api/health/db returns live PostgreSQL connection with latency', async () => {
    const res = await fetch(`${BASE_URL}/health/db`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'connected', `Expected connected, got ${data.status}`);
    assert(data.database === 'postgresql', `Expected postgresql, got ${data.database}`);
    assert(typeof data.latencyMs === 'number', `Expected latencyMs number`);
  });

  // 2. Authentication & Session Management (AT-AUTH-01 & AT-AUTH-02)
  let adminToken = '';
  let officerToken = '';
  let coordToken = '';
  let panelToken = '';
  let studentToken = '';

  await test('AT-AUTH-01: Invalid credentials return 401 generic error', async () => {
    const { status, data } = await loginAs('admin@placement.example', 'WrongPassword123!');
    assert(status === 401, `Expected 401, got ${status}`);
    assert(data.error === 'Invalid email or password', `Expected generic error message, got ${data.error}`);
  });

  await test('AT-AUTH-02: All 5 roles log in successfully with verified server roles', async () => {
    // 1. Admin
    const adminRes = await loginAs('admin@placement.example');
    assert(adminRes.status === 200, `Admin login failed: ${adminRes.status}`);
    assert(adminRes.data.user.role === 'admin', `Expected admin role, got ${adminRes.data.user.role}`);
    adminToken = adminRes.data.token;

    // 2. Officer
    const officerRes = await loginAs('officer@placement.example');
    assert(officerRes.status === 200, `Officer login failed: ${officerRes.status}`);
    assert(officerRes.data.user.role === 'officer', `Expected officer role, got ${officerRes.data.user.role}`);
    officerToken = officerRes.data.token;

    // 3. Coordinator
    const coordRes = await loginAs('coordinator@placement.example');
    assert(coordRes.status === 200, `Coordinator login failed: ${coordRes.status}`);
    assert(coordRes.data.user.role === 'coordinator', `Expected coordinator role, got ${coordRes.data.user.role}`);
    coordToken = coordRes.data.token;

    // 4. Panel Coordinator
    const panelRes = await loginAs('panel@placement.example');
    assert(panelRes.status === 200, `Panel login failed: ${panelRes.status}`);
    assert(panelRes.data.user.role === 'panel_coordinator', `Expected panel_coordinator role, got ${panelRes.data.user.role}`);
    panelToken = panelRes.data.token;

    // 5. Student
    const studentRes = await loginAs('student@placement.example');
    assert(studentRes.status === 200, `Student login failed: ${studentRes.status}`);
    assert(studentRes.data.user.role === 'student', `Expected student role, got ${studentRes.data.user.role}`);
    assert(studentRes.data.user.studentId === 'stu-001', `Expected studentId stu-001, got ${studentRes.data.user.studentId}`);
    studentToken = studentRes.data.token;
  });

  await test('GET /api/auth/me resolves authenticated user session and logout revokes it', async () => {
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(meRes.status === 200, `Expected 200, got ${meRes.status}`);
    const meData = await meRes.json();
    assert(meData.user.email === 'student@placement.example', `Expected student email`);

    // Logout
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(logoutRes.status === 200, `Logout expected 200, got ${logoutRes.status}`);

    // Revoked token should now return 401
    const postLogout = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(postLogout.status === 401, `Revoked token should be 401, got ${postLogout.status}`);

    // Re-login student to get active token for subsequent tests
    const reLogin = await loginAs('student@placement.example');
    studentToken = reLogin.data.token;
  });

  // 3. Unauthenticated & Role Authorization Guards (AT-AUTH-03 & AT-AUTH-04)
  await test('AT-AUTH-03: Unauthenticated requests to protected endpoints return 401', async () => {
    const resStudents = await fetch(`${BASE_URL}/students`);
    assert(resStudents.status === 401, `Expected 401 for /students without token, got ${resStudents.status}`);

    const resOverview = await fetch(`${BASE_URL}/overview`);
    assert(resOverview.status === 401, `Expected 401 for /overview without token, got ${resOverview.status}`);

    const resUsers = await fetch(`${BASE_URL}/users`);
    assert(resUsers.status === 401, `Expected 401 for /users without token, got ${resUsers.status}`);

    const resAudit = await fetch(`${BASE_URL}/audit`);
    assert(resAudit.status === 401, `Expected 401 for /audit without token, got ${resAudit.status}`);
  });

  await test('AT-AUTH-04: Forbidden role actions return 403', async () => {
    // Student trying to access coordinator overview -> 403
    const stuOverview = await fetch(`${BASE_URL}/overview`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(stuOverview.status === 403, `Student on overview expected 403, got ${stuOverview.status}`);

    // Student trying to access user administration -> 403
    const stuUsers = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(stuUsers.status === 403, `Student on users expected 403, got ${stuUsers.status}`);

    // Officer trying to access user administration -> 403 (admin only)
    const offUsers = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    assert(offUsers.status === 403, `Officer on users expected 403, got ${offUsers.status}`);

    // Panel coordinator trying to list global student directory -> 403
    const panelStudents = await fetch(`${BASE_URL}/students`, {
      headers: { Authorization: `Bearer ${panelToken}` }
    });
    assert(panelStudents.status === 403, `Panel coordinator on /students expected 403, got ${panelStudents.status}`);
  });

  // 4. Student Privacy & Data Isolation (AT-PRIV-01, AT-PRIV-02, AT-PRIV-03, AT-PRIV-04)
  await test('AT-PRIV-01: Student A (stu-001) cannot access Student B (stu-002) records', async () => {
    // Accessing own profile stu-001 -> 200
    const ownRes = await fetch(`${BASE_URL}/students/stu-001`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(ownRes.status === 200, `Expected 200 for own profile, got ${ownRes.status}`);

    // Accessing /api/students/me -> 200
    const meRes = await fetch(`${BASE_URL}/students/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(meRes.status === 200, `Expected 200 for /students/me, got ${meRes.status}`);

    // Attempting to access other student stu-002 -> 403 FORBIDDEN
    const otherRes = await fetch(`${BASE_URL}/students/stu-002`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(otherRes.status === 403, `Expected 403 for student accessing another student, got ${otherRes.status}`);

    // Attempting to fetch other student notifications -> 403 FORBIDDEN
    const otherNotifs = await fetch(`${BASE_URL}/notifications/stu-002`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(otherNotifs.status === 403, `Expected 403 for other notifications, got ${otherNotifs.status}`);
  });

  await test('AT-PRIV-03: Placement Officer and Coordinator have authorized candidate directory access', async () => {
    const offRes = await fetch(`${BASE_URL}/students`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    assert(offRes.status === 200, `Expected 200 for Officer /students, got ${offRes.status}`);
    const offData = await offRes.json();
    assert(Array.isArray(offData) && offData.length >= 10, `Expected 10+ students, got ${offData.length}`);

    const coordRes = await fetch(`${BASE_URL}/students`, {
      headers: { Authorization: `Bearer ${coordToken}` }
    });
    assert(coordRes.status === 200, `Expected 200 for Coordinator /students, got ${coordRes.status}`);
  });

  await test('AT-PRIV-04: Admin does not receive unrestricted candidate profiles by default', async () => {
    const adminStudents = await fetch(`${BASE_URL}/students`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminStudents.status === 403, `Admin on /students expected 403 per PRD matrix, got ${adminStudents.status}`);
  });

  // 5. Student Self-Service & Private Resume Upload (AT-STU-01 to AT-STU-05)
  await test('AT-STU-01: Student portal /api/students/me returns verified profile & applications', async () => {
    const res = await fetch(`${BASE_URL}/students/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.student.id === 'stu-001', `Expected stu-001, got ${data.student.id}`);
    assert(data.student.rollNumber === 'DEMO-0001', `Expected DEMO-0001, got ${data.student.rollNumber}`);
    assert(data.student.academicYear === '4th Year', `Expected 4th Year, got ${data.student.academicYear}`);
    assert(Array.isArray(data.applications) && data.applications.length > 0, `Expected applications`);
    assert(Array.isArray(data.interviews), `Expected interviews array`);
    assert(Array.isArray(data.notifications), `Expected notifications array`);
  });

  await test('AT-STU-02: Student self-service editing allows phone/skills but rejects academic tampering', async () => {
    const updateRes = await fetch(`${BASE_URL}/students/me`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}` 
      },
      body: JSON.stringify({
        phone: '+91 9876543210',
        skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
        cgpa: 10.0, // Attempted tamper - should be ignored/rejected
        backlogs: 0
      })
    });
    assert(updateRes.status === 200, `Expected 200, got ${updateRes.status}`);

    // Verify CGPA was NOT modified
    const checkRes = await fetch(`${BASE_URL}/students/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const checkData = await checkRes.json();
    assert(checkData.student.phone === '+91 9876543210', `Expected updated phone`);
    assert(checkData.student.cgpa === 9.15, `CGPA must remain 9.15, got ${checkData.student.cgpa}`);
  });

  await test('AT-STU-04: Non-PDF resume upload is rejected with HTTP 415', async () => {
    const fakeTextFile = new Blob(['This is a plain text file pretending to be a resume.'], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('resume', fakeTextFile, 'resume.txt');

    const res = await fetch(`${BASE_URL}/students/me/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: formData
    });
    assert(res.status === 415, `Expected 415 for non-PDF, got ${res.status}`);
  });

  await test('AT-STU-03: Valid PDF upload succeeds, stores privately, and is downloadable', async () => {
    // Minimal valid PDF binary
    const minimalPdf = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n206\n%%EOF';
    const pdfBlob = new Blob([minimalPdf], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('resume', pdfBlob, 'Aarav_Sharma_Resume.pdf');

    const uploadRes = await fetch(`${BASE_URL}/students/me/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: formData
    });
    assert(uploadRes.status === 200, `Expected 200 for PDF upload, got ${uploadRes.status}`);
    const uploadData = await uploadRes.json();
    assert(uploadData.success === true, `Expected upload success`);
    assert(typeof uploadData.hash === 'string', `Expected SHA-256 hash`);

    // Download own resume
    const downloadRes = await fetch(`${BASE_URL}/students/me/resume`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(downloadRes.status === 200, `Expected 200 for download, got ${downloadRes.status}`);
    assert(downloadRes.headers.get('content-type') === 'application/pdf', `Expected application/pdf header`);
  });

  // 6. Gemini AI Explainable Match Analysis (AT-AI-01, AT-AI-04, AT-AI-05)
  await test('AT-AI-04 & AT-AI-05: AI Match Analysis returns structured explainable report with deterministic hard gates', async () => {
    // Eligible student match
    const matchRes = await fetch(`${BASE_URL}/ai/match/stu-001/comp-ast`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${coordToken}` }
    });
    assert(matchRes.status === 200, `Expected 200 for AI match, got ${matchRes.status}`);
    const report = await matchRes.json();

    assert(report.mandatoryPassed === true, `Expected mandatoryPassed true for stu-001`);
    assert(report.eligibility === 'eligible', `Expected eligibility eligible`);
    assert(typeof report.matchScore === 'number', `Expected matchScore number`);
    assert(Array.isArray(report.matchingSkills), `Expected matchingSkills array`);
    assert(report.matchingSkills.length > 0, `Expected at least one matching skill with evidence`);
    assert(typeof report.matchingSkills[0].skill === 'string', `Expected skill string`);
    assert(typeof report.matchingSkills[0].evidence === 'string', `Expected evidence string`);
    assert(typeof report.advisoryDisclaimer === 'string', `Expected advisory disclaimer`);

    // Ineligible student match (stu-010 has CGPA 7.20 < 7.5 minimum and 1 backlog for Asteria Systems)
    const ineligRes = await fetch(`${BASE_URL}/ai/match/stu-010/comp-ast`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${coordToken}` }
    });
    assert(ineligRes.status === 200, `Expected 200 for inelig match, got ${ineligRes.status}`);
    const ineligReport = await ineligRes.json();

    assert(ineligReport.mandatoryPassed === false, `Ineligible student must fail mandatoryPassed`);
    assert(ineligReport.eligibility === 'ineligible', `Eligibility must be ineligible`);
    assert(ineligReport.mandatoryReasons.length > 0, `Must provide deterministic failure reasons`);
    console.log(`    (Deterministic gate verified: ${ineligReport.mandatoryReasons.join('; ')})`);
  });

  // 7. Coordinator Analytics & PostgreSQL Dashboard Parity (AT-ANA-01 to AT-ANA-04)
  await test('AT-ANA-01 to AT-ANA-04: Coordinator overview returns live database aggregates and charts', async () => {
    const res = await fetch(`${BASE_URL}/overview`, {
      headers: { Authorization: `Bearer ${coordToken}` }
    });
    assert(res.status === 200, `Expected 200 for /overview, got ${res.status}`);
    const data = await res.json();

    assert(data.dataSource === 'postgres', `Expected postgres dataSource, got ${data.dataSource}`);
    assert(typeof data.kpis.totalRegisteredStudents === 'number', `Expected totalRegisteredStudents`);
    assert(typeof data.kpis.applications === 'number', `Expected applications count`);
    assert(typeof data.kpis.eligible === 'number', `Expected eligible count`);
    assert(typeof data.kpis.selected === 'number', `Expected selected count`);

    // Verify Charts
    assert(Array.isArray(data.charts.byAcademicYear), `Expected byAcademicYear chart array`);
    assert(data.charts.byAcademicYear.length >= 2, `Expected 3rd & 4th year cohort counts`);

    assert(Array.isArray(data.charts.byBranch), `Expected byBranch chart array`);
    assert(data.charts.byBranch.length >= 4, `Expected at least 4 branches`);

    assert(Array.isArray(data.charts.byCollege), `Expected byCollege chart array`);
    assert(data.charts.byCollege[0].collegeName === 'Apex Institute of Technology', `Expected college name`);

    assert(Array.isArray(data.charts.interviewTimeline), `Expected interviewTimeline array`);
    assert(Array.isArray(data.charts.conflicts), `Expected conflicts array`);
  });

  // 8. Scheduling & Recovery Approvals Integrity (AT-SCH-01 to AT-SCH-07)
  await test('AT-SCH-01: Conflicting interview move is rejected with HTTP 409', async () => {
    // Attempting to move draft interview slot into occupied room & time
    const res = await fetch(`${BASE_URL}/interviews/slot-ast-1/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetRoomId: 'room-b',
        targetStart: '2026-10-25T09:30:00+05:30'
      })
    });
    // In published mode or draft conflict, returns 409
    assert(res.status === 409 || res.status === 400, `Expected conflict rejection, got ${res.status}`);
  });

  await test('AT-SCH-03 to AT-SCH-07: Recovery proposal generation, creator self-approval rejection, and 2-key approval', async () => {
    // 1. Generate simulation
    const genRes = await fetch(`${BASE_URL}/recovery-proposals/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'delay_student', targetId: 'slot-ast-1', delayMinutes: 30 })
    });
    assert(genRes.status === 200, `Expected 200 for simulation generate, got ${genRes.status}`);
    const sim = await genRes.json();
    assert(Array.isArray(sim.alternatives) && sim.alternatives.length > 0, `Expected alternatives`);
    const validAlt = sim.alternatives.find((a: any) => a.isValid);
    assert(!!validAlt, `Expected at least one valid alternative`);

    // 2. Create proposal from Coordinator
    const createRes = await fetch(`${BASE_URL}/recovery-proposals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${coordToken}`
      },
      body: JSON.stringify({
        type: 'delay_student',
        targetId: 'slot-ast-1',
        delayMinutes: 30,
        alternativeId: validAlt.id,
        note: 'Delay student 30 mins'
      })
    });
    assert(createRes.status === 201 || createRes.status === 200, `Expected proposal creation success, got ${createRes.status}`);
    const proposal = await createRes.json();
    assert(proposal.status === 'pending_approval', `Expected pending_approval, got ${proposal.status}`);

    // 3. Creator self-approval rejected with 403
    const selfApprove = await fetch(`${BASE_URL}/recovery-proposals/${proposal.id}/decide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${coordToken}`
      },
      body: JSON.stringify({ decision: 'approve', note: 'Self approve attempt' })
    });
    assert(selfApprove.status === 403, `Creator self approval must be 403, got ${selfApprove.status}`);

    // 4. First distinct approval by Officer
    const app1 = await fetch(`${BASE_URL}/recovery-proposals/${proposal.id}/decide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify({ decision: 'approve', note: 'Officer approval 1' })
    });
    assert(app1.status === 200, `Expected 200 for first approval, got ${app1.status}`);
    const app1Data = await app1.json();
    assert(app1Data.status === 'pending_approval', `Still pending after 1 approval`);

    // 5. Second distinct approval by Admin
    const app2 = await fetch(`${BASE_URL}/recovery-proposals/${proposal.id}/decide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ decision: 'approve', note: 'Admin approval 2' })
    });
    assert(app2.status === 200, `Expected 200 for second approval, got ${app2.status}`);
    const app2Data = await app2.json();
    assert(app2Data.status === 'approved', `Approved after 2 distinct approvals`);
  });

  console.log('\n================================================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(` Test Summary: ${passed} Passed, ${failed} Failed out of ${results.length}`);
  console.log('================================================================\n');

  // Teardown
  server.close();
  await pool?.end();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  if (server) server.close();
  pool?.end();
  process.exit(1);
});
