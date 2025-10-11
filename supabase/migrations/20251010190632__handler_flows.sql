-- Enable UUID generation utilities
do  begin
  create extension if not exists "pgcrypto";
end ;

-- Helper to set the current tenant in the session
drop function if exists set_tenant(uuid);
create or replace function set_tenant(tenant uuid)
returns void
language plpgsql
security definer
as 
begin
  perform set_config('app.tenant_id', tenant::text, true);
end;
;

drop function if exists current_tenant_id();
create or replace function current_tenant_id()
returns uuid
language plpgsql
stable
as 
declare
  tenant_text text;
begin
  tenant_text := current_setting('app.tenant_id', true);
  if tenant_text is null or length(tenant_text) = 0 then
    return null;
  end if;
  return tenant_text::uuid;
end;
;

-- Core tables
create table if not exists handler_flows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  status text not null check (status in ('draft','published','archived')),
  definition jsonb not null default '{}'::jsonb,
  version int not null default 1,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists handler_triggers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  flow_id uuid not null references handler_flows(id) on delete cascade,
  type text not null check (type in ('event','schedule','manual')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists handler_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  flow_id uuid not null references handler_flows(id) on delete cascade,
  kind text not null check (kind in ('condition','action','delay','branch')),
  name text not null,
  config jsonb not null default '{}'::jsonb,
  next_id uuid,
  alt_next_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists handler_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  flow_id uuid not null references handler_flows(id) on delete restrict,
  flow_version int not null,
  status text not null check (status in ('queued','running','succeeded','failed','canceled')),
  current_step_id uuid,
  idempotency_key text,
  context jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  attempt int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists handler_run_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  run_id uuid not null references handler_runs(id) on delete cascade,
  step_id uuid,
  ts timestamptz not null default now(),
  level text not null check (level in ('info','warn','error')),
  message text,
  input jsonb,
  output jsonb,
  error jsonb
);

create table if not exists handler_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  run_id uuid not null references handler_runs(id) on delete cascade,
  due_at timestamptz not null,
  locked_by text,
  locked_at timestamptz,
  attempts int not null default 0,
  max_attempts int not null default 6,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists handler_variables (
  tenant_id uuid not null,
  run_id uuid not null references handler_runs(id) on delete cascade,
  key text not null,
  value jsonb,
  primary key (run_id, key)
);

-- Unique / indexes
create unique index if not exists handler_runs_idempotency_idx
  on handler_runs (tenant_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_handler_runs_tenant_status
  on handler_runs (tenant_id, status);

create index if not exists idx_handler_jobs_due
  on handler_jobs (due_at)
  where locked_by is null;

create index if not exists idx_handler_jobs_run
  on handler_jobs (run_id);

create index if not exists idx_handler_steps_flow
  on handler_steps (flow_id);

create index if not exists idx_handler_run_logs_run_ts
  on handler_run_logs (run_id, ts);

-- Enable RLS and policies for each table
alter table handler_flows enable row level security;
drop policy if exists handler_flows_tenant_select on handler_flows;
drop policy if exists handler_flows_tenant_write on handler_flows;
create policy handler_flows_tenant_select on handler_flows
  for select using (tenant_id = current_tenant_id());
create policy handler_flows_tenant_write on handler_flows
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

alter table handler_triggers enable row level security;
drop policy if exists handler_triggers_tenant_select on handler_triggers;
drop policy if exists handler_triggers_tenant_write on handler_triggers;
create policy handler_triggers_tenant_select on handler_triggers
  for select using (tenant_id = current_tenant_id());
create policy handler_triggers_tenant_write on handler_triggers
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

alter table handler_steps enable row level security;
drop policy if exists handler_steps_tenant_select on handler_steps;
drop policy if exists handler_steps_tenant_write on handler_steps;
create policy handler_steps_tenant_select on handler_steps
  for select using (tenant_id = current_tenant_id());
create policy handler_steps_tenant_write on handler_steps
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

alter table handler_runs enable row level security;
drop policy if exists handler_runs_tenant_select on handler_runs;
drop policy if exists handler_runs_tenant_write on handler_runs;
create policy handler_runs_tenant_select on handler_runs
  for select using (tenant_id = current_tenant_id());
create policy handler_runs_tenant_write on handler_runs
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

alter table handler_run_logs enable row level security;
drop policy if exists handler_run_logs_tenant_select on handler_run_logs;
drop policy if exists handler_run_logs_tenant_write on handler_run_logs;
create policy handler_run_logs_tenant_select on handler_run_logs
  for select using (tenant_id = current_tenant_id());
create policy handler_run_logs_tenant_write on handler_run_logs
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

alter table handler_jobs enable row level security;
drop policy if exists handler_jobs_tenant_select on handler_jobs;
drop policy if exists handler_jobs_tenant_write on handler_jobs;
create policy handler_jobs_tenant_select on handler_jobs
  for select using (tenant_id = current_tenant_id());
create policy handler_jobs_tenant_write on handler_jobs
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

alter table handler_variables enable row level security;
drop policy if exists handler_variables_tenant_select on handler_variables;
drop policy if exists handler_variables_tenant_write on handler_variables;
create policy handler_variables_tenant_select on handler_variables
  for select using (tenant_id = current_tenant_id());
create policy handler_variables_tenant_write on handler_variables
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- Queue helpers
create or replace function claim_next_handler_job(worker_id text default null)
returns handler_jobs
language plpgsql
security definer
as $$
declare
  job handler_jobs%rowtype;
begin
  select *
    into job
    from handler_jobs
   where locked_by is null
   order by due_at asc
   for update skip locked
   limit 1;

  if job.id is null then
    return null;
  end if;

  update handler_jobs
     set locked_by = coalesce(worker_id, 'handler-worker'),
         locked_at = now(),
         attempts = attempts + 1
   where id = job.id
   returning * into job;

  return job;
end;
$$;

create or replace function enqueue_handler_job(p_tenant uuid, p_run uuid, p_step uuid, p_due timestamptz default now(), p_payload jsonb default '{}'::jsonb)
returns handler_jobs
language plpgsql
security definer
as $$
declare
  job handler_jobs%rowtype;
begin
  insert into handler_jobs (tenant_id, run_id, due_at, payload)
  values (p_tenant, p_run, coalesce(p_due, now()), coalesce(p_payload, '{}'::jsonb))
  returning * into job;
  return job;
end;
$$;
create or replace function get_tenant_plan(p_tenant uuid)
returns table(plan text, feature_flags jsonb)
language sql
security definer
as 
  select plan::text as plan,
         coalesce("featureFlags", '{}'::jsonb) as feature_flags
    from "Tenant"
   where id = p_tenant;
;

