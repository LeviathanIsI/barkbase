-- Custom Report Builder System
-- Allows tenants to create custom reports with dynamic field selection and aggregation

-- =============================================================================
-- REPORT FIELD DEFINITION TABLE
-- Defines available fields per data source that can be used in reports
-- =============================================================================
CREATE TABLE IF NOT EXISTS "ReportFieldDefinition" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Data source (which table/entity this field belongs to)
  data_source VARCHAR(50) NOT NULL, -- 'bookings', 'pets', 'owners', 'payments', 'services', 'invoices'

  -- Field identification
  field_key VARCHAR(100) NOT NULL, -- 'status', 'total_price', 'created_at', etc.
  field_label VARCHAR(255) NOT NULL, -- 'Booking Status', 'Total Price', 'Date Created'

  -- Field categorization
  field_type VARCHAR(30) NOT NULL, -- 'dimension' or 'measure'
  data_type VARCHAR(30) NOT NULL, -- 'string', 'number', 'date', 'boolean', 'currency'

  -- Database mapping
  source_table VARCHAR(100) NOT NULL, -- Actual table name in database
  source_column VARCHAR(100), -- Actual column name (null for computed fields)

  -- For computed dimensions (like day_of_week from a date)
  is_computed BOOLEAN DEFAULT false,
  compute_expression TEXT, -- SQL expression for computed fields
  -- Example: "EXTRACT(DOW FROM created_at)" for day_of_week

  -- Grouping for UI
  field_group VARCHAR(100), -- 'Date Properties', 'Financial', 'Status', etc.

  -- For measures: default aggregation
  default_aggregation VARCHAR(20), -- 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'

  -- Formatting hints
  format_pattern VARCHAR(100), -- '$#,##0.00' for currency, 'MMM d, yyyy' for dates

  -- Ordering
  display_order INT DEFAULT 0,

  -- Active status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  CONSTRAINT report_field_unique UNIQUE (data_source, field_key)
);

-- Index for quick lookup by data source
CREATE INDEX IF NOT EXISTS idx_report_field_data_source ON "ReportFieldDefinition"(data_source, is_active);

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
