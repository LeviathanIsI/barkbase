-- Migration: 004_stripe_payment_methods.sql
-- Purpose: Add Stripe customer and payment method storage for card-on-file functionality
-- Date: 2025-11-30

-- Add Stripe customer ID to Owner table
ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_owner_stripe_customer ON "Owner"(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Create PaymentMethod table for storing Stripe payment methods
CREATE TABLE IF NOT EXISTS "PaymentMethod" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES "Owner"(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'card', -- 'card', 'bank_account', 'us_bank_account'
  card_brand TEXT, -- 'visa', 'mastercard', 'amex', etc.
  card_last4 TEXT, -- Last 4 digits
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  billing_name TEXT,
  billing_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_method_tenant ON "PaymentMethod"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_method_owner ON "PaymentMethod"(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_method_stripe ON "PaymentMethod"(stripe_payment_method_id);

-- Add Stripe-specific columns to Payment table
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS failure_code TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS failure_message TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_stripe_intent ON "Payment"(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Function to ensure only one default payment method per owner
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE "PaymentMethod"
    SET is_default = false, updated_at = NOW()
    WHERE owner_id = NEW.owner_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_default_payment_method ON "PaymentMethod";
CREATE TRIGGER trg_single_default_payment_method
  BEFORE INSERT OR UPDATE OF is_default ON "PaymentMethod"
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_payment_method();

-- Update timestamp trigger for PaymentMethod
CREATE OR REPLACE FUNCTION update_payment_method_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_method_updated ON "PaymentMethod";
CREATE TRIGGER trg_payment_method_updated
  BEFORE UPDATE ON "PaymentMethod"
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_method_timestamp();
