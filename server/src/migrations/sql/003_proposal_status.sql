ALTER TABLE recovery_proposals DROP CONSTRAINT IF EXISTS recovery_proposals_status_check;
ALTER TABLE recovery_proposals ADD CONSTRAINT recovery_proposals_status_check CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'stale', 'applied'));
