-- ============================================================
-- DevHub Pro — Supabase Schema
-- Jalankan seluruh file ini di Supabase SQL Editor
-- Jika tabel sudah ada, jalankan hanya bagian GRANT di bawah
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

drop policy if exists "notes: user owns rows" on notes;
create policy "notes: select"  on notes for select  using       (auth.uid() = user_id);
create policy "notes: insert"  on notes for insert  with check  (auth.uid() = user_id);
create policy "notes: update"  on notes for update  using       (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes: delete"  on notes for delete  using       (auth.uid() = user_id);

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
  "order"      int not null default 0,
  cover        text,
  branch_name  text
);

alter table tasks enable row level security;

drop policy if exists "tasks: user owns rows" on tasks;
create policy "tasks: select"  on tasks for select  using       (auth.uid() = user_id);
create policy "tasks: insert"  on tasks for insert  with check  (auth.uid() = user_id);
create policy "tasks: update"  on tasks for update  using       (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks: delete"  on tasks for delete  using       (auth.uid() = user_id);

-- POMODORO SESSIONS
create table if not exists pomodoro_sessions (
  id           text primary key,
  user_id      uuid references auth.users not null,
  mode         text not null,
  duration     int not null,
  completed_at timestamptz not null
);

alter table pomodoro_sessions enable row level security;

drop policy if exists "pomodoro_sessions: user owns rows" on pomodoro_sessions;
create policy "pomodoro_sessions: select"  on pomodoro_sessions for select  using       (auth.uid() = user_id);
create policy "pomodoro_sessions: insert"  on pomodoro_sessions for insert  with check  (auth.uid() = user_id);
create policy "pomodoro_sessions: update"  on pomodoro_sessions for update  using       (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pomodoro_sessions: delete"  on pomodoro_sessions for delete  using       (auth.uid() = user_id);

-- POMODORO SETTINGS (one row per user)
create table if not exists pomodoro_settings (
  user_id      uuid primary key references auth.users,
  focus        int not null default 25,
  short_break  int not null default 5,
  long_break   int not null default 15,
  daily_goal   int not null default 8
);

alter table pomodoro_settings enable row level security;

drop policy if exists "pomodoro_settings: user owns row" on pomodoro_settings;
create policy "pomodoro_settings: select"  on pomodoro_settings for select  using       (auth.uid() = user_id);
create policy "pomodoro_settings: insert"  on pomodoro_settings for insert  with check  (auth.uid() = user_id);
create policy "pomodoro_settings: update"  on pomodoro_settings for update  using       (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pomodoro_settings: delete"  on pomodoro_settings for delete  using       (auth.uid() = user_id);

-- ============================================================
-- GRANT — wajib agar role 'authenticated' bisa baca/tulis
-- ============================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on notes             to authenticated;
grant select, insert, update, delete on tasks             to authenticated;
grant select, insert, update, delete on pomodoro_sessions to authenticated;
grant select, insert, update, delete on pomodoro_settings to authenticated;
