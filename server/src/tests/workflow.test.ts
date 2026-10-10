import { pool } from '../db.js';

const BASE_URL = 'http://localhost:4000/api';

async function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runWorkflow() {
  console.log('--- Starting Postgres Workflow Verification ---');
  
  // 1. Check current interviews
  const interviewsRes = await fetch(`${BASE_URL}/interviews`);
  const data = await interviewsRes.json();
  const interviews = Array.isArray(data) ? data : data.interviews || [];
  
  if (interviews.length === 0) {
    console.log('Interviews Response:', JSON.stringify(data, null, 2));
    throw new Error('No interviews found in the DB. Did seed script run correctly?');
  }
  
  const targetId = interviews[0].id;
  const initialRoom = interviews[0].roomId;
  console.log(`Target Interview: ${targetId}, Room: ${initialRoom}`);
  
  // 2. Generate simulation
  const genRes = await fetch(`${BASE_URL}/recovery-proposals/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'delay_student', targetId, delayMinutes: 60 })
  });
  const simulation = await genRes.json();
  if (!simulation.alternatives) {
    console.log('Simulation response:', simulation);
  }
  assert(simulation.alternatives && simulation.alternatives.length > 0, 'No alternatives generated');
  const altId = simulation.alternatives[0].id;
  
  // 3. Create proposal (from user-admin)
  const createRes = await fetch(`${BASE_URL}/recovery-proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-actor-id': 'user-admin', 'x-actor-name': 'Creator' },
    body: JSON.stringify({ 
      type: 'delay_student', 
      targetId, 
      delayMinutes: 60,
      alternativeId: altId,
      note: 'Needs 1 hr delay'
    })
  });
  const proposal = await createRes.json();
  if (createRes.status !== 200 && createRes.status !== 201) {
    console.log('Create Proposal Error:', proposal);
  }
  console.log(`Created proposal ${proposal.id} with shifts:`, JSON.stringify(proposal.diff_items, null, 2));
  assert(proposal.status === 'pending_approval', 'Status should be pending_approval');

  // 4. Try self approval (should fail)
  const selfApproveRes = await fetch(`${BASE_URL}/recovery-proposals/${proposal.id}/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-actor-id': 'user-admin' },
    body: JSON.stringify({ decision: 'approve' })
  });
  assert(selfApproveRes.status === 403, 'Creator self-approval should be rejected');
  console.log('Self-approval rejected successfully');

  // 5. First distinct approval
  const approve1Res = await fetch(`${BASE_URL}/recovery-proposals/${proposal.id}/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-actor-id': 'user-officer', 'x-actor-name': 'Approver 1' },
    body: JSON.stringify({ decision: 'approve', note: 'LGTM' })
  });
  const approve1 = await approve1Res.json();
  assert(approve1.status === 'pending_approval', 'Should still be pending_approval after 1 approval');
  console.log('First distinct approval recorded');

  // 6. Second distinct approval
  const approve2Res = await fetch(`${BASE_URL}/recovery-proposals/${proposal.id}/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-actor-id': 'user-coord', 'x-actor-name': 'Approver 2' },
    body: JSON.stringify({ decision: 'approve', note: 'I concur' })
  });
  const approve2 = await approve2Res.json();
  assert(approve2.status === 'approved', 'Should be approved after 2 distinct approvals');
  console.log('Second distinct approval recorded. Proposal is approved.');

  // 7. Apply the approved proposal
  const applyRes = await fetch(`${BASE_URL}/recovery-proposals/${proposal.id}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-actor-id': 'user-officer', 'x-actor-name': 'Approver 2' }
  });
  if (applyRes.status !== 200) {
    console.log('Apply Error:', await applyRes.json());
  }
  assert(applyRes.status === 200, 'Apply should succeed');
  console.log('Applied approved proposal');

  // 8. Verify the updated schedule in Postgres
  const finalInterviewsRes = await fetch(`${BASE_URL}/interviews`);
  const finalData = await finalInterviewsRes.json();
  const finalInterviews = Array.isArray(finalData) ? finalData : finalData.interviews || finalData.items || [];
  
  const shiftedId = proposal.diff_items[0].interviewId;
  const originalInterview = interviews.find((i: any) => i.id === shiftedId);
  const updatedInterview = finalInterviews.find((i: any) => i.id === shiftedId);
  
  assert(updatedInterview.scheduledStart !== originalInterview.scheduledStart || updatedInterview.roomId !== originalInterview.roomId, 'Downstream interview was not moved in DB');
  console.log(`Verified downstream interview moved in DB. New Start: ${updatedInterview.scheduledStart}, New Room: ${updatedInterview.roomId}`);

  // 9. Verify Audit and Notifications
  const auditRes = await fetch(`${BASE_URL}/audit`);
  const audit = await auditRes.json();
  assert(audit.some((a: any) => a.entity_id === proposal.id && a.action === 'recovery.proposal_applied'), 'Missing apply audit log');

  const notifRes = await fetch(`${BASE_URL}/notifications/${interviews[0].studentId}`);
  const notif = await notifRes.json();
  assert(notif.length > 0 && notif[0].title === 'Schedule Updated', 'Missing student notification');
  console.log('Verified audit logs and student notifications were committed.');

  console.log('--- Workflow Verification Success ---');
  process.exit(0);
}

runWorkflow().catch(err => {
  console.error('Workflow error:', err);
  process.exit(1);
}).finally(() => pool?.end());
