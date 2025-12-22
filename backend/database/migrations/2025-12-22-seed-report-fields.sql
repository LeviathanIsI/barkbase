-- Seed Report Field Definitions
-- Defines all available fields for the custom report builder

-- =============================================================================
-- BOOKINGS DATA SOURCE
-- =============================================================================
INSERT INTO "ReportFieldDefinition" (data_source, field_key, field_label, field_type, data_type, source_table, source_column, field_group, default_aggregation, format_pattern, display_order)
VALUES
  -- Dimensions
  ('bookings', 'status', 'Booking Status', 'dimension', 'string', 'Booking', 'status', 'Booking Properties', NULL, NULL, 1),
  ('bookings', 'booking_type', 'Booking Type', 'dimension', 'string', 'Booking', 'booking_type', 'Booking Properties', NULL, NULL, 2),
  ('bookings', 'service_name', 'Service Name', 'dimension', 'string', 'Service', 'name', 'Service', NULL, NULL, 3),
  ('bookings', 'pet_name', 'Pet Name', 'dimension', 'string', 'Pet', 'name', 'Pet', NULL, NULL, 4),
  ('bookings', 'pet_species', 'Pet Species', 'dimension', 'string', 'Pet', 'species', 'Pet', NULL, NULL, 5),
  ('bookings', 'pet_breed', 'Pet Breed', 'dimension', 'string', 'Pet', 'breed', 'Pet', NULL, NULL, 6),
  ('bookings', 'owner_name', 'Owner Name', 'dimension', 'string', 'Owner', 'full_name', 'Owner', NULL, NULL, 7),
  ('bookings', 'created_at', 'Date Created', 'dimension', 'date', 'Booking', 'created_at', 'Date Properties', NULL, 'MMM d, yyyy', 10),
  ('bookings', 'check_in_date', 'Check-in Date', 'dimension', 'date', 'Booking', 'check_in_date', 'Date Properties', NULL, 'MMM d, yyyy', 11),
  ('bookings', 'check_out_date', 'Check-out Date', 'dimension', 'date', 'Booking', 'check_out_date', 'Date Properties', NULL, 'MMM d, yyyy', 12),

  -- Measures
  ('bookings', 'count', 'Booking Count', 'measure', 'number', 'Booking', 'id', 'Metrics', 'COUNT', '#,##0', 20),
  ('bookings', 'total_price', 'Total Revenue', 'measure', 'currency', 'Booking', 'total_price_cents', 'Financial', 'SUM', '$#,##0.00', 21),
  ('bookings', 'avg_booking_value', 'Average Booking Value', 'measure', 'currency', 'Booking', 'total_price_cents', 'Financial', 'AVG', '$#,##0.00', 22),
  ('bookings', 'nights_stayed', 'Nights Stayed', 'measure', 'number', 'Booking', 'nights', 'Metrics', 'SUM', '#,##0', 23)
