create index if not exists time_entries_work_date_start_time_idx
on public.time_entries (work_date desc, start_time desc);

create index if not exists time_entries_billable_work_date_idx
on public.time_entries (billable, work_date desc);

create index if not exists time_entries_task_employee_date_idx
on public.time_entries (task_id, employee_id, work_date desc);

create index if not exists tasks_project_status_idx
on public.tasks (project_id, status);
