-- Apply before deploying the archive UI. Existing projects remain unchanged.
-- Keep record_status shared by customers/employees/tasks limited to active/inactive.
alter table public.projects add column archived_at timestamptz;
alter table public.projects add constraint projects_archive_requires_inactive
  check (archived_at is null or status = 'inactive');

-- Historical context remains governed by the existing RLS policies.
grant select (archived_at) on public.projects to authenticated;

create or replace function public.guard_project_archival()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived_at is not null then
    if old.archived_at is null and exists (
      select 1 from public.timer_drafts d
      join public.tasks t on t.id = d.task_id
      where t.project_id = new.id
    ) then
      raise exception using errcode = '23514', message = 'PROJECT_HAS_TIMER_DRAFT';
    end if;
    -- Keep the original archive date when editing an already archived project.
    new.archived_at := coalesce(old.archived_at, new.archived_at);
  end if;
  return new;
end;
$$;

create trigger projects_guard_archival
before update on public.projects
for each row execute function public.guard_project_archival();

create or replace function public.guard_project_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.record_status;
  v_archived_at timestamptz;
begin
  -- Corrections of existing times remain possible, including historical times.
  if tg_op = 'UPDATE' and new.task_id = old.task_id and tg_table_name = 'time_entries' then
    return new;
  end if;

  -- Serialize new bookings with status changes so a stale picker cannot book
  -- into an archived project, even when using the service role or admin access.
  select p.status, p.archived_at into v_status, v_archived_at
  from public.projects p join public.tasks t on t.project_id = p.id
  where t.id = new.task_id
  for share of p;

  if v_archived_at is not null then
    raise exception using errcode = '23514', message = 'PROJECT_ARCHIVED';
  end if;
  if v_status = 'inactive' and (tg_op = 'INSERT' or new.task_id is distinct from old.task_id) then
    raise exception using errcode = '23514', message = 'PROJECT_INACTIVE';
  end if;
  return new;
end;
$$;

create trigger time_entries_guard_project_booking
before insert or update of task_id on public.time_entries
for each row execute function public.guard_project_booking();

create trigger timer_drafts_guard_project_booking
before insert or update on public.timer_drafts
for each row execute function public.guard_project_booking();

-- These functions are trigger-only; no new client-callable capabilities.
revoke all on function public.guard_project_archival() from public, anon, authenticated;
revoke all on function public.guard_project_booking() from public, anon, authenticated;

