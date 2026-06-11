-- ============================================================
-- DevHub Pro — Supabase Schema
-- Jalankan seluruh file ini di Supabase SQL Editor
-- ============================================================

-- NOTES
create table if not exists notes (
  id           text primary key,
  user_id      uuid references auth.users not null,
  title        text not null default '',
  content      text not null default '',
  tags         text[] not null default '{}',
  pinned       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table notes enable row level security;
create policy "notes: user owns rows" on notes for all using (auth.uid() = user_id);

-- TASKS
create table if not exists tasks (
  id           text primary key,
  user_id      uuid references auth.users not null,
  title        text not null default '',
  description  text,
  priority     text not null default 'medium',
  status       text not null default 'todo',
  category     text,
  deadline     timestamptz,
  created_at   timestamptz not null default now(),
  "order"      int not null default 0
);

alter table tasks enable row level security;
create policy "tasks: user owns rows" on tasks for all using (auth.uid() = user_id);

-- POMODORO SESSIONS
create table if not exists pomodoro_sessions (
  id           text primary key,
  user_id      uuid references auth.users not null,
  mode         text not null,
  duration     int not null,
  completed_at timestamptz not null
);

alter table pomodoro_sessions enable row level security;
create policy "pomodoro_sessions: user owns rows" on pomodoro_sessions for all using (auth.uid() = user_id);

-- POMODORO SETTINGS (one row per user)
create table if not exists pomodoro_settings (
  user_id      uuid primary key references auth.users,
  focus        int not null default 25,
  short_break  int not null default 5,
  long_break   int not null default 15,
  daily_goal   int not null default 8
);

alter table pomodoro_settings enable row level security;
create policy "pomodoro_settings: user owns row" on pomodoro_settings for all using (auth.uid() = user_id);
