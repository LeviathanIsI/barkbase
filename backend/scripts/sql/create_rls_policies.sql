-- RLS policies for all tenant-scoped tables
-- Run this in Supabase SQL editor after creating app_user

-- Owner
drop policy if exists "tenant read" on "Owner";
drop policy if exists "tenant write" on "Owner";
drop policy if exists "tenant update" on "Owner";
create policy "tenant read" on "Owner" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "Owner" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "Owner" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- Pet
drop policy if exists "tenant read" on "Pet";
drop policy if exists "tenant write" on "Pet";
drop policy if exists "tenant update" on "Pet";
create policy "tenant read" on "Pet" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "Pet" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "Pet" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- PetOwner
drop policy if exists "tenant read" on "PetOwner";
drop policy if exists "tenant write" on "PetOwner";
drop policy if exists "tenant update" on "PetOwner";
create policy "tenant read" on "PetOwner" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "PetOwner" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "PetOwner" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- Booking
drop policy if exists "tenant read" on "Booking";
drop policy if exists "tenant write" on "Booking";
drop policy if exists "tenant update" on "Booking";
create policy "tenant read" on "Booking" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "Booking" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "Booking" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- BookingSegment
drop policy if exists "tenant read" on "BookingSegment";
drop policy if exists "tenant write" on "BookingSegment";
drop policy if exists "tenant update" on "BookingSegment";
create policy "tenant read" on "BookingSegment" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "BookingSegment" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "BookingSegment" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- Service
drop policy if exists "tenant read" on "Service";
drop policy if exists "tenant write" on "Service";
drop policy if exists "tenant update" on "Service";
create policy "tenant read" on "Service" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "Service" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "Service" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- BookingService
drop policy if exists "tenant read" on "BookingService";
drop policy if exists "tenant write" on "BookingService";
drop policy if exists "tenant update" on "BookingService";
create policy "tenant read" on "BookingService" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "BookingService" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "BookingService" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- Payment
drop policy if exists "tenant read" on "Payment";
drop policy if exists "tenant write" on "Payment";
drop policy if exists "tenant update" on "Payment";
create policy "tenant read" on "Payment" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "Payment" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "Payment" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- Vaccination
drop policy if exists "tenant read" on "Vaccination";
drop policy if exists "tenant write" on "Vaccination";
drop policy if exists "tenant update" on "Vaccination";
create policy "tenant read" on "Vaccination" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "Vaccination" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "Vaccination" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- Staff
drop policy if exists "tenant read" on "Staff";
drop policy if exists "tenant write" on "Staff";
drop policy if exists "tenant update" on "Staff";
create policy "tenant read" on "Staff" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "Staff" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "Staff" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- Membership
drop policy if exists "tenant read" on "Membership";
drop policy if exists "tenant write" on "Membership";
drop policy if exists "tenant update" on "Membership";
create policy "tenant read" on "Membership" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "Membership" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "Membership" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- AuditLog
drop policy if exists "tenant read" on "AuditLog";
drop policy if exists "tenant write" on "AuditLog";
drop policy if exists "tenant update" on "AuditLog";
create policy "tenant read" on "AuditLog" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "AuditLog" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "AuditLog" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- UsageCounter
drop policy if exists "tenant read" on "UsageCounter";
drop policy if exists "tenant write" on "UsageCounter";
drop policy if exists "tenant update" on "UsageCounter";
create policy "tenant read" on "UsageCounter" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "UsageCounter" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "UsageCounter" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- CheckIn
drop policy if exists "tenant read" on "CheckIn";
drop policy if exists "tenant write" on "CheckIn";
drop policy if exists "tenant update" on "CheckIn";
create policy "tenant read" on "CheckIn" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "CheckIn" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "CheckIn" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- CheckOut
drop policy if exists "tenant read" on "CheckOut";
drop policy if exists "tenant write" on "CheckOut";
drop policy if exists "tenant update" on "CheckOut";
create policy "tenant read" on "CheckOut" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "CheckOut" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "CheckOut" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

-- IncidentReport
drop policy if exists "tenant read" on "IncidentReport";
drop policy if exists "tenant write" on "IncidentReport";
drop policy if exists "tenant update" on "IncidentReport";
create policy "tenant read" on "IncidentReport" for select using ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant write" on "IncidentReport" for insert with check ("tenantId" = current_setting('app.tenant_id', true));
create policy "tenant update" on "IncidentReport" for update using ("tenantId" = current_setting('app.tenant_id', true)) with check ("tenantId" = current_setting('app.tenant_id', true));

