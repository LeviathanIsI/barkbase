-- ============================================================================
-- Migration: Seed SystemProperty Table
-- Purpose: Populate SystemProperty with actual database columns for reporting
-- Date: 2025-12-22
-- ============================================================================

-- Clear existing system properties to avoid duplicates
DELETE FROM "SystemProperty";

-- ============================================================================
-- OWNER PROPERTIES
-- ============================================================================
INSERT INTO "SystemProperty" (entity_type, name, label, field_type, options, is_required, sort_order, property_group, show_in_list, show_in_form, show_in_search) VALUES
-- Basic Info
('owner', 'first_name', 'First Name', 'text', NULL, true, 10, 'Basic Info', true, true, true),
('owner', 'last_name', 'Last Name', 'text', NULL, true, 20, 'Basic Info', true, true, true),
('owner', 'email', 'Email', 'email', NULL, false, 30, 'Basic Info', true, true, true),
('owner', 'phone', 'Phone', 'phone', NULL, false, 40, 'Basic Info', true, true, true),
-- Address
('owner', 'address_street', 'Street Address', 'text', NULL, false, 50, 'Address', false, true, false),
('owner', 'address_city', 'City', 'text', NULL, false, 60, 'Address', false, true, true),
('owner', 'address_state', 'State', 'text', NULL, false, 70, 'Address', false, true, true),
('owner', 'address_zip', 'ZIP Code', 'text', NULL, false, 80, 'Address', false, true, false),
('owner', 'address_country', 'Country', 'text', NULL, false, 90, 'Address', false, true, false),
-- Emergency Contact
('owner', 'emergency_contact_name', 'Emergency Contact Name', 'text', NULL, false, 100, 'Emergency Contact', false, true, false),
('owner', 'emergency_contact_phone', 'Emergency Contact Phone', 'phone', NULL, false, 110, 'Emergency Contact', false, true, false),
-- Additional
('owner', 'notes', 'Notes', 'textarea', NULL, false, 120, 'Additional', false, true, false),
('owner', 'tags', 'Tags', 'multi_enum', NULL, false, 130, 'Additional', false, true, false),
('owner', 'is_active', 'Active', 'boolean', NULL, false, 140, 'Status', true, true, false),
('owner', 'stripe_customer_id', 'Stripe Customer ID', 'text', NULL, false, 150, 'Billing', false, false, false),
-- System
('owner', 'created_at', 'Created At', 'datetime', NULL, false, 200, 'System', false, false, false),
('owner', 'updated_at', 'Updated At', 'datetime', NULL, false, 210, 'System', false, false, false);

-- ============================================================================
-- PET PROPERTIES
-- ============================================================================
INSERT INTO "SystemProperty" (entity_type, name, label, field_type, options, is_required, sort_order, property_group, show_in_list, show_in_form, show_in_search) VALUES
-- Basic Info
('pet', 'name', 'Name', 'text', NULL, true, 10, 'Basic Info', true, true, true),
('pet', 'species', 'Species', 'enum', '["DOG", "CAT", "OTHER"]', true, 20, 'Basic Info', true, true, true),
('pet', 'breed', 'Breed', 'text', NULL, false, 30, 'Basic Info', true, true, true),
('pet', 'gender', 'Gender', 'enum', '["MALE", "FEMALE", "UNKNOWN"]', false, 40, 'Basic Info', true, true, false),
('pet', 'color', 'Color', 'text', NULL, false, 50, 'Basic Info', false, true, false),
('pet', 'weight', 'Weight (lbs)', 'number', NULL, false, 60, 'Basic Info', false, true, false),
('pet', 'date_of_birth', 'Date of Birth', 'date', NULL, false, 70, 'Basic Info', false, true, false),
-- Identification
('pet', 'microchip_number', 'Microchip Number', 'text', NULL, false, 80, 'Identification', false, true, true),
('pet', 'photo_url', 'Photo', 'image', NULL, false, 90, 'Identification', false, true, false),
-- Notes
('pet', 'medical_notes', 'Medical Notes', 'textarea', NULL, false, 100, 'Health & Behavior', false, true, false),
('pet', 'dietary_notes', 'Dietary Notes', 'textarea', NULL, false, 110, 'Health & Behavior', false, true, false),
('pet', 'behavior_notes', 'Behavior Notes', 'textarea', NULL, false, 120, 'Health & Behavior', false, true, false),
('pet', 'behavior_flags', 'Behavior Flags', 'multi_enum', '["AGGRESSIVE", "ANXIOUS", "ESCAPE_ARTIST", "SPECIAL_NEEDS", "MEDICATION_REQUIRED"]', false, 130, 'Health & Behavior', false, true, false),
-- Status
('pet', 'status', 'Status', 'enum', '["ACTIVE", "INACTIVE", "DECEASED"]', false, 140, 'Status', true, true, false),
('pet', 'is_active', 'Active', 'boolean', NULL, false, 150, 'Status', false, false, false),
-- System
('pet', 'created_at', 'Created At', 'datetime', NULL, false, 200, 'System', false, false, false),
('pet', 'updated_at', 'Updated At', 'datetime', NULL, false, 210, 'System', false, false, false);

