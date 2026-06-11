create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select e.id
  from public.employees e
  where e.auth_user_id = auth.uid()
    and e.status = 'active'
  limit 1
$$;

create or replace function public.is_active_employee()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.current_employee_id() is not null
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.employees e
    where e.auth_user_id = auth.uid()
      and e.role = 'admin'
      and e.status = 'active'
  )
$$;

create or replace function public.can_book_task(p_task_id uuid, p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.tasks t
      join public.projects p on p.id = t.project_id
      join public.customers c on c.id = p.customer_id
      where t.id = p_task_id
        and t.status = 'active'
        and p.status = 'active'
        and c.status = 'active'
        and (
          t.assignment_mode = 'all'
          or exists (
            select 1
            from public.task_assignments ta
            where ta.task_id = t.id
              and ta.employee_id = p_employee_id
          )
        )
    )
$$;

create or replace function public.can_view_task_context(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.tasks t
      join public.projects p on p.id = t.project_id
      join public.customers c on c.id = p.customer_id
      where t.id = p_task_id
        and t.status = 'active'
        and p.status = 'active'
        and c.status = 'active'
        and (
          t.assignment_mode = 'all'
          or exists (
            select 1
            from public.task_assignments ta
            where ta.task_id = t.id
              and ta.employee_id = public.current_employee_id()
          )
        )
    )
    or exists (
      select 1
      from public.time_entries te
      where te.task_id = p_task_id
        and te.employee_id = public.current_employee_id()
    )
$$;

create or replace function public.can_view_project_context(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.tasks t
      where t.project_id = p_project_id
        and public.can_view_task_context(t.id)
    )
$$;

create or replace function public.can_view_customer_context(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.customer_id = p_customer_id
        and public.can_view_project_context(p.id)
    )
$$;

alter table public.employees enable row level security;
alter table public.customers enable row level security;
alter table public.projects enable row level security;
alter table public.project_member_rates enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.time_entries enable row level security;
alter table public.timer_drafts enable row level security;
alter table public.user_preferences enable row level security;

revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select (id, customer_id, name, code, color, status, created_at, updated_at)
  on public.projects to authenticated;
grant insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_member_rates to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.task_assignments to authenticated;
grant select, insert, update, delete on public.time_entries to authenticated;
grant select, insert, update, delete on public.timer_drafts to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

grant all on all tables in schema public to service_role;
grant execute on function public.current_employee_id() to authenticated, service_role;
grant execute on function public.is_active_employee() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.can_book_task(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_view_task_context(uuid) to authenticated, service_role;
grant execute on function public.can_view_project_context(uuid) to authenticated, service_role;
grant execute on function public.can_view_customer_context(uuid) to authenticated, service_role;

create policy employees_select_own_or_admin
on public.employees
for select
to authenticated
using (
  public.is_admin()
  or id = public.current_employee_id()
);

create policy employees_insert_admin
on public.employees
for insert
to authenticated
with check (public.is_admin());

create policy employees_update_admin
on public.employees
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy employees_delete_admin
on public.employees
for delete
to authenticated
using (public.is_admin());

create policy customers_select_relevant
on public.customers
for select
to authenticated
using (
  public.is_active_employee()
  and public.can_view_customer_context(id)
);

create policy customers_insert_admin
on public.customers
for insert
to authenticated
with check (public.is_admin());

create policy customers_update_admin
on public.customers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy customers_delete_admin
on public.customers
for delete
to authenticated
using (public.is_admin());

create policy projects_select_relevant
on public.projects
for select
to authenticated
using (
  public.is_active_employee()
  and public.can_view_project_context(id)
);

create policy projects_insert_admin
on public.projects
for insert
to authenticated
with check (public.is_admin());

create policy projects_update_admin
on public.projects
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy projects_delete_admin
on public.projects
for delete
to authenticated
using (public.is_admin());

create policy project_member_rates_admin_all
on public.project_member_rates
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy tasks_select_relevant
on public.tasks
for select
to authenticated
using (
  public.is_active_employee()
  and public.can_view_task_context(id)
);

create policy tasks_insert_admin
on public.tasks
for insert
to authenticated
with check (public.is_admin());

create policy tasks_update_admin
on public.tasks
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy tasks_delete_admin
on public.tasks
for delete
to authenticated
using (public.is_admin());

create policy task_assignments_select_relevant
on public.task_assignments
for select
to authenticated
using (
  public.is_active_employee()
  and public.can_view_task_context(task_id)
);

create policy task_assignments_insert_admin
on public.task_assignments
for insert
to authenticated
with check (public.is_admin());

create policy task_assignments_update_admin
on public.task_assignments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy task_assignments_delete_admin
on public.task_assignments
for delete
to authenticated
using (public.is_admin());

create policy time_entries_select_own_or_admin
on public.time_entries
for select
to authenticated
using (
  public.is_active_employee()
  and (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
);

create policy time_entries_insert_own_or_admin
on public.time_entries
for insert
to authenticated
with check (
  public.is_active_employee()
  and (
    public.is_admin()
    or (
      employee_id = public.current_employee_id()
      and created_by_employee_id = public.current_employee_id()
      and public.can_book_task(task_id, employee_id)
    )
  )
);

create policy time_entries_update_own_or_admin
on public.time_entries
for update
to authenticated
using (
  public.is_active_employee()
  and (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
)
with check (
  public.is_active_employee()
  and (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
);

create policy time_entries_delete_own_or_admin
on public.time_entries
for delete
to authenticated
using (
  public.is_active_employee()
  and (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
);

create policy timer_drafts_select_own_or_admin
on public.timer_drafts
for select
to authenticated
using (
  public.is_active_employee()
  and (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
);

create policy timer_drafts_insert_own_or_admin
on public.timer_drafts
for insert
to authenticated
with check (
  public.is_active_employee()
  and (
    public.is_admin()
    or (
      employee_id = public.current_employee_id()
      and public.can_book_task(task_id, employee_id)
    )
  )
);

create policy timer_drafts_update_own_or_admin
on public.timer_drafts
for update
to authenticated
using (
  public.is_active_employee()
  and (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
)
with check (
  public.is_active_employee()
  and (
    public.is_admin()
    or (
      employee_id = public.current_employee_id()
      and public.can_book_task(task_id, employee_id)
    )
  )
);

create policy timer_drafts_delete_own_or_admin
on public.timer_drafts
for delete
to authenticated
using (
  public.is_active_employee()
  and (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
);

create policy user_preferences_select_own_or_admin
on public.user_preferences
for select
to authenticated
using (
  public.is_active_employee()
  and (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
);

create policy user_preferences_insert_own_or_admin
on public.user_preferences
for insert
to authenticated
with check (
  public.is_active_employee()
  and (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
);

create policy user_preferences_update_own_or_admin
on public.user_preferences
for update
to authenticated
using (
  public.is_active_employee()
  and (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
)
with check (
  public.is_active_employee()
  and (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
);

create policy user_preferences_delete_own_or_admin
on public.user_preferences
for delete
to authenticated
using (
  public.is_active_employee()
  and (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
);
