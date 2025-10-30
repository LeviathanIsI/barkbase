-- Property Change Audit Table
-- Complete audit trail for all property modifications
-- Implements Salesforce Field History Tracking pattern with extended retention

CREATE TABLE IF NOT EXISTS "PropertyChangeAudit" (
    "audit_id" BIGSERIAL PRIMARY KEY,
    
    -- Property Reference
    "property_id" VARCHAR(36) NOT NULL,
    
    -- Change Classification
    "change_type" VARCHAR(50) NOT NULL CHECK ("change_type" IN (
        'CREATE',
        'MODIFY',
        'ARCHIVE',
        'RESTORE',
        'DELETE',
        'TYPE_CHANGE',
        'PERMISSION_CHANGE',
        'DEPENDENCY_ADD',
        'DEPENDENCY_REMOVE',
        'APPROVAL_REQUEST',
        'APPROVAL_GRANTED',
        'APPROVAL_DENIED'
    )),
    
    -- State Snapshots (complete JSONB for point-in-time recovery)
    "before_value" JSONB,
    "after_value" JSONB,
    
    -- Specific Field Changes (for granular tracking)
    "changed_fields" JSONB DEFAULT '[]'::jsonb,
    
    -- Actor Information
    "changed_by" VARCHAR(100) NOT NULL,
    "changed_by_user_id" VARCHAR(36),
    "changed_by_email" VARCHAR(255),
    "changed_date" TIMESTAMP DEFAULT NOW(),
    
    -- Reason and Context
    "change_reason" TEXT,
    "change_context" JSONB DEFAULT '{}'::jsonb,
    
    -- Impact Assessment
    "affected_records_count" INTEGER DEFAULT 0,
    "impacted_properties" JSONB DEFAULT '[]'::jsonb,
    "risk_level" VARCHAR(20) CHECK ("risk_level" IN ('low', 'medium', 'high', 'critical', NULL)),
    
    -- Rollback Capability
    "rollback_script" TEXT,
    "is_rollback_available" BOOLEAN DEFAULT FALSE,
    "rolled_back_at" TIMESTAMP,
    "rolled_back_by" VARCHAR(100),
    
    -- Approval Workflow (for protected properties)
    "requires_approval" BOOLEAN DEFAULT FALSE,
    "approval_status" VARCHAR(50) CHECK ("approval_status" IN ('pending', 'approved', 'denied', 'expired', NULL)),
    "approved_by" VARCHAR(100),
    "approved_at" TIMESTAMP,
    "approval_comments" TEXT,
    
    -- Tenant Context
    "tenant_id" TEXT,
    
    -- Request Metadata
    "request_id" VARCHAR(36),
    "request_ip" VARCHAR(45),
    "user_agent" TEXT,
    
    -- Retention Management
    "retention_until" TIMESTAMP,
    "is_archived" BOOLEAN DEFAULT FALSE,
    "archived_at" TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY ("property_id") REFERENCES "PropertyMetadata"("property_id") ON DELETE CASCADE,
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("recordId") ON DELETE CASCADE
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS "idx_audit_property" ON "PropertyChangeAudit"("property_id", "changed_date" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_tenant" ON "PropertyChangeAudit"("tenant_id", "changed_date" DESC) WHERE "tenant_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_audit_change_type" ON "PropertyChangeAudit"("change_type", "changed_date" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_changed_by" ON "PropertyChangeAudit"("changed_by", "changed_date" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_approval" ON "PropertyChangeAudit"("approval_status", "changed_date" DESC) WHERE "requires_approval" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_audit_rollback" ON "PropertyChangeAudit"("property_id", "is_rollback_available") WHERE "is_rollback_available" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_audit_retention" ON "PropertyChangeAudit"("retention_until") WHERE "retention_until" IS NOT NULL AND "is_archived" = FALSE;

-- GIN Indexes for JSONB searches
CREATE INDEX IF NOT EXISTS "idx_audit_before_value" ON "PropertyChangeAudit" USING GIN ("before_value");
CREATE INDEX IF NOT EXISTS "idx_audit_after_value" ON "PropertyChangeAudit" USING GIN ("after_value");
CREATE INDEX IF NOT EXISTS "idx_audit_changed_fields" ON "PropertyChangeAudit" USING GIN ("changed_fields");

-- Partitioning by date for performance (optional, can be enabled later)
-- ALTER TABLE "PropertyChangeAudit" PARTITION BY RANGE ("changed_date");

-- Function to automatically set retention period based on change type
CREATE OR REPLACE FUNCTION set_audit_retention()
RETURNS TRIGGER AS $$
BEGIN
    -- Schema changes: permanent retention
    IF NEW."change_type" IN ('CREATE', 'TYPE_CHANGE', 'DELETE') THEN
        NEW."retention_until" = NULL;  -- Permanent
    
    -- Modification changes: 7 years (financial records compliance)
    ELSIF NEW."change_type" IN ('MODIFY', 'PERMISSION_CHANGE') THEN
        NEW."retention_until" = NOW() + INTERVAL '7 years';
    
    -- Archive/restore: 1 year
    ELSIF NEW."change_type" IN ('ARCHIVE', 'RESTORE') THEN
        NEW."retention_until" = NOW() + INTERVAL '1 year';
    
    -- Other changes: 90 days
    ELSE
        NEW."retention_until" = NOW() + INTERVAL '90 days';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_audit_retention
    BEFORE INSERT ON "PropertyChangeAudit"
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_retention();

-- Function to generate rollback script
CREATE OR REPLACE FUNCTION generate_rollback_script(audit_record RECORD)
RETURNS TEXT AS $$
DECLARE
    script TEXT;
BEGIN
    -- Generate SQL to revert the change
    script := format(
        'UPDATE "PropertyMetadata" SET %s WHERE "property_id" = %L;',
        (
            SELECT string_agg(
                format('%I = %L', key, value),
                ', '
            )
            FROM jsonb_each_text(audit_record.before_value)
        ),
        audit_record.property_id
    );
    
    RETURN script;
END;
$$ LANGUAGE plpgsql;

-- View for easy audit trail queries
CREATE OR REPLACE VIEW "PropertyAuditTrail" AS
SELECT 
    a."audit_id",
    a."property_id",
    p."property_name",
    p."display_label",
    p."object_type",
    a."change_type",
    a."changed_by",
    a."changed_date",
    a."change_reason",
    a."affected_records_count",
    a."approval_status",
    a."is_rollback_available",
    CASE 
        WHEN a."retention_until" IS NULL THEN 'Permanent'
        WHEN a."retention_until" < NOW() THEN 'Expired'
        ELSE 'Active'
    END AS "retention_status",
    a."risk_level"
FROM "PropertyChangeAudit" a
LEFT JOIN "PropertyMetadata" p ON a."property_id" = p."property_id"
ORDER BY a."changed_date" DESC;

-- Comments
COMMENT ON TABLE "PropertyChangeAudit" IS 'Complete audit trail for all property modifications with rollback capability and compliance retention';
COMMENT ON COLUMN "PropertyChangeAudit"."before_value" IS 'Complete JSONB snapshot before change for point-in-time recovery';
COMMENT ON COLUMN "PropertyChangeAudit"."after_value" IS 'Complete JSONB snapshot after change for impact analysis';
COMMENT ON COLUMN "PropertyChangeAudit"."rollback_script" IS 'Auto-generated SQL to revert the change';
COMMENT ON COLUMN "PropertyChangeAudit"."retention_until" IS 'Audit record retention deadline: NULL = permanent, date = archive after';
COMMENT ON COLUMN "PropertyChangeAudit"."risk_level" IS 'Assessed risk of the modification: low/medium/high/critical';

