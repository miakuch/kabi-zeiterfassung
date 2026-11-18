-- Run after all migrations in a disposable database. All fixtures roll back.
begin;
insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');
insert into public.employees (id, auth_user_id, name, email, role) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Archiv Test Admin', 'archive-admin@example.test', 'admin'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Archiv Test Employee', 'archive-employee@example.test', 'employee');
insert into public.customers (id, name) values ('00000000-0000-4000-8000-000000000003', 'Archiv Test Kunde');
insert into public.projects (id, customer_id, name) values
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003', 'Archiv Test Projekt');
insert into public.tasks (id, project_id, name, assignment_mode) values
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000004', 'Archiv Test Aufgabe', 'all');
insert into public.time_entries (id, employee_id, task_id, description, work_date, start_time, end_time, duration_minutes, billable, created_by_employee_id) values
  ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005', 'Historische Zeit', '2026-11-01', '09:00', '10:00', 60, true, '00000000-0000-4000-8000-000000000002');
insert into public.timer_drafts (employee_id, task_id, billable, started_at_utc) values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005', true, now());

do $$
begin
  begin
    update public.projects set status = 'inactive', archived_at = now()
    where id = '00000000-0000-4000-8000-000000000004';
    raise exception 'Expected running timer to block archival';
  exception when check_violation then
    if sqlerrm <> 'PROJECT_HAS_TIMER_DRAFT' then raise; end if;
  end;
end $$;
update public.timer_drafts set status = 'stopped', stopped_at_utc = now()
where employee_id = '00000000-0000-4000-8000-000000000002';
do $$
begin
  begin
    update public.projects set status = 'inactive', archived_at = now()
    where id = '00000000-0000-4000-8000-000000000004';
    raise exception 'Expected stopped timer to block archival';
  exception when check_violation then
    if sqlerrm <> 'PROJECT_HAS_TIMER_DRAFT' then raise; end if;
  end;
end $$;
delete from public.timer_drafts where employee_id = '00000000-0000-4000-8000-000000000002';
update public.projects set status = 'inactive', archived_at = '2026-11-18T10:00:00Z'
where id = '00000000-0000-4000-8000-000000000004';
update public.projects set name = 'Archiv Test Abgeschlossen', archived_at = now()
where id = '00000000-0000-4000-8000-000000000004';
do $$
begin
  if (select archived_at from public.projects where id = '00000000-0000-4000-8000-000000000004') <> '2026-11-18T10:00:00Z'::timestamptz then
    raise exception 'Archive date changed on metadata edit';
  end if;
  if (select status from public.tasks where id = '00000000-0000-4000-8000-000000000005') <> 'active' then
    raise exception 'Archival changed task status';
  end if;
  begin
    insert into public.timer_drafts (employee_id, task_id, billable, started_at_utc) values
      ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005', true, now());
    raise exception 'Expected archive to block new timer';
  exception when check_violation then
    if sqlerrm <> 'PROJECT_ARCHIVED' then raise; end if;
  end;
  begin
    insert into public.time_entries (employee_id, task_id, description, work_date, start_time, end_time, duration_minutes, billable, created_by_employee_id) values
      ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005', 'Neue Zeit', '2026-11-18', '09:00', '10:00', 60, true, '00000000-0000-4000-8000-000000000002');
    raise exception 'Expected archive to block new entry';
  exception when check_violation then
    if sqlerrm <> 'PROJECT_ARCHIVED' then raise; end if;
  end;
end $$;

-- Include another person's time so the employee RLS check verifies isolation.
-- Historical insertion is deliberately attempted before archive in real workflows;
-- use the existing entry copied while the project is temporarily restored here.
update public.projects set status = 'active', archived_at = null
where id = '00000000-0000-4000-8000-000000000004';
insert into public.time_entries (employee_id, task_id, description, work_date, start_time, end_time, duration_minutes, billable, created_by_employee_id) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', 'Admin Zeit', '2026-11-01', '11:00', '12:00', 60, true, '00000000-0000-4000-8000-000000000001');
update public.projects set status = 'inactive', archived_at = '2026-11-18T10:00:00Z'
where id = '00000000-0000-4000-8000-000000000004';

-- Verify historical visibility and corrections under actual employee RLS.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $$
begin
  if not exists (select 1 from public.projects where archived_at is not null) then
    raise exception 'Employee cannot see historical project context';
  end if;
  if (select sum(duration_minutes) from public.time_entries) <> 60 then
    raise exception 'Historical report hours disappeared or another employee time leaked';
  end if;
  begin
    perform hourly_budget from public.projects;
    raise exception 'Budget column became visible to employees';
  exception when insufficient_privilege then null;
  end;
end $$;
select public.save_time_entry_with_segments(
  '00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000005',
  'Historische Korrektur', '2026-11-01', true, '[{"start_time":"09:00","end_time":"10:30"}]'::jsonb
);
select public.update_time_entry_with_segments(
  '00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005',
  'Berichts-Korrektur', '2026-11-01', true, '[{"start_time":"09:00","end_time":"11:00"}]'::jsonb
);
do $$
begin
  if (select sum(duration_minutes) from public.time_entries) <> 120 then
    raise exception 'Historical correction failed';
  end if;
end $$;
reset role;

-- Restoration keeps the original task configuration; inactive still blocks new bookings.
update public.projects set archived_at = null where id = '00000000-0000-4000-8000-000000000004';
do $$
begin
  begin
    insert into public.timer_drafts (employee_id, task_id, billable, started_at_utc) values
      ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005', true, now());
    raise exception 'Expected inactive project to block new timer';
  exception when check_violation then
    if sqlerrm <> 'PROJECT_INACTIVE' then raise; end if;
  end;
end $$;
update public.projects set status = 'active' where id = '00000000-0000-4000-8000-000000000004';
insert into public.timer_drafts (employee_id, task_id, billable, started_at_utc) values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005', true, now());
rollback;
