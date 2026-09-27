-- Run against the existing database BEFORE deploying the planner frontend.
-- Additive: leaves deadlines, completion timestamps, scores and existing tasks intact.
begin;
alter table public.tasks add column if not exists scheduled_start timestamptz;
alter table public.tasks add column if not exists scheduled_end timestamptz;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tasks'::regclass and conname = 'tasks_schedule_valid'
  ) then
    alter table public.tasks add constraint tasks_schedule_valid check (
      (scheduled_start is null and scheduled_end is null) or
      (scheduled_start is not null and scheduled_end is not null and scheduled_end > scheduled_start)
    );
  end if;
end $$;
commit;
