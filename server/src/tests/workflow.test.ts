import http from 'http';
import { app } from '../app.js';
import { pool } from '../db.js';

let server: http.Server;
const BASE_URL = 'http://localhost:4006/api';

async function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runWorkflow() {
  console.log('================================================================');
  console.log(' Placement Command — Real PostgreSQL Recovery Workflow Test');
  console.log('================================================================\n');

  await new Promise<void>((resolve) => {
    server = app.listen(4006, () => {
      resolve();
    });
  });

  // Login as Officer and Coordinator
  const offLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'officer@placement.example', password: 'Demo@2026!' })
  });
  const { token: officerToken } = await offLoginRes.json();

  const coordLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'coordinator@placement.example', password: 'Demo@2026!' })
  });
  const { token: coordToken } = await coordLoginRes.json();

  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@placement.example', password: 'Demo@2026!' })
  });
  const { token: adminToken } = await adminLoginRes.json();

  // 1. Check current interviews
  const interviewsRes = await fetch(`${BASE_URL}/interviews`, {
    headers: { Authorization: `Bearer ${coordToken}` }
  });
  const data = await interviewsRes.json();
  const interviews = Array.isArray(data) ? data : data.interviews || [];
  
  if (interviews.length === 0) {
    throw new Error('No interviews found in the DB. Did seed script run correctly?');
  }
  
  const targetId = interviews[0].id;
  const initialRoom = interviews[0].roomId;
  console.log(`✓ Step 1: Target interview identified (${targetId}, Room: ${initialRoom})`);
  
  // 2. Generate simulation
  const genRes = await fetch(`${BASE_URL}/recovery-proposals/generate`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${coordToken}`
    },
    body: JSON.stringify({ type: 'delay_student', targetId, delayMinutes: 60 })
  });
  const simulation = await genRes.json();
  assert(simulation.alternatives && simulation.alternatives.length > 0, 'No alternatives generated');
  const altId = simulation.alternatives[0].id;
  console.log(`✓ Step 2: Simulation generated with ${simulation.alternatives.length} recovery alternatives`);
  
  // 3. Create proposal (from Coordinator)
  const createRes = await fetch(`${BASE_URL}/recovery-proposals`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${coordToken}`
    },
    body: JSON.stringify({ 
      type: 'delay_student', 
      targetId, 
      delayMinutes: 60, 
      alternativeId: altId, 
      note: 'Needs 1 hr delay' 
    })
  });
  const proposal = await createRes.json();
  assert(proposal.status === 'pending_approval', 'Status should be pending_approval');
  console.log(`✓ Step 3: Proposal ${proposal.id} created in pending_approval state`);

  // 4. Try self approval (should fail with 403)
  const selfApproveRes = await fetch(`${BASE_URL}/recovery-proposals/${proposal.id}/decide`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${coordToken}`
    },
    body: JSON.stringify({ decision: 'approve' })
  });
  assert(selfApproveRes.status === 403, 'Creator self-approval should be rejected');
  console.log('✓ Step 4: Creator self-approval successfully rejected with HTTP 403');

  // 5. First distinct approval by Officer
  const approve1Res = await fetch(`${BASE_URL}/recovery-proposals/${proposal.id}/decide`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officerToken}`
    },
    body: JSON.stringify({ decision: 'approve', note: 'Officer approved' })
  });
  const approve1 = await approve1Res.json();
  assert(approve1.status === 'pending_approval', 'Should still be pending_approval after 1 approval');
  console.log('✓ Step 5: First distinct approval recorded (status remains pending_approval)');

  // 6. Second distinct approval by Admin
  const approve2Res = await fetch(`${BASE_URL}/recovery-proposals/${proposal.id}/decide`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ decision: 'approve', note: 'Admin concurrence' })
  });
  const approve2 = await approve2Res.json();
  assert(approve2.status === 'approved', 'Should be approved after 2 distinct approvals');
  console.log('✓ Step 6: Second distinct approval recorded (status transitions to approved)');

  // 7. Apply the approved proposal
  const applyRes = await fetch(`${BASE_URL}/recovery-proposals/${proposal.id}/apply`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officerToken}`
    }
  });
  assert(applyRes.status === 200, 'Apply should succeed');
  console.log('✓ Step 7: Approved proposal applied atomically to PostgreSQL schedule');

  // 8. Verify the updated schedule in Postgres
  const finalInterviewsRes = await fetch(`${BASE_URL}/interviews`, {
    headers: { Authorization: `Bearer ${coordToken}` }
  });
  const finalData = await finalInterviewsRes.json();
  const finalInterviews = Array.isArray(finalData) ? finalData : finalData.interviews || [];
  
  const shiftedId = proposal.diff_items[0].interviewId;
  const originalInterview = interviews.find((i: any) => i.id === shiftedId);
  const updatedInterview = finalInterviews.find((i: any) => i.id === shiftedId);
  
  assert(
    updatedInterview.scheduledStart !== originalInterview.scheduledStart || updatedInterview.roomId !== originalInterview.roomId,
    'Downstream interview was not moved in DB'
  );
  console.log(`✓ Step 8: Verified schedule shift committed to database`);

  // 9. Verify Audit and Notifications
  const auditRes = await fetch(`${BASE_URL}/audit`, {
    headers: { Authorization: `Bearer ${officerToken}` }
  });
  const audit = await auditRes.json();
  assert(audit.some((a: any) => a.entity_id === proposal.id && a.action === 'recovery.proposal_applied'), 'Missing apply audit log');

  const notifRes = await fetch(`${BASE_URL}/notifications/${interviews[0].studentId}`, {
    headers: { Authorization: `Bearer ${officerToken}` }
  });
  const notif = await notifRes.json();
  assert(notif.length > 0, 'Missing student notification');
  console.log('✓ Step 9: Verified audit log entry and persisted student notification');

  console.log('\n================================================================');
  console.log(' Workflow Verification Success: End-to-end recovery validated!');
  console.log('================================================================\n');

  server.close();
  await pool?.end();
  process.exit(0);
}

runWorkflow().catch(err => {
  console.error('Workflow error:', err);
  if (server) server.close();
  pool?.end();
  process.exit(1);
});
