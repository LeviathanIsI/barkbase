-- Enable Row Level Security on tenant-scoped tables
alter table if exists "Owner" enable row level security;
alter table if exists "Pet" enable row level security;
alter table if exists "PetOwner" enable row level security;
alter table if exists "Booking" enable row level security;
alter table if exists "BookingSegment" enable row level security;
alter table if exists "Service" enable row level security;
alter table if exists "BookingService" enable row level security;
alter table if exists "Payment" enable row level security;
alter table if exists "Vaccination" enable row level security;
alter table if exists "Staff" enable row level security;
alter table if exists "Membership" enable row level security;
alter table if exists "AuditLog" enable row level security;
alter table if exists "UsageCounter" enable row level security;
alter table if exists "CheckIn" enable row level security;
alter table if exists "CheckOut" enable row level security;
alter table if exists "IncidentReport" enable row level security;

-- Optional: keep Tenant readable only through explicit policies (we can add later)
-- alter table if exists "Tenant" enable row level security;