-- Historical edits keep the same task; new assignments must remain bookable.
create or replace function public.save_time_entry_with_segments(
  p_entry_id uuid,
  p_task_id uuid,
  p_description text,
  p_work_date date,
  p_billable boolean,
  p_segments jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_employee_id uuid;
  v_target_employee_id uuid;
  v_existing_task_id uuid;
  v_saved_entry_id uuid;
  v_segment_count integer;
  v_start_time time;
  v_end_time time;
  v_duration_minutes integer;
begin
  v_employee_id := public.current_employee_id();

  if v_employee_id is null then
    raise exception using errcode = '42501', message = 'Aktive Mitarbeitenden-Sitzung erforderlich.';
  end if;

  if p_entry_id is null then
    v_target_employee_id := v_employee_id;
  else
    select employee_id, task_id
    into v_target_employee_id, v_existing_task_id
    from public.time_entries
    where id = p_entry_id;

    if v_target_employee_id is null then
      raise exception using errcode = '42501', message = 'Zeiteintrag wurde nicht gefunden.';
    end if;
  end if;

  if (v_existing_task_id is distinct from p_task_id)
    and not public.can_book_task(p_task_id, v_target_employee_id) then
    raise exception using errcode = '42501', message = 'Aufgabe ist nicht buchbar.';
  end if;

  if p_description is null or length(btrim(p_description)) = 0 then
    raise exception using errcode = '22023', message = 'Beschreibung ist erforderlich.';
  end if;

  if p_segments is null
    or jsonb_typeof(p_segments) <> 'array'
    or jsonb_array_length(p_segments) = 0
  then
    raise exception using errcode = '22023', message = 'Mindestens ein Zeitraum ist erforderlich.';
  end if;

  with parsed_segments as (
    select
      (segment ->> 'start_time')::time as start_time,
      (segment ->> 'end_time')::time as end_time
    from jsonb_array_elements(p_segments) as segments(segment)
  )
  select
    count(*)::integer,
    min(start_time),
    max(end_time),
    sum(ceil(extract(epoch from (end_time - start_time)) / 60.0))::integer
  into
    v_segment_count,
    v_start_time,
    v_end_time,
    v_duration_minutes
  from parsed_segments
  where end_time > start_time;

  if v_segment_count <> jsonb_array_length(p_segments) then
    raise exception using errcode = '22023', message = 'Zeiträume sind ungültig.';
  end if;

  if exists (
    with parsed_segments as (
      select
        (segment ->> 'start_time')::time as start_time,
        (segment ->> 'end_time')::time as end_time
      from jsonb_array_elements(p_segments) as segments(segment)
    ), ordered_segments as (
      select
        start_time,
        max(end_time) over (
          order by start_time, end_time
          rows between unbounded preceding and 1 preceding
        ) as latest_previous_end
      from parsed_segments
    )
    select 1
    from ordered_segments
    where start_time < latest_previous_end
  ) then
    raise exception using errcode = '22023', message = 'Zeiträume dürfen sich nicht überschneiden.';
  end if;

  if p_entry_id is null then
    insert into public.time_entries (
      employee_id,
      task_id,
      description,
      work_date,
      start_time,
      end_time,
      duration_minutes,
      billable,
      created_by_employee_id,
      updated_by_employee_id
    )
    values (
      v_target_employee_id,
      p_task_id,
      btrim(p_description),
      p_work_date,
      v_start_time,
      v_end_time,
      v_duration_minutes,
      p_billable,
      v_employee_id,
      v_employee_id
    )
    returning id into v_saved_entry_id;
  else
    update public.time_entries
    set
      task_id = p_task_id,
      description = btrim(p_description),
      work_date = p_work_date,
      start_time = v_start_time,
      end_time = v_end_time,
      duration_minutes = v_duration_minutes,
      billable = p_billable,
      updated_by_employee_id = v_employee_id
    where id = p_entry_id
    returning id into v_saved_entry_id;

    if v_saved_entry_id is null then
      raise exception using errcode = '42501', message = 'Zeiteintrag wurde nicht gefunden.';
    end if;

    delete from public.time_entry_segments
    where time_entry_id = v_saved_entry_id;
  end if;

  insert into public.time_entry_segments (
    time_entry_id,
    work_date,
    start_time,
    end_time,
    duration_minutes
  )
  select
    v_saved_entry_id,
    p_work_date,
    parsed.start_time,
    parsed.end_time,
    ceil(extract(epoch from (parsed.end_time - parsed.start_time)) / 60.0)::integer
  from (
    select
      (segment ->> 'start_time')::time as start_time,
      (segment ->> 'end_time')::time as end_time
    from jsonb_array_elements(p_segments) as segments(segment)
  ) as parsed
  order by parsed.start_time, parsed.end_time;

  return v_saved_entry_id;
end;
$$;

revoke all on function public.save_time_entry_with_segments(
  uuid,
  uuid,
  text,
  date,
  boolean,
  jsonb
) from public;

grant execute on function public.save_time_entry_with_segments(
  uuid,
  uuid,
  text,
  date,
  boolean,
  jsonb
) to authenticated;

grant execute on function public.save_time_entry_with_segments(
  uuid,
  uuid,
  text,
  date,
  boolean,
  jsonb
) to service_role;

-- Historical edits keep the same task; new assignments must remain bookable.
create or replace function public.update_time_entry_with_segments(
  p_entry_id uuid,
  p_employee_id uuid,
  p_task_id uuid,
  p_description text,
  p_work_date date,
  p_billable boolean,
  p_segments jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current_employee_id uuid;
  v_existing_employee_id uuid;
  v_existing_task_id uuid;
  v_saved_entry_id uuid;
  v_segment_count integer;
  v_start_time time;
  v_end_time time;
  v_duration_minutes integer;
begin
  v_current_employee_id := public.current_employee_id();

  if v_current_employee_id is null then
    raise exception using errcode = '42501', message = 'Aktive Mitarbeitenden-Sitzung erforderlich.';
  end if;

  select employee_id, task_id
  into v_existing_employee_id, v_existing_task_id
  from public.time_entries
  where id = p_entry_id;

  if v_existing_employee_id is null then
    raise exception using errcode = '42501', message = 'Zeiteintrag wurde nicht gefunden.';
  end if;

  if not public.is_admin()
    and (
      v_existing_employee_id <> v_current_employee_id
      or p_employee_id <> v_current_employee_id
    )
  then
    raise exception using errcode = '42501', message = 'Zeiteintrag darf nicht bearbeitet werden.';
  end if;

  if not exists (
    select 1
    from public.employees
    where id = p_employee_id
  ) then
    raise exception using errcode = '22023', message = 'Mitarbeitende Person wurde nicht gefunden.';
  end if;

  if not exists (
    select 1
    from public.tasks
    where id = p_task_id
  ) then
    raise exception using errcode = '22023', message = 'Aufgabe wurde nicht gefunden.';
  end if;

  if (v_existing_task_id is distinct from p_task_id)
    and not public.can_book_task(p_task_id, p_employee_id) then
    raise exception using errcode = '42501', message = 'Aufgabe ist nicht buchbar.';
  end if;

  if p_description is null or length(btrim(p_description)) = 0 then
    raise exception using errcode = '22023', message = 'Beschreibung ist erforderlich.';
  end if;

  if p_work_date is null then
    raise exception using errcode = '22023', message = 'Datum ist erforderlich.';
  end if;

  if p_segments is null
    or jsonb_typeof(p_segments) <> 'array'
    or jsonb_array_length(p_segments) = 0
  then
    raise exception using errcode = '22023', message = 'Mindestens ein Zeitraum ist erforderlich.';
  end if;

  with parsed_segments as (
    select
      (segment ->> 'start_time')::time as start_time,
      (segment ->> 'end_time')::time as end_time
    from jsonb_array_elements(p_segments) as segments(segment)
  )
  select
    count(*)::integer,
    min(start_time),
    max(end_time),
    sum(ceil(extract(epoch from (end_time - start_time)) / 60.0))::integer
  into
    v_segment_count,
    v_start_time,
    v_end_time,
    v_duration_minutes
  from parsed_segments
  where end_time > start_time;

  if v_segment_count <> jsonb_array_length(p_segments) then
    raise exception using errcode = '22023', message = 'Zeiträume sind ungültig.';
  end if;

  if exists (
    with parsed_segments as (
      select
        (segment ->> 'start_time')::time as start_time,
        (segment ->> 'end_time')::time as end_time
      from jsonb_array_elements(p_segments) as segments(segment)
    ), ordered_segments as (
      select
        start_time,
        max(end_time) over (
          order by start_time, end_time
          rows between unbounded preceding and 1 preceding
        ) as latest_previous_end
      from parsed_segments
    )
    select 1
    from ordered_segments
    where start_time < latest_previous_end
  ) then
    raise exception using errcode = '22023', message = 'Zeiträume dürfen sich nicht überschneiden.';
  end if;

  update public.time_entries
  set
    employee_id = p_employee_id,
    task_id = p_task_id,
    description = btrim(p_description),
    work_date = p_work_date,
    start_time = v_start_time,
    end_time = v_end_time,
    duration_minutes = v_duration_minutes,
    billable = p_billable,
    updated_by_employee_id = v_current_employee_id
  where id = p_entry_id
  returning id into v_saved_entry_id;

  if v_saved_entry_id is null then
    raise exception using errcode = '42501', message = 'Zeiteintrag wurde nicht gefunden.';
  end if;

  delete from public.time_entry_segments
  where time_entry_id = v_saved_entry_id;

  insert into public.time_entry_segments (
    time_entry_id,
    work_date,
    start_time,
    end_time,
    duration_minutes
  )
  select
    v_saved_entry_id,
    p_work_date,
    parsed.start_time,
    parsed.end_time,
    ceil(extract(epoch from (parsed.end_time - parsed.start_time)) / 60.0)::integer
  from (
    select
      (segment ->> 'start_time')::time as start_time,
      (segment ->> 'end_time')::time as end_time
    from jsonb_array_elements(p_segments) as segments(segment)
  ) as parsed
  order by parsed.start_time, parsed.end_time;

  return v_saved_entry_id;
end;
$$;

revoke all on function public.update_time_entry_with_segments(
  uuid,
  uuid,
  uuid,
  text,
  date,
  boolean,
  jsonb
) from public;

grant execute on function public.update_time_entry_with_segments(
  uuid,
  uuid,
  uuid,
  text,
  date,
  boolean,
  jsonb
) to authenticated;

grant execute on function public.update_time_entry_with_segments(
  uuid,
  uuid,
  uuid,
  text,
  date,
  boolean,
  jsonb
) to service_role;
