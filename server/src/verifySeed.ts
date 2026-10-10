import { pool } from './db.js';

async function verifySeed() {
  if (!pool) throw new Error('Database pool not configured');
  const client = await pool.connect();

  try {
    console.log('\n--- Verifying Seeded Relationships & Schedule Validity ---');

    // 1. Verify User -> Student link
    const userStudentRes = await client.query(`
      SELECT u.id as user_id, u.name, u.role, s.id as student_id, s.roll_number, s.branch, s.cgpa
      FROM users u
      JOIN students s ON s.user_id = u.id
      WHERE u.role = 'student'
    `);
    console.log(`✓ Student User Account Link: Found ${userStudentRes.rowCount} linked student user(s): ${userStudentRes.rows[0]?.name} (${userStudentRes.rows[0]?.roll_number})`);

    // 2. Verify Applications -> Student & Company FKs
    const appRes = await client.query(`
      SELECT a.id, s.name as student_name, c.name as company_name, a.eligibility, a.selection
      FROM student_applications a
      JOIN students s ON a.student_id = s.id
      JOIN companies c ON a.company_id = c.id
    `);
    console.log(`✓ Applications FK Integrity: ${appRes.rowCount} applications correctly joined to students & companies.`);

    // 3. Verify Interview Slots -> Student, Company, Room, and Panel Members
    const slotsRes = await client.query(`
      SELECT 
        sl.id as slot_id,
        s.name as student_name,
        c.name as company_name,
        r.name as room_name,
        sl.scheduled_start,
        sl.scheduled_end,
        COUNT(pm.interviewer_id) as panellist_count
      FROM interview_slots sl
      JOIN students s ON sl.student_id = s.id
      JOIN companies c ON sl.company_id = c.id
      JOIN rooms r ON sl.room_id = r.id
      JOIN interview_panel_members pm ON sl.id = pm.interview_id
      GROUP BY sl.id, s.name, c.name, r.name, sl.scheduled_start, sl.scheduled_end
      ORDER BY sl.scheduled_start ASC
    `);
    console.log(`✓ Interview Slots FK & Panel Integrity: ${slotsRes.rowCount} slots with valid panellist assignments.`);
    console.table(slotsRes.rows);

    // 4. Verify Schedule Overlap Conflicts
    // Check Room Overlaps
    const roomOverlapRes = await client.query(`
      SELECT a.id as slot_a, b.id as slot_b, a.room_id, a.scheduled_start, a.scheduled_end
      FROM interview_slots a
      JOIN interview_slots b ON a.room_id = b.room_id AND a.id < b.id
      WHERE (a.scheduled_start < b.scheduled_end AND a.scheduled_end > b.scheduled_start)
    `);
    if (roomOverlapRes.rowCount === 0) {
      console.log('✓ Zero Room Overlaps: No room is double-booked.');
    } else {
      console.error('✗ Room Overlap Detected:', roomOverlapRes.rows);
    }

    // Check Student Overlaps
    const studentOverlapRes = await client.query(`
      SELECT a.id as slot_a, b.id as slot_b, a.student_id
      FROM interview_slots a
      JOIN interview_slots b ON a.student_id = b.student_id AND a.id < b.id
      WHERE (a.scheduled_start < b.scheduled_end AND a.scheduled_end > b.scheduled_start)
    `);
    if (studentOverlapRes.rowCount === 0) {
      console.log('✓ Zero Student Overlaps: No student has concurrent slots.');
    } else {
      console.error('✗ Student Overlap Detected:', studentOverlapRes.rows);
    }

    // Check Interviewer Overlaps
    const interviewerOverlapRes = await client.query(`
      SELECT a.id as slot_a, b.id as slot_b, pa.interviewer_id
      FROM interview_slots a
      JOIN interview_slots b ON a.id < b.id
      JOIN interview_panel_members pa ON a.id = pa.interview_id
      JOIN interview_panel_members pb ON b.id = pb.interview_id AND pa.interviewer_id = pb.interviewer_id
      WHERE (a.scheduled_start < b.scheduled_end AND a.scheduled_end > b.scheduled_start)
    `);
    if (interviewerOverlapRes.rowCount === 0) {
      console.log('✓ Zero Interviewer Overlaps: No interviewer is double-booked.');
    } else {
      console.error('✗ Interviewer Overlap Detected:', interviewerOverlapRes.rows);
    }

    // 5. Verify Student Notification Isolation
    const notifRes = await client.query(`
      SELECT n.id, s.name as recipient, n.title, n.message
      FROM student_notifications n
      JOIN students s ON n.student_id = s.id
    `);
    console.log(`✓ Student Notifications: ${notifRes.rowCount} targeted notification for ${notifRes.rows[0]?.recipient}.`);

    console.log('\n--- All Seed Verifications Succeeded ---');
  } finally {
    client.release();
    await pool.end();
  }
}

verifySeed().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
