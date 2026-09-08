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
    select employee_id
    into v_target_employee_id
    from public.time_entries
    where id = p_entry_id;

    if v_target_employee_id is null then
      raise exception using errcode = '42501', message = 'Zeiteintrag wurde nicht gefunden.';
    end if;
  end if;

  if not public.can_book_task(p_task_id, v_target_employee_id) then
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
