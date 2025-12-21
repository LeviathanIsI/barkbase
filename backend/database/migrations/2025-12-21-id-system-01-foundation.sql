-- ============================================================================
-- BarkBase ID System Migration - Part 1: Foundation
-- ============================================================================
-- This migration adds the foundation for the new ID system:
-- 1. account_code column on Tenant table
-- 2. TenantSequence table for per-tenant sequence tracking
-- 3. next_record_id() function for atomic sequence generation
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add account_code to Tenant table
-- ============================================================================

-- Add the column (nullable initially for backfill)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS account_code VARCHAR(10);

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_account_code ON "Tenant"(account_code);

COMMENT ON COLUMN "Tenant".account_code IS 'Customer-facing account identifier in format BK-XXXXXX';

-- ============================================================================
-- 2. Create TenantSequence table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "TenantSequence" (
    tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
    object_type_code INTEGER NOT NULL,
    last_record_id BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tenant_id, object_type_code)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_sequence_tenant ON "TenantSequence"(tenant_id);

-- Update trigger for updated_at
CREATE OR REPLACE TRIGGER update_tenant_sequence_updated_at
    BEFORE UPDATE ON "TenantSequence"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE "TenantSequence" IS 'Tracks per-tenant sequences for each object type. Used to generate record_id values.';
COMMENT ON COLUMN "TenantSequence".object_type_code IS 'Object type code from objectTypes.js (e.g., 1=Owner, 2=Pet)';
COMMENT ON COLUMN "TenantSequence".last_record_id IS 'Last assigned record_id for this tenant/object_type combination';

-- ============================================================================
-- 3. Create next_record_id() function
-- ============================================================================

CREATE OR REPLACE FUNCTION next_record_id(
    p_tenant_id UUID,
    p_object_type_code INTEGER
) RETURNS BIGINT AS $$
DECLARE
    v_next_id BIGINT;
BEGIN
    -- Atomic insert-or-update to get next sequence value
    -- Uses INSERT ON CONFLICT for thread-safe operation
    INSERT INTO "TenantSequence" (tenant_id, object_type_code, last_record_id)
    VALUES (p_tenant_id, p_object_type_code, 1)
    ON CONFLICT (tenant_id, object_type_code)
    DO UPDATE SET
        last_record_id = "TenantSequence".last_record_id + 1,
        updated_at = NOW()
    RETURNING last_record_id INTO v_next_id;

    RETURN v_next_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION next_record_id(UUID, INTEGER) IS
    'Atomically generates the next record_id for a given tenant and object type. Thread-safe.';

-- ============================================================================
-- 4. Backfill account_code for existing tenants
-- ============================================================================

-- Generate unique account codes for all existing tenants
DO $$
DECLARE
    r RECORD;
    v_code VARCHAR(10);
    v_attempts INTEGER;
    v_max_attempts INTEGER := 20;
    v_charset VARCHAR(32) := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    v_exists BOOLEAN;
BEGIN
    FOR r IN SELECT id FROM "Tenant" WHERE account_code IS NULL LOOP
        v_attempts := 0;
        LOOP
            v_attempts := v_attempts + 1;

            -- Generate random 6-character code
            v_code := 'BK-';
            FOR i IN 1..6 LOOP
                v_code := v_code || substr(v_charset, floor(random() * 32 + 1)::int, 1);
            END LOOP;

            -- Check if code exists
            SELECT EXISTS(SELECT 1 FROM "Tenant" WHERE account_code = v_code) INTO v_exists;

            EXIT WHEN NOT v_exists OR v_attempts >= v_max_attempts;
        END LOOP;

        IF v_attempts >= v_max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique account code after % attempts', v_max_attempts;
        END IF;

        UPDATE "Tenant" SET account_code = v_code WHERE id = r.id;
        RAISE NOTICE 'Assigned account code % to tenant %', v_code, r.id;
    END LOOP;
END $$;

-- Now make account_code NOT NULL
ALTER TABLE "Tenant" ALTER COLUMN account_code SET NOT NULL;

-- ============================================================================
-- 5. Create helper function for tenant lookup by account_code
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_id_by_account_code(
    p_account_code VARCHAR(10)
) RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT id INTO v_tenant_id
    FROM "Tenant"
    WHERE account_code = UPPER(p_account_code);

    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tenant_id_by_account_code(VARCHAR) IS
    'Resolves account_code (e.g., BK-ABC123) to tenant_id UUID';

COMMIT;
