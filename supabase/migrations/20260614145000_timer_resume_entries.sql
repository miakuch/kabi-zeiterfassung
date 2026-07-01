alter table public.timer_drafts
add column resumed_time_entry_id uuid references public.time_entries(id) on delete set null;

create index timer_drafts_resumed_time_entry_id_idx
on public.timer_drafts (resumed_time_entry_id)
where resumed_time_entry_id is not null;

drop policy timer_drafts_insert_own_or_admin on public.timer_drafts;
drop policy timer_drafts_update_own_or_admin on public.timer_drafts;

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
      and (
        resumed_time_entry_id is null
        or exists (
          select 1
          from public.time_entries te
          where te.id = resumed_time_entry_id
            and te.employee_id = employee_id
        )
      )
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
      and (
        resumed_time_entry_id is null
        or exists (
          select 1
          from public.time_entries te
          where te.id = resumed_time_entry_id
            and te.employee_id = employee_id
        )
      )
    )
  )
);
