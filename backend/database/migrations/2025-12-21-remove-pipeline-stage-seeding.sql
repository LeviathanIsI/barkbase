-- ============================================================================
-- Migration: Fix seed_object_settings_for_tenant() to use record_id schema
-- Purpose: Rewrite function to use new (tenant_id, record_id) primary keys
-- Date: 2025-12-21
-- ============================================================================
-- Object Type Codes (from objectTypes.js and db.js):
--   ObjectSettings: 71
--   ObjectAssociation: 72
--   ObjectPipeline: 73
--   PipelineStage: 74
--   ObjectStatus: 75
--   ObjectIndexSettings: 78
--   ObjectRecordLayout: 79
--   ObjectPreviewLayout: 95
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_object_settings_for_tenant(p_tenant_id UUID)
RETURNS void AS $$
DECLARE
    v_pipeline_uuid UUID;
BEGIN
    -- =========================================================================
    -- OBJECT SETTINGS (code 71)
    -- =========================================================================
    INSERT INTO "ObjectSettings" (tenant_id, record_id, object_type, singular_name, plural_name, description, icon, primary_display_property, secondary_display_properties, default_status)
    VALUES
        (p_tenant_id, next_record_id(p_tenant_id, 71), 'owners', 'Owner', 'Owners', 'Pet owners and their contact information', 'User', 'name', '["email", "phone"]', 'active'),
        (p_tenant_id, next_record_id(p_tenant_id, 71), 'pets', 'Pet', 'Pets', 'Pet records and their information', 'PawPrint', 'name', '["breed", "species"]', 'active'),
        (p_tenant_id, next_record_id(p_tenant_id, 71), 'bookings', 'Booking', 'Bookings', 'Reservation and booking records', 'CalendarDays', 'bookingNumber', '["checkIn", "checkOut"]', NULL),
        (p_tenant_id, next_record_id(p_tenant_id, 71), 'services', 'Service', 'Services', 'Service offerings and pricing', 'Wrench', 'name', '["price", "duration"]', 'active'),
        (p_tenant_id, next_record_id(p_tenant_id, 71), 'facilities', 'Facility', 'Facilities', 'Kennels, runs, and accommodations', 'Building', 'name', '["type", "capacity"]', 'active'),
        (p_tenant_id, next_record_id(p_tenant_id, 71), 'packages', 'Package', 'Packages', 'Prepaid packages and subscriptions', 'Package', 'name', '["price", "credits"]', 'active'),
        (p_tenant_id, next_record_id(p_tenant_id, 71), 'invoices', 'Invoice', 'Invoices', 'Billing invoices and statements', 'FileText', 'invoiceNumber', '["amount", "dueDate"]', NULL),
        (p_tenant_id, next_record_id(p_tenant_id, 71), 'payments', 'Payment', 'Payments', 'Payment transactions', 'CreditCard', 'transactionId', '["amount", "method"]', NULL),
        (p_tenant_id, next_record_id(p_tenant_id, 71), 'tickets', 'Ticket', 'Tickets', 'Support tickets and issues', 'Ticket', 'ticketNumber', '["subject", "priority"]', NULL)
    ON CONFLICT (tenant_id, object_type) DO NOTHING;

    -- =========================================================================
    -- OBJECT ASSOCIATIONS (code 72)
    -- =========================================================================
    INSERT INTO "ObjectAssociation" (tenant_id, record_id, source_object, target_object, cardinality, source_label, target_label, is_system)
    VALUES
        -- Owners associations
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'owners', 'pets', 'one_to_many', 'Owner''s Pets', 'Pet Owner', true),
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'owners', 'bookings', 'one_to_many', 'Owner''s Bookings', 'Booking Owner', true),
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'owners', 'invoices', 'one_to_many', 'Owner''s Invoices', 'Invoice Owner', true),
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'owners', 'packages', 'one_to_many', 'Owner''s Packages', 'Package Owner', true),
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'owners', 'tickets', 'one_to_many', 'Owner''s Tickets', 'Ticket Owner', true),
        -- Pets associations
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'pets', 'bookings', 'many_to_many', 'Pet''s Bookings', 'Booked Pets', true),
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'pets', 'tickets', 'one_to_many', 'Pet''s Tickets', 'Related Pet', true),
        -- Bookings associations
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'bookings', 'services', 'many_to_many', 'Booking Services', 'Service Bookings', true),
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'bookings', 'facilities', 'many_to_one', 'Assigned Facility', 'Facility Bookings', true),
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'bookings', 'invoices', 'one_to_many', 'Booking Invoices', 'Related Booking', true),
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'bookings', 'tickets', 'one_to_many', 'Booking Tickets', 'Related Booking', true),
        -- Services associations
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'services', 'packages', 'many_to_many', 'Included in Packages', 'Package Services', true),
        -- Invoices associations
        (p_tenant_id, next_record_id(p_tenant_id, 72), 'invoices', 'payments', 'one_to_many', 'Invoice Payments', 'Payment Invoice', true)
    ON CONFLICT DO NOTHING;

    -- =========================================================================
    -- OBJECT STATUSES (code 75)
    -- =========================================================================
    -- Owners statuses
    INSERT INTO "ObjectStatus" (tenant_id, record_id, object_type, name, display_order, color, is_default)
    VALUES
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'owners', 'Active', 0, '#10b981', true),
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'owners', 'Inactive', 1, '#6b7280', false),
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'owners', 'Churned', 2, '#ef4444', false)
    ON CONFLICT (tenant_id, object_type, name) DO NOTHING;

    -- Pets statuses
    INSERT INTO "ObjectStatus" (tenant_id, record_id, object_type, name, display_order, color, is_default)
    VALUES
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'pets', 'Active', 0, '#10b981', true),
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'pets', 'Inactive', 1, '#6b7280', false),
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'pets', 'Deceased', 2, '#374151', false)
    ON CONFLICT (tenant_id, object_type, name) DO NOTHING;

    -- Services statuses
    INSERT INTO "ObjectStatus" (tenant_id, record_id, object_type, name, display_order, color, is_default)
    VALUES
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'services', 'Active', 0, '#10b981', true),
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'services', 'Inactive', 1, '#6b7280', false),
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'services', 'Archived', 2, '#374151', false)
    ON CONFLICT (tenant_id, object_type, name) DO NOTHING;

    -- Facilities statuses
    INSERT INTO "ObjectStatus" (tenant_id, record_id, object_type, name, display_order, color, is_default)
    VALUES
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'facilities', 'Active', 0, '#10b981', true),
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'facilities', 'Maintenance', 1, '#f59e0b', false),
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'facilities', 'Inactive', 2, '#6b7280', false)
    ON CONFLICT (tenant_id, object_type, name) DO NOTHING;

    -- Packages statuses
    INSERT INTO "ObjectStatus" (tenant_id, record_id, object_type, name, display_order, color, is_default)
    VALUES
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'packages', 'Active', 0, '#10b981', true),
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'packages', 'Expired', 1, '#f59e0b', false),
        (p_tenant_id, next_record_id(p_tenant_id, 75), 'packages', 'Discontinued', 2, '#6b7280', false)
    ON CONFLICT (tenant_id, object_type, name) DO NOTHING;

    -- =========================================================================
    -- PIPELINES (code 73) WITH STAGES (code 74)
    -- pipeline_id is UUID from ObjectPipeline.id, NOT a record_id
    -- =========================================================================

    -- Bookings pipeline
    INSERT INTO "ObjectPipeline" (tenant_id, record_id, object_type, name, display_order, is_default)
    VALUES (p_tenant_id, next_record_id(p_tenant_id, 73), 'bookings', 'Default Booking Pipeline', 0, true)
    ON CONFLICT (tenant_id, object_type, name) DO NOTHING
    RETURNING id INTO v_pipeline_uuid;

    IF v_pipeline_uuid IS NOT NULL THEN
        INSERT INTO "PipelineStage" (tenant_id, record_id, pipeline_id, name, display_order, stage_type, color)
        VALUES
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Pending', 0, 'open', '#fbbf24'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Confirmed', 1, 'open', '#3b82f6'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Checked In', 2, 'open', '#8b5cf6'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'In Progress', 3, 'open', '#6366f1'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Checked Out', 4, 'closed', '#14b8a6'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Completed', 5, 'won', '#10b981'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Cancelled', 6, 'lost', '#ef4444'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'No Show', 7, 'lost', '#f97316')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Tickets pipeline
    INSERT INTO "ObjectPipeline" (tenant_id, record_id, object_type, name, display_order, is_default)
    VALUES (p_tenant_id, next_record_id(p_tenant_id, 73), 'tickets', 'Default Support Pipeline', 0, true)
    ON CONFLICT (tenant_id, object_type, name) DO NOTHING
    RETURNING id INTO v_pipeline_uuid;

    IF v_pipeline_uuid IS NOT NULL THEN
        INSERT INTO "PipelineStage" (tenant_id, record_id, pipeline_id, name, display_order, stage_type, color)
        VALUES
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'New', 0, 'open', '#3b82f6'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Open', 1, 'open', '#8b5cf6'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Pending', 2, 'open', '#f59e0b'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'In Progress', 3, 'open', '#6366f1'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Resolved', 4, 'won', '#10b981'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Closed', 5, 'closed', '#374151')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Invoices pipeline
    INSERT INTO "ObjectPipeline" (tenant_id, record_id, object_type, name, display_order, is_default)
    VALUES (p_tenant_id, next_record_id(p_tenant_id, 73), 'invoices', 'Default Invoice Pipeline', 0, true)
    ON CONFLICT (tenant_id, object_type, name) DO NOTHING
    RETURNING id INTO v_pipeline_uuid;

    IF v_pipeline_uuid IS NOT NULL THEN
        INSERT INTO "PipelineStage" (tenant_id, record_id, pipeline_id, name, display_order, stage_type, color)
        VALUES
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Draft', 0, 'open', '#9ca3af'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Sent', 1, 'open', '#3b82f6'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Viewed', 2, 'open', '#8b5cf6'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Partially Paid', 3, 'open', '#f59e0b'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Paid', 4, 'won', '#10b981'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Overdue', 5, 'open', '#ef4444'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Void', 6, 'lost', '#374151')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Payments pipeline
    INSERT INTO "ObjectPipeline" (tenant_id, record_id, object_type, name, display_order, is_default)
    VALUES (p_tenant_id, next_record_id(p_tenant_id, 73), 'payments', 'Default Payment Pipeline', 0, true)
    ON CONFLICT (tenant_id, object_type, name) DO NOTHING
    RETURNING id INTO v_pipeline_uuid;

    IF v_pipeline_uuid IS NOT NULL THEN
        INSERT INTO "PipelineStage" (tenant_id, record_id, pipeline_id, name, display_order, stage_type, color)
        VALUES
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Pending', 0, 'open', '#fbbf24'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Processing', 1, 'open', '#3b82f6'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Completed', 2, 'won', '#10b981'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Failed', 3, 'lost', '#ef4444'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Refunded', 4, 'closed', '#8b5cf6'),
            (p_tenant_id, next_record_id(p_tenant_id, 74), v_pipeline_uuid, 'Disputed', 5, 'open', '#f97316')
        ON CONFLICT DO NOTHING;
    END IF;

    -- =========================================================================
    -- INDEX SETTINGS (code 78)
    -- =========================================================================
    INSERT INTO "ObjectIndexSettings" (tenant_id, record_id, object_type, default_columns, default_sort_column, rows_per_page)
    VALUES
        (p_tenant_id, next_record_id(p_tenant_id, 78), 'owners', '[{"id": "name", "label": "Name", "width": 200}, {"id": "email", "label": "Email", "width": 200}, {"id": "phone", "label": "Phone", "width": 150}, {"id": "status", "label": "Status", "width": 100}, {"id": "created_at", "label": "Created", "width": 150}]', 'name', 25),
        (p_tenant_id, next_record_id(p_tenant_id, 78), 'pets', '[{"id": "name", "label": "Name", "width": 200}, {"id": "species", "label": "Species", "width": 100}, {"id": "breed", "label": "Breed", "width": 150}, {"id": "owner", "label": "Owner", "width": 150}, {"id": "status", "label": "Status", "width": 100}]', 'name', 25),
        (p_tenant_id, next_record_id(p_tenant_id, 78), 'bookings', '[{"id": "bookingNumber", "label": "Booking #", "width": 120}, {"id": "owner", "label": "Owner", "width": 150}, {"id": "pets", "label": "Pets", "width": 150}, {"id": "checkIn", "label": "Check In", "width": 120}, {"id": "checkOut", "label": "Check Out", "width": 120}, {"id": "status", "label": "Status", "width": 100}]', 'checkIn', 25),
        (p_tenant_id, next_record_id(p_tenant_id, 78), 'services', '[{"id": "name", "label": "Name", "width": 200}, {"id": "category", "label": "Category", "width": 120}, {"id": "price", "label": "Price", "width": 100}, {"id": "duration", "label": "Duration", "width": 100}, {"id": "status", "label": "Status", "width": 100}]', 'name', 25),
        (p_tenant_id, next_record_id(p_tenant_id, 78), 'facilities', '[{"id": "name", "label": "Name", "width": 200}, {"id": "type", "label": "Type", "width": 120}, {"id": "capacity", "label": "Capacity", "width": 100}, {"id": "status", "label": "Status", "width": 100}]', 'name', 25),
        (p_tenant_id, next_record_id(p_tenant_id, 78), 'packages', '[{"id": "name", "label": "Name", "width": 200}, {"id": "price", "label": "Price", "width": 100}, {"id": "credits", "label": "Credits", "width": 100}, {"id": "status", "label": "Status", "width": 100}]', 'name', 25),
        (p_tenant_id, next_record_id(p_tenant_id, 78), 'invoices', '[{"id": "invoiceNumber", "label": "Invoice #", "width": 120}, {"id": "owner", "label": "Owner", "width": 150}, {"id": "amount", "label": "Amount", "width": 100}, {"id": "dueDate", "label": "Due Date", "width": 120}, {"id": "status", "label": "Status", "width": 100}]', 'created_at', 25),
        (p_tenant_id, next_record_id(p_tenant_id, 78), 'payments', '[{"id": "transactionId", "label": "Transaction", "width": 150}, {"id": "owner", "label": "Owner", "width": 150}, {"id": "amount", "label": "Amount", "width": 100}, {"id": "method", "label": "Method", "width": 100}, {"id": "status", "label": "Status", "width": 100}]', 'created_at', 25),
        (p_tenant_id, next_record_id(p_tenant_id, 78), 'tickets', '[{"id": "ticketNumber", "label": "Ticket #", "width": 120}, {"id": "subject", "label": "Subject", "width": 200}, {"id": "owner", "label": "Owner", "width": 150}, {"id": "priority", "label": "Priority", "width": 100}, {"id": "status", "label": "Status", "width": 100}]', 'created_at', 25)
    ON CONFLICT (tenant_id, object_type) DO NOTHING;

    -- =========================================================================
    -- RECORD LAYOUTS (code 79)
    -- =========================================================================
    INSERT INTO "ObjectRecordLayout" (tenant_id, record_id, object_type, name, layout_type, is_default, left_sidebar_config, middle_column_config, right_sidebar_config)
    SELECT
        p_tenant_id,
        next_record_id(p_tenant_id, 79),
        object_type,
        'Default view',
        'default',
        true,
        ('[{"id": "about", "label": "About this ' || singular_name || '", "type": "about"}, {"id": "details", "label": "Details", "type": "properties"}]')::jsonb,
        '{"tabs": ["overview", "activities"]}'::jsonb,
        '[{"id": "associations", "label": "Associations", "type": "associations"}, {"id": "attachments", "label": "Attachments", "type": "attachments"}]'::jsonb
    FROM "ObjectSettings"
    WHERE tenant_id = p_tenant_id
    ON CONFLICT DO NOTHING;

    -- =========================================================================
    -- PREVIEW LAYOUTS (code 95)
    -- =========================================================================
    INSERT INTO "ObjectPreviewLayout" (tenant_id, record_id, object_type, name, is_default, properties, show_quick_info, show_quick_actions, show_recent_activity)
    SELECT
        p_tenant_id,
        next_record_id(p_tenant_id, 95),
        object_type,
        'Default view',
        true,
        CASE object_type
            WHEN 'owners' THEN '["name", "email", "phone", "status", "created_at"]'
            WHEN 'pets' THEN '["name", "species", "breed", "owner", "status"]'
            WHEN 'bookings' THEN '["bookingNumber", "owner", "checkIn", "checkOut", "status"]'
            WHEN 'services' THEN '["name", "price", "duration", "status"]'
            WHEN 'facilities' THEN '["name", "type", "capacity", "status"]'
            WHEN 'packages' THEN '["name", "price", "credits", "status"]'
            WHEN 'invoices' THEN '["invoiceNumber", "owner", "amount", "dueDate", "status"]'
            WHEN 'payments' THEN '["transactionId", "amount", "method", "status"]'
            WHEN 'tickets' THEN '["ticketNumber", "subject", "priority", "status"]'
            ELSE '["name", "status"]'
        END::jsonb,
        true,
        true,
        false
    FROM "ObjectSettings"
    WHERE tenant_id = p_tenant_id
    ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- End of Migration
-- ============================================================================
