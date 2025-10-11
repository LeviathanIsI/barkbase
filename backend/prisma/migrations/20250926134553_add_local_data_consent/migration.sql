-- Add local data consent receipt to memberships
ALTER TABLE "Membership" ADD COLUMN "localDataConsent" TEXT;