ON CONFLICT (data_source, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  data_type = EXCLUDED.data_type,
  source_table = EXCLUDED.source_table,
  source_column = EXCLUDED.source_column,
  field_group = EXCLUDED.field_group,
  default_aggregation = EXCLUDED.default_aggregation,
  format_pattern = EXCLUDED.format_pattern,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Computed date dimensions for bookings
INSERT INTO "ReportFieldDefinition" (data_source, field_key, field_label, field_type, data_type, source_table, source_column, field_group, is_computed, compute_expression, display_order)
VALUES
  ('bookings', 'created_day_of_week', 'Day of Week (Created)', 'dimension', 'string', 'Booking', 'created_at', 'Date Properties', true, 'TO_CHAR(created_at, ''Day'')', 13),
  ('bookings', 'created_month', 'Month (Created)', 'dimension', 'string', 'Booking', 'created_at', 'Date Properties', true, 'TO_CHAR(created_at, ''Mon YYYY'')', 14),
  ('bookings', 'created_quarter', 'Quarter (Created)', 'dimension', 'string', 'Booking', 'created_at', 'Date Properties', true, '''Q'' || EXTRACT(QUARTER FROM created_at) || '' '' || EXTRACT(YEAR FROM created_at)', 15),
  ('bookings', 'created_year', 'Year (Created)', 'dimension', 'number', 'Booking', 'created_at', 'Date Properties', true, 'EXTRACT(YEAR FROM created_at)', 16)
ON CONFLICT (data_source, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  is_computed = EXCLUDED.is_computed,
  compute_expression = EXCLUDED.compute_expression,
  updated_at = NOW();

-- =============================================================================
-- PETS DATA SOURCE
-- =============================================================================
INSERT INTO "ReportFieldDefinition" (data_source, field_key, field_label, field_type, data_type, source_table, source_column, field_group, default_aggregation, format_pattern, display_order)
VALUES
  -- Dimensions
  ('pets', 'species', 'Species', 'dimension', 'string', 'Pet', 'species', 'Pet Properties', NULL, NULL, 1),
  ('pets', 'breed', 'Breed', 'dimension', 'string', 'Pet', 'breed', 'Pet Properties', NULL, NULL, 2),
  ('pets', 'sex', 'Sex', 'dimension', 'string', 'Pet', 'sex', 'Pet Properties', NULL, NULL, 3),
  ('pets', 'is_neutered', 'Neutered/Spayed', 'dimension', 'boolean', 'Pet', 'is_neutered', 'Pet Properties', NULL, NULL, 4),
  ('pets', 'status', 'Status', 'dimension', 'string', 'Pet', 'status', 'Pet Properties', NULL, NULL, 5),
  ('pets', 'owner_name', 'Owner Name', 'dimension', 'string', 'Owner', 'full_name', 'Owner', NULL, NULL, 6),
  ('pets', 'created_at', 'Date Added', 'dimension', 'date', 'Pet', 'created_at', 'Date Properties', NULL, 'MMM d, yyyy', 10),

  -- Measures
  ('pets', 'count', 'Pet Count', 'measure', 'number', 'Pet', 'id', 'Metrics', 'COUNT', '#,##0', 20),
  ('pets', 'avg_weight', 'Average Weight', 'measure', 'number', 'Pet', 'weight_lbs', 'Metrics', 'AVG', '#,##0.0 lbs', 21)
ON CONFLICT (data_source, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  data_type = EXCLUDED.data_type,
  source_table = EXCLUDED.source_table,
  source_column = EXCLUDED.source_column,
  field_group = EXCLUDED.field_group,
  default_aggregation = EXCLUDED.default_aggregation,
  format_pattern = EXCLUDED.format_pattern,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- =============================================================================
-- OWNERS DATA SOURCE
-- =============================================================================
INSERT INTO "ReportFieldDefinition" (data_source, field_key, field_label, field_type, data_type, source_table, source_column, field_group, default_aggregation, format_pattern, display_order)
VALUES
  -- Dimensions
  ('owners', 'status', 'Status', 'dimension', 'string', 'Owner', 'status', 'Owner Properties', NULL, NULL, 1),
  ('owners', 'city', 'City', 'dimension', 'string', 'Owner', 'city', 'Location', NULL, NULL, 2),
  ('owners', 'state', 'State', 'dimension', 'string', 'Owner', 'state', 'Location', NULL, NULL, 3),
  ('owners', 'source', 'Lead Source', 'dimension', 'string', 'Owner', 'source', 'Marketing', NULL, NULL, 4),
  ('owners', 'created_at', 'Date Added', 'dimension', 'date', 'Owner', 'created_at', 'Date Properties', NULL, 'MMM d, yyyy', 10),

  -- Measures
  ('owners', 'count', 'Owner Count', 'measure', 'number', 'Owner', 'id', 'Metrics', 'COUNT', '#,##0', 20),
  ('owners', 'pet_count', 'Total Pets', 'measure', 'number', 'Pet', 'id', 'Metrics', 'COUNT', '#,##0', 21)
ON CONFLICT (data_source, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  data_type = EXCLUDED.data_type,
  source_table = EXCLUDED.source_table,
  source_column = EXCLUDED.source_column,
  field_group = EXCLUDED.field_group,
  default_aggregation = EXCLUDED.default_aggregation,
  format_pattern = EXCLUDED.format_pattern,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- =============================================================================
-- PAYMENTS DATA SOURCE
-- =============================================================================
INSERT INTO "ReportFieldDefinition" (data_source, field_key, field_label, field_type, data_type, source_table, source_column, field_group, default_aggregation, format_pattern, display_order)
VALUES
  -- Dimensions
  ('payments', 'status', 'Payment Status', 'dimension', 'string', 'Payment', 'status', 'Payment Properties', NULL, NULL, 1),
  ('payments', 'payment_method', 'Payment Method', 'dimension', 'string', 'Payment', 'payment_method', 'Payment Properties', NULL, NULL, 2),
  ('payments', 'owner_name', 'Owner Name', 'dimension', 'string', 'Owner', 'full_name', 'Owner', NULL, NULL, 3),
  ('payments', 'created_at', 'Payment Date', 'dimension', 'date', 'Payment', 'created_at', 'Date Properties', NULL, 'MMM d, yyyy', 10),

  -- Measures
  ('payments', 'count', 'Payment Count', 'measure', 'number', 'Payment', 'id', 'Metrics', 'COUNT', '#,##0', 20),
  ('payments', 'amount', 'Total Amount', 'measure', 'currency', 'Payment', 'amount_cents', 'Financial', 'SUM', '$#,##0.00', 21),
  ('payments', 'avg_amount', 'Average Payment', 'measure', 'currency', 'Payment', 'amount_cents', 'Financial', 'AVG', '$#,##0.00', 22)
ON CONFLICT (data_source, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  data_type = EXCLUDED.data_type,
  source_table = EXCLUDED.source_table,
  source_column = EXCLUDED.source_column,
  field_group = EXCLUDED.field_group,
  default_aggregation = EXCLUDED.default_aggregation,
  format_pattern = EXCLUDED.format_pattern,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- =============================================================================
-- SERVICES DATA SOURCE
-- =============================================================================
INSERT INTO "ReportFieldDefinition" (data_source, field_key, field_label, field_type, data_type, source_table, source_column, field_group, default_aggregation, format_pattern, display_order)
VALUES
  -- Dimensions
  ('services', 'name', 'Service Name', 'dimension', 'string', 'Service', 'name', 'Service Properties', NULL, NULL, 1),
  ('services', 'category', 'Category', 'dimension', 'string', 'Service', 'category', 'Service Properties', NULL, NULL, 2),
  ('services', 'is_active', 'Active Status', 'dimension', 'boolean', 'Service', 'is_active', 'Service Properties', NULL, NULL, 3),

  -- Measures
  ('services', 'count', 'Service Count', 'measure', 'number', 'Service', 'id', 'Metrics', 'COUNT', '#,##0', 20),
  ('services', 'base_price', 'Base Price', 'measure', 'currency', 'Service', 'base_price_cents', 'Financial', 'AVG', '$#,##0.00', 21),
  ('services', 'booking_count', 'Times Booked', 'measure', 'number', 'Booking', 'id', 'Metrics', 'COUNT', '#,##0', 22)
ON CONFLICT (data_source, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  data_type = EXCLUDED.data_type,
  source_table = EXCLUDED.source_table,
  source_column = EXCLUDED.source_column,
  field_group = EXCLUDED.field_group,
  default_aggregation = EXCLUDED.default_aggregation,
  format_pattern = EXCLUDED.format_pattern,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- =============================================================================
-- INVOICES DATA SOURCE
-- =============================================================================
INSERT INTO "ReportFieldDefinition" (data_source, field_key, field_label, field_type, data_type, source_table, source_column, field_group, default_aggregation, format_pattern, display_order)
VALUES
  -- Dimensions
  ('invoices', 'status', 'Invoice Status', 'dimension', 'string', 'Invoice', 'status', 'Invoice Properties', NULL, NULL, 1),
  ('invoices', 'owner_name', 'Owner Name', 'dimension', 'string', 'Owner', 'full_name', 'Owner', NULL, NULL, 2),
  ('invoices', 'created_at', 'Invoice Date', 'dimension', 'date', 'Invoice', 'created_at', 'Date Properties', NULL, 'MMM d, yyyy', 10),
  ('invoices', 'due_date', 'Due Date', 'dimension', 'date', 'Invoice', 'due_date', 'Date Properties', NULL, 'MMM d, yyyy', 11),

  -- Measures
  ('invoices', 'count', 'Invoice Count', 'measure', 'number', 'Invoice', 'id', 'Metrics', 'COUNT', '#,##0', 20),
  ('invoices', 'total_amount', 'Total Amount', 'measure', 'currency', 'Invoice', 'total_cents', 'Financial', 'SUM', '$#,##0.00', 21),
  ('invoices', 'avg_amount', 'Average Invoice', 'measure', 'currency', 'Invoice', 'total_cents', 'Financial', 'AVG', '$#,##0.00', 22),
  ('invoices', 'amount_paid', 'Amount Paid', 'measure', 'currency', 'Invoice', 'paid_cents', 'Financial', 'SUM', '$#,##0.00', 23)
ON CONFLICT (data_source, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  data_type = EXCLUDED.data_type,
  source_table = EXCLUDED.source_table,
  source_column = EXCLUDED.source_column,
  field_group = EXCLUDED.field_group,
  default_aggregation = EXCLUDED.default_aggregation,
  format_pattern = EXCLUDED.format_pattern,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();
