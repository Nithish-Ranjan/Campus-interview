CREATE TABLE IF NOT EXISTS proposal_approvals (
    id VARCHAR(64) PRIMARY KEY,
    proposal_id VARCHAR(64) NOT NULL REFERENCES recovery_proposals(id) ON DELETE CASCADE,
    actor_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    decision VARCHAR(32) NOT NULL CHECK (decision IN ('approve', 'reject')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(proposal_id, actor_id)
);
