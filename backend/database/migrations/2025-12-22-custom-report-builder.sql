-- Custom Report Builder System
-- Allows tenants to create and save custom reports
-- Fields are dynamically read from SystemProperty + Property tables

-- =============================================================================
-- REPORT DEFINITION TABLE
-- Stores saved custom report configurations
-- =============================================================================
CREATE TABLE IF NOT EXISTS "ReportDefinition" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id VARCHAR(50) UNIQUE NOT NULL, -- Prefixed ID like 'rpt_abc123'
  tenant_id UUID NOT NULL,

  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Data source
  data_source VARCHAR(50) NOT NULL, -- 'bookings', 'pets', 'owners', 'payments', 'services'

  -- Chart configuration
  chart_type VARCHAR(30) NOT NULL DEFAULT 'table', -- 'bar', 'line', 'pie', 'area', 'table', 'funnel', 'scatter'

  -- Field configuration (stored as JSON for flexibility)
  config JSONB NOT NULL DEFAULT '{}',
  -- Structure:
  -- {
  --   "xAxis": { "fieldKey": "created_at", "label": "Date Created" },
  --   "yAxis": { "fieldKey": "total_price", "aggregation": "SUM", "label": "Revenue" },
  --   "breakdown": { "fieldKey": "status", "label": "Status" },
  --   "filters": [
  --     { "fieldKey": "status", "operator": "equals", "value": "COMPLETED" }
  --   ],
  --   "dateRange": { "type": "relative", "value": "last30" },
  --   "sorting": { "field": "value", "direction": "desc" },
  --   "limit": 100
  -- }

  -- Sharing and permissions
  visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'team', 'public'

  -- User preferences
  is_favorite BOOLEAN DEFAULT false,
  folder_id UUID,

  -- Usage tracking
  last_run_at TIMESTAMPTZ,
  run_count INT DEFAULT 0,

  -- Ownership (no FK constraint - User table may not exist)
  created_by UUID,
  updated_by UUID,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_report_definition_tenant ON "ReportDefinition"(tenant_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_report_definition_user ON "ReportDefinition"(created_by, deleted_at);
CREATE INDEX IF NOT EXISTS idx_report_definition_data_source ON "ReportDefinition"(data_source);
CREATE INDEX IF NOT EXISTS idx_report_definition_record_id ON "ReportDefinition"(record_id);

-- =============================================================================
-- REPORT FOLDER TABLE (for organizing reports)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "ReportFolder" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,

  name VARCHAR(255) NOT NULL,
  parent_id UUID,

  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_folder_tenant ON "ReportFolder"(tenant_id);

-- =============================================================================
-- FUNCTION: Generate report record_id
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_report_record_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.record_id IS NULL THEN
    NEW.record_id := 'rpt_' || encode(gen_random_bytes(8), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_report_record_id
  BEFORE INSERT ON "ReportDefinition"
  FOR EACH ROW
  EXECUTE FUNCTION generate_report_record_id();

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE "ReportFieldDefinition" IS 'Defines available fields per data source for the custom report builder';
COMMENT ON TABLE "ReportDefinition" IS 'Stores saved custom report configurations';
COMMENT ON TABLE "ReportFolder" IS 'Organizes reports into folders';
