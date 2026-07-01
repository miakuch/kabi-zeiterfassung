create table public.time_entry_segments (
  id uuid primary key default gen_random_uuid(),
  time_entry_id uuid not null references public.time_entries(id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_entry_segments_end_after_start check (end_time > start_time)
);

create index time_entry_segments_entry_time_idx
on public.time_entry_segments (time_entry_id, work_date, start_time);

create trigger time_entry_segments_set_updated_at
before update on public.time_entry_segments
for each row execute function public.set_updated_at();

insert into public.time_entry_segments (
  time_entry_id,
  work_date,
  start_time,
  end_time,
  duration_minutes
)
select
  id,
  work_date,
  start_time,
  end_time,
  duration_minutes
from public.time_entries
where not exists (
  select 1
  from public.time_entry_segments tes
  where tes.time_entry_id = time_entries.id
);

alter table public.time_entry_segments enable row level security;

grant select, insert, update, delete on public.time_entry_segments to authenticated;
grant all on public.time_entry_segments to service_role;

create policy time_entry_segments_select_own_or_admin
on public.time_entry_segments
for select
to authenticated
using (
  public.is_active_employee()
  and exists (
    select 1
    from public.time_entries te
    where te.id = time_entry_id
      and (
        public.is_admin()
        or te.employee_id = public.current_employee_id()
      )
  )
);

create policy time_entry_segments_insert_own_or_admin
on public.time_entry_segments
for insert
to authenticated
with check (
  public.is_active_employee()
  and exists (
    select 1
    from public.time_entries te
    where te.id = time_entry_id
      and (
        public.is_admin()
        or te.employee_id = public.current_employee_id()
      )
  )
);

create policy time_entry_segments_update_own_or_admin
on public.time_entry_segments
for update
to authenticated
using (
  public.is_active_employee()
  and exists (
    select 1
    from public.time_entries te
    where te.id = time_entry_id
      and (
        public.is_admin()
        or te.employee_id = public.current_employee_id()
      )
  )
)
with check (
  public.is_active_employee()
  and exists (
    select 1
    from public.time_entries te
    where te.id = time_entry_id
      and (
        public.is_admin()
        or te.employee_id = public.current_employee_id()
      )
  )
);

create policy time_entry_segments_delete_own_or_admin
on public.time_entry_segments
for delete
to authenticated
using (
  public.is_active_employee()
  and exists (
    select 1
    from public.time_entries te
    where te.id = time_entry_id
      and (
        public.is_admin()
        or te.employee_id = public.current_employee_id()
      )
  )
);
