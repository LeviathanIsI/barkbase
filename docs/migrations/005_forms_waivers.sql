-- Migration: 005_forms_waivers.sql
-- Purpose: Add Forms and Waivers system for legal documents and customer intake
-- Date: 2025-11-30

-- ============================================================================
-- Form Templates - Define reusable form structures
-- ============================================================================

CREATE TABLE IF NOT EXISTS "FormTemplate" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,

  -- Form metadata
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- URL-friendly identifier
  description TEXT,
  type TEXT NOT NULL DEFAULT 'intake', -- 'intake', 'waiver', 'agreement', 'health', 'service', 'custom'

  -- Form configuration
  fields JSONB NOT NULL DEFAULT '[]', -- Array of field definitions
  settings JSONB DEFAULT '{}', -- Form-level settings

  -- Status and requirements
  is_active BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT false, -- Required for new bookings
  require_signature BOOLEAN DEFAULT false,
  expiration_days INTEGER, -- How long submission is valid (NULL = never expires)

  -- Display order and categorization
  sort_order INTEGER DEFAULT 0,
  category TEXT, -- For grouping in UI

  -- Audit fields
  created_by UUID REFERENCES "User"(id),
  updated_by UUID REFERENCES "User"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Unique slug per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_template_slug
  ON "FormTemplate"(tenant_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_form_template_tenant ON "FormTemplate"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_template_type ON "FormTemplate"(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_form_template_active ON "FormTemplate"(tenant_id, is_active) WHERE is_active = true;

-- ============================================================================
-- Form Submissions - Store completed form data
-- ============================================================================

CREATE TABLE IF NOT EXISTS "FormSubmission" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES "FormTemplate"(id) ON DELETE CASCADE,

  -- Who submitted
  owner_id UUID REFERENCES "Owner"(id) ON DELETE SET NULL,
  pet_id UUID REFERENCES "Pet"(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES "Booking"(id) ON DELETE SET NULL,
  submitted_by_user_id UUID REFERENCES "User"(id), -- If submitted by staff

  -- Form data
  data JSONB NOT NULL DEFAULT '{}', -- Submitted field values

  -- Signature
  signature_data TEXT, -- Base64 encoded signature image
  signature_name TEXT, -- Typed name for signature
  signed_at TIMESTAMPTZ,
  signer_ip TEXT, -- IP address for audit

  -- Status
  status TEXT NOT NULL DEFAULT 'submitted', -- 'draft', 'submitted', 'approved', 'rejected', 'expired'
  reviewed_by UUID REFERENCES "User"(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Validity tracking
  expires_at TIMESTAMPTZ, -- When this submission expires

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_submission_tenant ON "FormSubmission"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_submission_template ON "FormSubmission"(template_id);
CREATE INDEX IF NOT EXISTS idx_form_submission_owner ON "FormSubmission"(owner_id);
CREATE INDEX IF NOT EXISTS idx_form_submission_pet ON "FormSubmission"(pet_id);
CREATE INDEX IF NOT EXISTS idx_form_submission_booking ON "FormSubmission"(booking_id);
CREATE INDEX IF NOT EXISTS idx_form_submission_status ON "FormSubmission"(tenant_id, status);

-- ============================================================================
-- Form Field Definitions (embedded in FormTemplate.fields JSONB)
-- ============================================================================
--
-- Field structure example:
-- {
--   "id": "uuid",
--   "name": "pet_name",
--   "label": "Pet's Name",
--   "type": "text", -- text, textarea, email, phone, number, date, select, checkbox, radio, signature, file
--   "required": true,
--   "placeholder": "Enter pet name",
--   "helpText": "As it appears on vaccination records",
--   "validation": {
--     "minLength": 2,
--     "maxLength": 100,
--     "pattern": "..."
--   },
--   "options": [...], -- For select, checkbox, radio
--   "conditional": { -- Show/hide based on other field values
--     "fieldId": "...",
--     "operator": "equals",
--     "value": "..."
--   },
--   "sortOrder": 1
-- }

-- ============================================================================
-- Default Form Templates (to be inserted by seeder)
-- ============================================================================

-- Create a function to get or create default templates for a tenant
CREATE OR REPLACE FUNCTION create_default_form_templates(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  -- Check if tenant already has templates
  IF EXISTS (SELECT 1 FROM "FormTemplate" WHERE tenant_id = p_tenant_id) THEN
    RETURN;
  END IF;

  -- Insert Boarding Agreement (Waiver)
  INSERT INTO "FormTemplate" (tenant_id, name, slug, description, type, is_required, require_signature, fields, settings)
  VALUES (
    p_tenant_id,
    'Boarding Agreement & Waiver',
    'boarding-agreement',
    'Standard boarding service agreement with liability waiver',
    'waiver',
    true,
    true,
    '[
      {"id": "owner_name", "name": "owner_name", "label": "Owner Full Name", "type": "text", "required": true, "sortOrder": 1},
      {"id": "pet_names", "name": "pet_names", "label": "Pet Name(s)", "type": "text", "required": true, "sortOrder": 2},
      {"id": "emergency_contact", "name": "emergency_contact", "label": "Emergency Contact Name", "type": "text", "required": true, "sortOrder": 3},
      {"id": "emergency_phone", "name": "emergency_phone", "label": "Emergency Contact Phone", "type": "phone", "required": true, "sortOrder": 4},
      {"id": "vet_name", "name": "vet_name", "label": "Veterinarian Name/Clinic", "type": "text", "required": true, "sortOrder": 5},
      {"id": "vet_phone", "name": "vet_phone", "label": "Veterinarian Phone", "type": "phone", "required": true, "sortOrder": 6},
      {"id": "medical_conditions", "name": "medical_conditions", "label": "Known Medical Conditions", "type": "textarea", "required": false, "helpText": "List any known allergies, health issues, or special needs", "sortOrder": 7},
      {"id": "medications", "name": "medications", "label": "Current Medications", "type": "textarea", "required": false, "helpText": "Include dosage and frequency", "sortOrder": 8},
      {"id": "feeding_instructions", "name": "feeding_instructions", "label": "Feeding Instructions", "type": "textarea", "required": false, "sortOrder": 9},
      {"id": "behavioral_notes", "name": "behavioral_notes", "label": "Behavioral Notes", "type": "textarea", "required": false, "helpText": "Does your pet have any fears, triggers, or special behaviors we should know about?", "sortOrder": 10},
      {"id": "vet_authorization", "name": "vet_authorization", "label": "I authorize emergency veterinary care", "type": "checkbox", "required": true, "sortOrder": 11},
      {"id": "liability_acknowledgment", "name": "liability_acknowledgment", "label": "I understand and accept the liability terms", "type": "checkbox", "required": true, "sortOrder": 12},
      {"id": "signature", "name": "signature", "label": "Signature", "type": "signature", "required": true, "sortOrder": 13}
    ]'::jsonb,
    '{"showProgressBar": true, "allowSaveDraft": true}'::jsonb
  );

  -- Insert Daycare Agreement
  INSERT INTO "FormTemplate" (tenant_id, name, slug, description, type, is_required, require_signature, fields, settings)
  VALUES (
    p_tenant_id,
    'Daycare Agreement',
    'daycare-agreement',
    'Daycare service terms and conditions',
    'agreement',
    true,
    true,
    '[
      {"id": "owner_name", "name": "owner_name", "label": "Owner Full Name", "type": "text", "required": true, "sortOrder": 1},
      {"id": "pet_names", "name": "pet_names", "label": "Pet Name(s)", "type": "text", "required": true, "sortOrder": 2},
      {"id": "play_authorization", "name": "play_authorization", "label": "I authorize my pet to participate in group play", "type": "checkbox", "required": true, "sortOrder": 3},
      {"id": "photo_release", "name": "photo_release", "label": "I grant permission to use photos/videos of my pet", "type": "checkbox", "required": false, "sortOrder": 4},
      {"id": "vaccination_acknowledgment", "name": "vaccination_acknowledgment", "label": "I confirm my pet is current on required vaccinations", "type": "checkbox", "required": true, "sortOrder": 5},
      {"id": "signature", "name": "signature", "label": "Signature", "type": "signature", "required": true, "sortOrder": 6}
    ]'::jsonb,
    '{"showProgressBar": true}'::jsonb
  );

  -- Insert Pet Health Questionnaire
  INSERT INTO "FormTemplate" (tenant_id, name, slug, description, type, is_required, require_signature, fields, settings)
  VALUES (
    p_tenant_id,
    'Pet Health Questionnaire',
    'pet-health',
    'Detailed health information for your pet',
    'health',
    false,
    false,
    '[
      {"id": "pet_name", "name": "pet_name", "label": "Pet Name", "type": "text", "required": true, "sortOrder": 1},
      {"id": "age", "name": "age", "label": "Pet Age", "type": "text", "required": true, "sortOrder": 2},
      {"id": "weight", "name": "weight", "label": "Weight (lbs)", "type": "number", "required": false, "sortOrder": 3},
      {"id": "spayed_neutered", "name": "spayed_neutered", "label": "Is your pet spayed/neutered?", "type": "radio", "required": true, "options": [{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}], "sortOrder": 4},
      {"id": "allergies", "name": "allergies", "label": "Known Allergies", "type": "textarea", "required": false, "sortOrder": 5},
      {"id": "diet", "name": "diet", "label": "Current Diet/Food Brand", "type": "text", "required": false, "sortOrder": 6},
      {"id": "exercise_level", "name": "exercise_level", "label": "Exercise Level", "type": "select", "required": false, "options": [{"value": "low", "label": "Low"}, {"value": "moderate", "label": "Moderate"}, {"value": "high", "label": "High"}], "sortOrder": 7},
      {"id": "social_with_dogs", "name": "social_with_dogs", "label": "Good with other dogs?", "type": "radio", "required": true, "options": [{"value": "yes", "label": "Yes"}, {"value": "sometimes", "label": "Sometimes"}, {"value": "no", "label": "No"}], "sortOrder": 8},
      {"id": "social_with_people", "name": "social_with_people", "label": "Good with people?", "type": "radio", "required": true, "options": [{"value": "yes", "label": "Yes"}, {"value": "sometimes", "label": "Sometimes"}, {"value": "no", "label": "No"}], "sortOrder": 9}
    ]'::jsonb,
    '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update timestamp trigger for FormTemplate
CREATE OR REPLACE FUNCTION update_form_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_form_template_updated ON "FormTemplate";
CREATE TRIGGER trg_form_template_updated
  BEFORE UPDATE ON "FormTemplate"
  FOR EACH ROW
  EXECUTE FUNCTION update_form_template_timestamp();

-- Update timestamp trigger for FormSubmission
CREATE OR REPLACE FUNCTION update_form_submission_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_form_submission_updated ON "FormSubmission";
CREATE TRIGGER trg_form_submission_updated
  BEFORE UPDATE ON "FormSubmission"
  FOR EACH ROW
  EXECUTE FUNCTION update_form_submission_timestamp();

-- Set expiration date on submission based on template
CREATE OR REPLACE FUNCTION set_submission_expiration()
RETURNS TRIGGER AS $$
DECLARE
  exp_days INTEGER;
BEGIN
  SELECT expiration_days INTO exp_days
  FROM "FormTemplate"
  WHERE id = NEW.template_id;

  IF exp_days IS NOT NULL THEN
    NEW.expires_at = NOW() + (exp_days || ' days')::INTERVAL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_submission_expiration ON "FormSubmission";
CREATE TRIGGER trg_submission_expiration
  BEFORE INSERT ON "FormSubmission"
  FOR EACH ROW
  EXECUTE FUNCTION set_submission_expiration();