-- ============================================================================
-- BOOKING PROPERTIES
-- ============================================================================
INSERT INTO "SystemProperty" (entity_type, name, label, field_type, options, is_required, sort_order, property_group, show_in_list, show_in_form, show_in_search) VALUES
-- Dates
('booking', 'check_in', 'Check-In', 'datetime', NULL, true, 10, 'Schedule', true, true, true),
('booking', 'check_out', 'Check-Out', 'datetime', NULL, true, 20, 'Schedule', true, true, true),
-- Status
('booking', 'status', 'Status', 'enum', '["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"]', false, 30, 'Status', true, true, true),
-- Pricing
('booking', 'total_price_cents', 'Total Price', 'currency', NULL, true, 40, 'Pricing', true, true, false),
('booking', 'deposit_cents', 'Deposit', 'currency', NULL, false, 50, 'Pricing', false, true, false),
-- Notes
('booking', 'notes', 'Notes', 'textarea', NULL, false, 60, 'Details', false, true, false),
('booking', 'special_instructions', 'Special Instructions', 'textarea', NULL, false, 70, 'Details', false, true, false),
-- Check-in/out tracking
('booking', 'checked_in_at', 'Checked In At', 'datetime', NULL, false, 80, 'Activity', false, false, false),
('booking', 'checked_out_at', 'Checked Out At', 'datetime', NULL, false, 90, 'Activity', false, false, false),
('booking', 'cancelled_at', 'Cancelled At', 'datetime', NULL, false, 100, 'Activity', false, false, false),
('booking', 'cancellation_reason', 'Cancellation Reason', 'textarea', NULL, false, 110, 'Activity', false, false, false),
-- System
('booking', 'created_at', 'Created At', 'datetime', NULL, false, 200, 'System', false, false, false),
('booking', 'updated_at', 'Updated At', 'datetime', NULL, false, 210, 'System', false, false, false);

-- ============================================================================
-- PAYMENT PROPERTIES
-- ============================================================================
INSERT INTO "SystemProperty" (entity_type, name, label, field_type, options, is_required, sort_order, property_group, show_in_list, show_in_form, show_in_search) VALUES
-- Payment Info
('payment', 'amount_cents', 'Amount', 'currency', NULL, true, 10, 'Payment Info', true, true, false),
('payment', 'method', 'Payment Method', 'enum', '["CARD", "CASH", "CHECK", "BANK_TRANSFER", "OTHER"]', true, 20, 'Payment Info', true, true, true),
('payment', 'status', 'Status', 'enum', '["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"]', false, 30, 'Payment Info', true, true, true),
-- Reference
('payment', 'stripe_payment_intent_id', 'Stripe Payment ID', 'text', NULL, false, 40, 'Reference', false, false, false),
('payment', 'notes', 'Notes', 'textarea', NULL, false, 50, 'Details', false, true, false),
-- Processing
('payment', 'processed_at', 'Processed At', 'datetime', NULL, false, 60, 'Activity', false, false, false),
-- System
('payment', 'created_at', 'Created At', 'datetime', NULL, false, 200, 'System', true, false, false),
('payment', 'updated_at', 'Updated At', 'datetime', NULL, false, 210, 'System', false, false, false);

