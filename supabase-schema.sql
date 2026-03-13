-- Run this in your Supabase SQL editor (Dashboard > SQL Editor > New query)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Tasks table
create table if not exists public.tasks (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  description text,
  due_at      timestamptz,
  priority    text check (priority in ('low', 'medium', 'high')) default 'medium',
  points      int default 3,
  bonus_points int default 0,
  completed   boolean default false,
  completed_at timestamptz,
  created_at  timestamptz default now()
);

-- Row Level Security — users can only see/edit their own tasks
alter table public.tasks enable row level security;

create policy "Users can manage their own tasks"
  on public.tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast per-user queries
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_due_at_idx on public.tasks(due_at);

-- Activities table (for time tracking)
create table if not exists public.activities (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  color      text not null default '#6366f1',
  created_at timestamptz default now()
);

alter table public.activities enable row level security;

create policy "Users can manage their own activities"
  on public.activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists activities_user_id_idx on public.activities(user_id);

-- Activity sessions table
create table if not exists public.activity_sessions (
  id          uuid default uuid_generate_v4() primary key,
  activity_id uuid references public.activities(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  started_at  timestamptz default now() not null,
  ended_at    timestamptz
);

alter table public.activity_sessions enable row level security;

create policy "Users can manage their own sessions"
  on public.activity_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists sessions_user_id_idx on public.activity_sessions(user_id);
create index if not exists sessions_activity_id_idx on public.activity_sessions(activity_id);
create index if not exists sessions_started_at_idx on public.activity_sessions(started_at);

-- Enable realtime for activity tables
alter publication supabase_realtime add table activities;
alter publication supabase_realtime add table activity_sessions;
