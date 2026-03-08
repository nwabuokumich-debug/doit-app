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
