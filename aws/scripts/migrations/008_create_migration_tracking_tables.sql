-- Migration Tracking Tables
-- Support tables for migration orchestrator and rollout management

-- Migration History Table
CREATE TABLE IF NOT EXISTS "MigrationHistory" (
    "migration_id" VARCHAR(100) PRIMARY KEY,
    "migration_name" VARCHAR(255) NOT NULL,
    "target_version" INTEGER NOT NULL,
    "current_phase" VARCHAR(50) CHECK ("current_phase" IN (
        'pending', 'expanding', 'migrating', 'contracting', 'completed', 'failed', 'rolled_back'
    )),
    "status" VARCHAR(50) CHECK ("status" IN (
        'started', 'in_progress', 'completed', 'failed', 'rolled_back'
    )),
    
    -- Timestamps for each phase
    "started_at" TIMESTAMP,
    "expand_started_at" TIMESTAMP,
    "expand_completed_at" TIMESTAMP,
    "migrate_started_at" TIMESTAMP,
    "migrate_completed_at" TIMESTAMP,
    "contract_started_at" TIMESTAMP,
    "contract_completed_at" TIMESTAMP,
    "completed_at" TIMESTAMP,
    "rolled_back_at" TIMESTAMP,
    
    -- Configuration and plan
    "configuration" JSONB,
    "rollout_plan" JSONB,
    
    -- Error tracking
    "error_message" TEXT,
    "rollback_reason" TEXT,
    
    -- Metadata
    "created_by" VARCHAR(100),
    "notes" TEXT
);

-- Migration Rollout Log Table
CREATE TABLE IF NOT EXISTS "MigrationRolloutLog" (
    "log_id" SERIAL PRIMARY KEY,
    "migration_id" VARCHAR(100) NOT NULL,
    "rollout_group" VARCHAR(50) NOT NULL,
    
    -- Execution
    "executed_at" TIMESTAMP DEFAULT NOW(),
    "status" VARCHAR(50) CHECK ("status" IN (
        'started', 'in_progress', 'completed', 'failed', 'rolled_back'
    )),
    
    -- Metrics
    "tenants_affected" INTEGER,
    "success_count" INTEGER DEFAULT 0,
    "failure_count" INTEGER DEFAULT 0,
    
    -- Rollback
    "rolled_back_at" TIMESTAMP,
    "rollback_reason" TEXT,
    
    -- Health metrics
    "avg_error_rate" DECIMAL(5,2),
    "max_error_rate" DECIMAL(5,2),
    
    FOREIGN KEY ("migration_id") REFERENCES "MigrationHistory"("migration_id") ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_migration_history_status" ON "MigrationHistory"("status", "started_at");
CREATE INDEX IF NOT EXISTS "idx_migration_history_phase" ON "MigrationHistory"("current_phase");
CREATE INDEX IF NOT EXISTS "idx_migration_rollout_log_migration" ON "MigrationRolloutLog"("migration_id", "rollout_group");
CREATE INDEX IF NOT EXISTS "idx_migration_rollout_log_status" ON "MigrationRolloutLog"("status", "executed_at");

-- Comments
COMMENT ON TABLE "MigrationHistory" IS 'Tracks schema migration execution across all phases';
COMMENT ON TABLE "MigrationRolloutLog" IS 'Logs rollout execution per tenant group with health metrics';