-- ============================================================================
-- INVOICE PROPERTIES
-- ============================================================================
INSERT INTO "SystemProperty" (entity_type, name, label, field_type, options, is_required, sort_order, property_group, show_in_list, show_in_form, show_in_search) VALUES
-- Invoice Info
('invoice', 'invoice_number', 'Invoice Number', 'text', NULL, true, 10, 'Invoice Info', true, true, true),
('invoice', 'status', 'Status', 'enum', '["DRAFT", "SENT", "PAID", "PARTIAL", "OVERDUE", "VOID"]', false, 20, 'Invoice Info', true, true, true),
-- Amounts
('invoice', 'subtotal_cents', 'Subtotal', 'currency', NULL, true, 30, 'Amounts', false, true, false),
('invoice', 'tax_cents', 'Tax', 'currency', NULL, false, 40, 'Amounts', false, true, false),
('invoice', 'discount_cents', 'Discount', 'currency', NULL, false, 50, 'Amounts', false, true, false),
('invoice', 'total_cents', 'Total', 'currency', NULL, true, 60, 'Amounts', true, true, false),
('invoice', 'paid_cents', 'Paid', 'currency', NULL, false, 70, 'Amounts', true, false, false),
-- Dates
('invoice', 'due_date', 'Due Date', 'date', NULL, false, 80, 'Dates', true, true, false),
('invoice', 'issued_at', 'Issued At', 'datetime', NULL, false, 90, 'Dates', false, false, false),
('invoice', 'paid_at', 'Paid At', 'datetime', NULL, false, 100, 'Dates', false, false, false),
-- Notes
('invoice', 'notes', 'Notes', 'textarea', NULL, false, 110, 'Details', false, true, false),
-- System
('invoice', 'created_at', 'Created At', 'datetime', NULL, false, 200, 'System', false, false, false),
('invoice', 'updated_at', 'Updated At', 'datetime', NULL, false, 210, 'System', false, false, false);

-- ============================================================================
-- SERVICE PROPERTIES
-- ============================================================================
INSERT INTO "SystemProperty" (entity_type, name, label, field_type, options, is_required, sort_order, property_group, show_in_list, show_in_form, show_in_search) VALUES
-- Service Info
('service', 'name', 'Name', 'text', NULL, true, 10, 'Basic Info', true, true, true),
('service', 'description', 'Description', 'textarea', NULL, false, 20, 'Basic Info', false, true, false),
('service', 'category', 'Category', 'enum', '["BOARDING", "DAYCARE", "GROOMING", "TRAINING", "ADD_ON"]', true, 30, 'Basic Info', true, true, true),
-- Pricing
('service', 'price_in_cents', 'Price', 'currency', NULL, true, 40, 'Pricing', true, true, false),
('service', 'duration_minutes', 'Duration (minutes)', 'number', NULL, false, 50, 'Pricing', false, true, false),
-- Status
('service', 'is_active', 'Active', 'boolean', NULL, false, 60, 'Status', true, true, false),
('service', 'sort_order', 'Sort Order', 'number', NULL, false, 70, 'Display', false, true, false),
-- System
('service', 'created_at', 'Created At', 'datetime', NULL, false, 200, 'System', false, false, false),
('service', 'updated_at', 'Updated At', 'datetime', NULL, false, 210, 'System', false, false, false);

-- ============================================================================
-- Verify seed completed
-- ============================================================================
DO $$
DECLARE
    owner_count INT;
    pet_count INT;
    booking_count INT;
    payment_count INT;
    invoice_count INT;
    service_count INT;
BEGIN
    SELECT COUNT(*) INTO owner_count FROM "SystemProperty" WHERE entity_type = 'owner';
    SELECT COUNT(*) INTO pet_count FROM "SystemProperty" WHERE entity_type = 'pet';
    SELECT COUNT(*) INTO booking_count FROM "SystemProperty" WHERE entity_type = 'booking';
    SELECT COUNT(*) INTO payment_count FROM "SystemProperty" WHERE entity_type = 'payment';
    SELECT COUNT(*) INTO invoice_count FROM "SystemProperty" WHERE entity_type = 'invoice';
    SELECT COUNT(*) INTO service_count FROM "SystemProperty" WHERE entity_type = 'service';

    RAISE NOTICE 'SystemProperty seed complete: owner=%, pet=%, booking=%, payment=%, invoice=%, service=%',
        owner_count, pet_count, booking_count, payment_count, invoice_count, service_count;
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
