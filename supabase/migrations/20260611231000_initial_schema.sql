create extension if not exists pgcrypto with schema extensions;

create type public.employee_role as enum ('admin', 'employee');
create type public.record_status as enum ('active', 'inactive');
create type public.budget_alert_basis as enum ('hours', 'amount');
create type public.task_assignment_mode as enum ('all', 'selected');
create type public.timer_draft_status as enum ('running', 'stopped');
create type public.entry_mode as enum ('timer', 'manual');
create type public.manual_entry_mode as enum ('end', 'duration');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null check (length(btrim(name)) > 0),
  email text not null,
  role public.employee_role not null default 'employee',
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index employees_email_unique_idx on public.employees (lower(email));
create index employees_auth_user_id_idx on public.employees (auth_user_id);
create index employees_status_role_idx on public.employees (status, role);

create trigger employees_set_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customers_name_unique_idx on public.customers (lower(name));
create index customers_status_idx on public.customers (status);

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  code text,
  color text not null default '#2498ac',
  status public.record_status not null default 'active',
  hourly_budget numeric(10, 2) check (hourly_budget is null or hourly_budget >= 0),
  amount_budget numeric(12, 2) check (amount_budget is null or amount_budget >= 0),
  budget_alert_basis public.budget_alert_basis,
  default_hourly_rate numeric(10, 2) check (default_hourly_rate is null or default_hourly_rate >= 0),
  budget_80_acknowledged_at timestamptz,
  budget_exceeded_acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_budget_alert_basis_requires_budget check (
    budget_alert_basis is null
    or (budget_alert_basis = 'hours' and hourly_budget is not null)
    or (budget_alert_basis = 'amount' and amount_budget is not null)
  )
);

create index projects_customer_id_idx on public.projects (customer_id);
create index projects_status_idx on public.projects (status);
create index projects_code_idx on public.projects (code) where code is not null;

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create table public.project_member_rates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  hourly_rate numeric(10, 2) not null check (hourly_rate >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, employee_id)
);

create index project_member_rates_employee_id_idx on public.project_member_rates (employee_id);

create trigger project_member_rates_set_updated_at
before update on public.project_member_rates
for each row execute function public.set_updated_at();

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  description text,
  status public.record_status not null default 'active',
  default_billable boolean not null default true,
  assignment_mode public.task_assignment_mode not null default 'selected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_status_assignment_mode_idx on public.tasks (status, assignment_mode);
create unique index tasks_project_name_unique_idx on public.tasks (project_id, lower(name));

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, employee_id)
);

create index task_assignments_employee_id_idx on public.task_assignments (employee_id);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  task_id uuid not null references public.tasks(id) on delete restrict,
  description text not null check (length(btrim(description)) > 0),
  work_date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes >= 1),
  billable boolean not null,
  created_by_employee_id uuid not null references public.employees(id) on delete restrict,
  updated_by_employee_id uuid references public.employees(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_entries_end_after_start check (end_time > start_time)
);

create index time_entries_employee_date_idx on public.time_entries (employee_id, work_date desc, start_time desc);
create index time_entries_task_date_idx on public.time_entries (task_id, work_date desc);
create index time_entries_billable_idx on public.time_entries (billable);
create index time_entries_created_by_idx on public.time_entries (created_by_employee_id);

create trigger time_entries_set_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

create table public.timer_drafts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete restrict,
  description text,
  billable boolean not null,
  started_at_utc timestamptz not null,
  stopped_at_utc timestamptz,
  status public.timer_draft_status not null default 'running',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id),
  constraint timer_drafts_status_times_check check (
    (status = 'running' and stopped_at_utc is null)
    or (status = 'stopped' and stopped_at_utc is not null and stopped_at_utc >= started_at_utc)
  )
);

create index timer_drafts_task_id_idx on public.timer_drafts (task_id);
create index timer_drafts_status_idx on public.timer_drafts (status);

create trigger timer_drafts_set_updated_at
before update on public.timer_drafts
for each row execute function public.set_updated_at();

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  last_entry_mode public.entry_mode not null default 'timer',
  last_manual_mode public.manual_entry_mode not null default 'end',
  time_entries_page_size integer not null default 50 check (time_entries_page_size in (50, 100, 250)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id)
);

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

create or replace function public.prevent_last_active_admin_change()
returns trigger
language plpgsql
as $$
declare
  active_admin_count integer;
begin
  if tg_op = 'DELETE' then
    if old.role = 'admin' and old.status = 'active' then
      select count(*) into active_admin_count
      from public.employees
      where role = 'admin' and status = 'active';

      if active_admin_count <= 1 then
        raise exception 'Der letzte aktive Admin darf nicht entfernt werden.';
      end if;
    end if;

    return old;
  end if;

  if old.role = 'admin'
    and old.status = 'active'
    and (new.role <> 'admin' or new.status <> 'active')
  then
    select count(*) into active_admin_count
    from public.employees
    where role = 'admin' and status = 'active';

    if active_admin_count <= 1 then
      raise exception 'Der letzte aktive Admin darf nicht deaktiviert oder degradiert werden.';
    end if;
  end if;

  return new;
end;
$$;

create trigger employees_prevent_last_active_admin_update
before update on public.employees
for each row execute function public.prevent_last_active_admin_change();

create trigger employees_prevent_last_active_admin_delete
before delete on public.employees
for each row execute function public.prevent_last_active_admin_change();
