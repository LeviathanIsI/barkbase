-- Property History System
-- Tracks field changes for HubSpot-style historical filter operators:
-- HAS_EVER_BEEN_EQUAL_TO, HAS_NEVER_CONTAINED, UPDATED_IN_LAST_X_DAYS

-- =============================================================================
-- PROPERTY HISTORY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "PropertyHistory" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT NOT NULL,
  property_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID,

  CONSTRAINT property_history_entity_type_check CHECK (
    entity_type IN ('pet', 'owner', 'booking', 'invoice', 'payment', 'task')
  )
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary query: find all historical values for a field on an entity
CREATE INDEX IF NOT EXISTS idx_property_history_entity_field
ON "PropertyHistory"(tenant_id, entity_type, entity_id, property_name, changed_at DESC);

-- Query for HAS_EVER_BEEN_EQUAL_TO: find if field ever had a specific value
CREATE INDEX IF NOT EXISTS idx_property_history_value_lookup
ON "PropertyHistory"(tenant_id, entity_type, entity_id, property_name, new_value);

-- Query for UPDATED_IN_LAST_X_DAYS: find recent changes
CREATE INDEX IF NOT EXISTS idx_property_history_recent
ON "PropertyHistory"(tenant_id, entity_type, entity_id, changed_at DESC);

-- Cleanup old history (optional retention policy)
CREATE INDEX IF NOT EXISTS idx_property_history_cleanup
ON "PropertyHistory"(changed_at);

-- =============================================================================
-- TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION log_property_changes()
RETURNS TRIGGER AS $$
DECLARE
  col_name TEXT;
  old_val TEXT;
  new_val TEXT;
  entity_type_name TEXT;
  tenant_id_val UUID;
BEGIN
  -- Determine entity type from table name
  entity_type_name := LOWER(TG_TABLE_NAME);

  -- Get tenant_id
  IF TG_OP = 'DELETE' THEN
    tenant_id_val := OLD.tenant_id;
  ELSE
    tenant_id_val := NEW.tenant_id;
  END IF;

  -- Skip if no tenant_id
  IF tenant_id_val IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- For INSERT, log all non-null values as new
  IF TG_OP = 'INSERT' THEN
    FOR col_name IN
      SELECT column_name FROM information_schema.columns
      WHERE table_name = TG_TABLE_NAME
      AND column_name NOT IN ('id', 'tenant_id', 'created_at', 'updated_at', 'deleted_at')
    LOOP
      EXECUTE format('SELECT ($1).%I::TEXT', col_name) INTO new_val USING NEW;
      IF new_val IS NOT NULL THEN
        INSERT INTO "PropertyHistory" (tenant_id, entity_type, entity_id, property_name, old_value, new_value)
        VALUES (tenant_id_val, entity_type_name, NEW.record_id, col_name, NULL, new_val);
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  -- For UPDATE, log changed values
  IF TG_OP = 'UPDATE' THEN
    FOR col_name IN
      SELECT column_name FROM information_schema.columns
      WHERE table_name = TG_TABLE_NAME
      AND column_name NOT IN ('id', 'tenant_id', 'created_at', 'updated_at', 'deleted_at')
    LOOP
      EXECUTE format('SELECT ($1).%I::TEXT', col_name) INTO old_val USING OLD;
      EXECUTE format('SELECT ($1).%I::TEXT', col_name) INTO new_val USING NEW;

      -- Only log if value actually changed
      IF old_val IS DISTINCT FROM new_val THEN
        INSERT INTO "PropertyHistory" (tenant_id, entity_type, entity_id, property_name, old_value, new_value)
        VALUES (tenant_id_val, entity_type_name, NEW.record_id, col_name, old_val, new_val);
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS ON KEY TABLES
-- =============================================================================

-- Pet table
DROP TRIGGER IF EXISTS trg_pet_property_history ON "Pet";
CREATE TRIGGER trg_pet_property_history
AFTER INSERT OR UPDATE ON "Pet"
FOR EACH ROW EXECUTE FUNCTION log_property_changes();

-- Owner table
DROP TRIGGER IF EXISTS trg_owner_property_history ON "Owner";
CREATE TRIGGER trg_owner_property_history
AFTER INSERT OR UPDATE ON "Owner"
FOR EACH ROW EXECUTE FUNCTION log_property_changes();

-- Booking table
DROP TRIGGER IF EXISTS trg_booking_property_history ON "Booking";
CREATE TRIGGER trg_booking_property_history
AFTER INSERT OR UPDATE ON "Booking"
FOR EACH ROW EXECUTE FUNCTION log_property_changes();

-- Invoice table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Invoice') THEN
    DROP TRIGGER IF EXISTS trg_invoice_property_history ON "Invoice";
    CREATE TRIGGER trg_invoice_property_history
    AFTER INSERT OR UPDATE ON "Invoice"
    FOR EACH ROW EXECUTE FUNCTION log_property_changes();
  END IF;
END $$;

-- Payment table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Payment') THEN
    DROP TRIGGER IF EXISTS trg_payment_property_history ON "Payment";
    CREATE TRIGGER trg_payment_property_history
    AFTER INSERT OR UPDATE ON "Payment"
    FOR EACH ROW EXECUTE FUNCTION log_property_changes();
  END IF;
END $$;

-- Task table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Task') THEN
    DROP TRIGGER IF EXISTS trg_task_property_history ON "Task";
    CREATE TRIGGER trg_task_property_history
    AFTER INSERT OR UPDATE ON "Task"
    FOR EACH ROW EXECUTE FUNCTION log_property_changes();
  END IF;
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE "PropertyHistory" IS 'Tracks field changes for historical filter operators';
COMMENT ON COLUMN "PropertyHistory".entity_type IS 'Type of entity: pet, owner, booking, etc.';
COMMENT ON COLUMN "PropertyHistory".property_name IS 'Name of the changed field/column';
COMMENT ON COLUMN "PropertyHistory".old_value IS 'Previous value (NULL for INSERT)';
COMMENT ON COLUMN "PropertyHistory".new_value IS 'New value after change';
COMMENT ON FUNCTION log_property_changes() IS 'Trigger function that logs property changes to PropertyHistory';
