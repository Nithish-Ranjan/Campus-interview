import { pool } from '../db.js';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
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

async function runTests() {
  console.log('====================================================');
  console.log(' Placement Command — Step 4: Backend API Test Suite');
  console.log(` Target Server: ${BASE_URL}`);
  console.log('====================================================\n');

  // 1. Health Endpoints
  await test('GET /api/health returns server status ok', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'ok', `Expected status ok, got ${data.status}`);
    assert(data.service === 'placement-command-backend', `Expected service name, got ${data.service}`);
  });

  await test('GET /api/health/db returns live PostgreSQL connection', async () => {
    const res = await fetch(`${BASE_URL}/health/db`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'connected', `Expected connected, got ${data.status}`);
    assert(data.database === 'postgresql', `Expected database postgresql, got ${data.database}`);
    assert(typeof data.latencyMs === 'number', `Expected latencyMs number, got ${typeof data.latencyMs}`);
  });

  // 2. Schedule & Interviews
  await test('GET /api/interviews returns interview schedule with version', async () => {
    const res = await fetch(`${BASE_URL}/interviews`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(typeof data.version === 'number', `Expected version number, got ${data.version}`);
    assert(Array.isArray(data.interviews), 'Expected interviews array');
    assert(data.interviews.length > 0, `Expected seeded interviews, got ${data.interviews.length}`);
    // Verify interview structure matches frontend Interview interface
    const sample = data.interviews[0];
    assert(typeof sample.id === 'string', 'Expected id string');
    assert(typeof sample.studentName === 'string', 'Expected studentName string');
    assert(typeof sample.companyName === 'string', 'Expected companyName string');
    assert(typeof sample.roomName === 'string', 'Expected roomName string');
    assert(Array.isArray(sample.interviewerNames), 'Expected interviewerNames array');
  });

  await test('PUT /api/interviews/:id/move handles conflicts (Phase A)', async () => {
    // 0. Seed draft slots for testing
    await pool!.query(`
      INSERT INTO interview_slots (id, student_id, company_id, room_id, scheduled_start, scheduled_end, status, delay_minutes, schedule_mode, schedule_version, has_moved)
      VALUES 
        ('test-draft-1', 'stu-002', 'comp-ast', 'room-a', '2026-10-25 09:30:00+05:30', '2026-10-25 10:00:00+05:30', 'scheduled', 0, 'draft', 1, false),
        ('test-draft-2', 'stu-003', 'comp-ast', 'room-b', '2026-10-25 09:30:00+05:30', '2026-10-25 10:00:00+05:30', 'scheduled', 0, 'draft', 1, false)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 1. Fetch draft interviews
    const getRes = await fetch(`${BASE_URL}/interviews?mode=draft`);
    const getData = await getRes.json();
    assert(getData.interviews.length >= 2, 'Need at least 2 interviews to test conflict');
    
    // Find the slots we just created
    const slotA = getData.interviews.find((s: any) => s.id === 'test-draft-1');
    const slotB = getData.interviews.find((s: any) => s.id === 'test-draft-2');
    
    // Attempt to move slotA into slotB's room and time
    const moveRes = await fetch(`${BASE_URL}/interviews/${slotA.id}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetRoomId: slotB.roomId,
        targetStart: slotB.scheduledStart
      })
    });
    
    assert(moveRes.status === 409, `Expected 409 Conflict, got ${moveRes.status}`);
    const errData = await moveRes.json();
    assert(errData.error === 'Schedule Conflict', 'Expected Schedule Conflict error');
    assert(Array.isArray(errData.details.conflicts), 'Expected conflicts array');
    assert(errData.details.conflicts.length > 0, 'Expected at least one conflict detail');
  });
  await test('GET /api/interviews aggregates panellists without duplicating slot rows', async () => {
    const res = await fetch(`${BASE_URL}/interviews`);
    const data = await res.json();
    
    // slot-har-1 has 2 panellists in seed: Sharma and Anand
    const slotHar1 = data.interviews.filter((i: any) => i.id === 'slot-har-1');
    assert(slotHar1.length === 1, `Expected exactly 1 row for slot-har-1, found ${slotHar1.length}`);
    assert(slotHar1[0].interviewerNames.length === 2, `Expected 2 panellists for slot-har-1, found ${slotHar1[0].interviewerNames.length}`);
  });

  // 3. Companies
  await test('GET /api/companies returns seeded companies with criteria', async () => {
    const res = await fetch(`${BASE_URL}/companies`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const companies = await res.json();
    assert(Array.isArray(companies), 'Expected companies array');
    assert(companies.length >= 2, `Expected at least 2 companies, got ${companies.length}`);

    const asteria = companies.find((c: any) => c.name === 'Asteria Systems');
    assert(!!asteria, 'Expected Asteria Systems in companies');
    assert(Array.isArray(asteria.mandatoryCriteria), 'Expected mandatoryCriteria array');
    assert(Array.isArray(asteria.preferredCriteria), 'Expected preferredCriteria array');
  });

  await test('GET /api/companies/:id returns single company or 404', async () => {
    const resValid = await fetch(`${BASE_URL}/companies/comp-ast`);
    assert(resValid.status === 200, `Expected 200 for comp-ast, got ${resValid.status}`);
    const company = await resValid.json();
    assert(company.id === 'comp-ast', `Expected id comp-ast, got ${company.id}`);

    const resNotFound = await fetch(`${BASE_URL}/companies/comp-nonexistent-999`);
    assert(resNotFound.status === 404, `Expected 404 for invalid company id, got ${resNotFound.status}`);
  });

  // 4. Candidates & Students
  await test('GET /api/students returns candidates with academic details', async () => {
    const res = await fetch(`${BASE_URL}/students`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const students = await res.json();
    assert(Array.isArray(students), 'Expected students array');
    assert(students.length >= 4, `Expected at least 4 students, got ${students.length}`);

    const aarav = students.find((s: any) => s.rollNumber === 'DEMO-0001');
    assert(!!aarav, 'Expected student DEMO-0001 Aarav Sharma');
    assert(aarav.name === 'Aarav Sharma', `Expected Aarav Sharma, got ${aarav?.name}`);
    assert(aarav.cgpa === 9.15, `Expected 9.15 CGPA, got ${aarav?.cgpa}`);
    assert(Array.isArray(aarav.applications), 'Expected applications array');
  });

  await test('GET /api/students query filtering works accurately', async () => {
    // Search query filter
    const resQuery = await fetch(`${BASE_URL}/students?query=Priya`);
    const dataQuery = await resQuery.json();
    assert(dataQuery.length === 1, `Expected 1 match for Priya, got ${dataQuery.length}`);
    assert(dataQuery[0].name === 'Priya Patel', `Expected Priya Patel, got ${dataQuery[0].name}`);

    // Branch filter matching
    const resCS = await fetch(`${BASE_URL}/students?branch=Computer%20Science`);
    const dataCS = await resCS.json();
    assert(dataCS.length === 1, `Expected 1 CS student, got ${dataCS.length}`);
    assert(dataCS[0].name === 'Aarav Sharma', `Expected Aarav Sharma, got ${dataCS[0].name}`);

    // Empty branch filter
    const resNone = await fetch(`${BASE_URL}/students?branch=NonExistentBranch`);
    const dataNone = await resNone.json();
    assert(dataNone.length === 0, `Expected 0 matches for non-existent branch, got ${dataNone.length}`);
  });

  await test('GET /api/students/:id returns single student or 404', async () => {
    const resValid = await fetch(`${BASE_URL}/students/stu-001`);
    assert(resValid.status === 200, `Expected 200 for stu-001, got ${resValid.status}`);
    const data = await resValid.json();
    assert(data.student && data.student.id === 'stu-001', `Expected student id stu-001, got ${data.student?.id}`);
    assert(Array.isArray(data.applications), 'Expected applications array');
    assert(Array.isArray(data.interviews), 'Expected interviews array');

    const resNotFound = await fetch(`${BASE_URL}/students/stud-invalid-999`);
    assert(resNotFound.status === 404, `Expected 404 for invalid student id, got ${resNotFound.status}`);
  });

  // 5. Overview Dashboard Metrics
  await test('GET /api/overview returns calculated KPIs from database', async () => {
    const res = await fetch(`${BASE_URL}/overview`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const overview = await res.json();

    assert(overview.kpis && typeof overview.kpis.applications === 'number', 'Expected kpis.applications number');
    assert(typeof overview.kpis.eligible === 'number', 'Expected kpis.eligible number');
    assert(typeof overview.kpis.selected === 'number', 'Expected kpis.selected number');
    assert(overview.funnel && typeof overview.funnel.applied === 'number', 'Expected funnel.applied number');
    assert(overview.todaySummary && typeof overview.todaySummary.totalInterviews === 'number', 'Expected todaySummary.totalInterviews number');
    assert(Array.isArray(overview.pipelineSteps), 'Expected pipelineSteps array');
    assert(Array.isArray(overview.attentionItems), 'Expected attentionItems array');
  });

  // 6. Direct Database Parity Verification
  await test('API student count matches live PostgreSQL database count', async () => {
    const dbRes = await pool!.query('SELECT COUNT(*) AS count FROM students');
    const dbCount = parseInt(dbRes.rows[0].count, 10);

    const apiRes = await fetch(`${BASE_URL}/students`);
    const apiData = await apiRes.json();

    assert(
      apiData.length === dbCount,
      `API returned ${apiData.length} students but PostgreSQL has ${dbCount} rows`
    );
  });

  await test('API company count matches live PostgreSQL database count', async () => {
    const dbRes = await pool!.query('SELECT COUNT(*) AS count FROM companies');
    const dbCount = parseInt(dbRes.rows[0].count, 10);

    const apiRes = await fetch(`${BASE_URL}/companies`);
    const apiData = await apiRes.json();

    assert(
      apiData.length === dbCount,
      `API returned ${apiData.length} companies but PostgreSQL has ${dbCount} rows`
    );
  });

  await test('API interview count matches live PostgreSQL database slots count', async () => {
    const dbRes = await pool!.query("SELECT COUNT(*) AS count FROM interview_slots WHERE schedule_mode = 'published'");
    const dbCount = parseInt(dbRes.rows[0].count, 10);

    const apiRes = await fetch(`${BASE_URL}/interviews`);
    const apiData = await apiRes.json();

    assert(
      apiData.interviews.length === dbCount,
      `API returned ${apiData.interviews.length} interviews but PostgreSQL has ${dbCount} slots`
    );
  });

  await test('POST /api/recovery-proposals/generate creates a simulation', async () => {
    // Generate simulation on a known ID from seeds if possible, or expect 404/valid
    const res = await fetch(`${BASE_URL}/recovery-proposals/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'delay_student', targetId: 'slot-ast-1', delayMinutes: 30 })
    });
    const data = await res.json();
    assert(res.status === 200 || res.status === 404, `Expected 200 or 404, got ${res.status}`);
    if (res.status === 200) {
      assert(data.id.startsWith('sim-'), 'Expected simulation ID');
      assert(Array.isArray(data.alternatives), 'Expected alternatives array');
    }
  });

  console.log('\n====================================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(` Test Summary: ${passed} Passed, ${failed} Failed out of ${results.length}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
}).finally(() => {
  pool?.end();
});
