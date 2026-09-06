-- Study Companion — Database Schema + RLS Policies
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
--
-- If you already have this schema applied and are adding Phase 4
-- (dashboard), run this against your existing database instead of the
-- full script below:
--   alter table tasks add column completed_at timestamptz;

-- ============================================================
-- Tables
-- ============================================================

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  subject text,
  description text,
  priority text check (priority in ('low', 'medium', 'high')) default 'medium',
  status text check (status in ('todo', 'doing', 'done')) default 'todo',
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  subject text,
  created_at timestamptz default now()
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references decks(id) on delete cascade,
  front text not null,
  back text not null,
  ease_factor real default 2.5,
  interval_days integer default 0,
  repetitions integer default 0,
  next_review_date date default current_date,
  created_at timestamptz default now()
);

create table review_logs (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  quality integer check (quality between 0 and 5),
  reviewed_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table tasks enable row level security;
alter table decks enable row level security;
alter table cards enable row level security;
alter table review_logs enable row level security;

-- tasks
create policy "Users can view own tasks" on tasks for select using (auth.uid() = user_id);
create policy "Users can insert own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on tasks for update using (auth.uid() = user_id);
create policy "Users can delete own tasks" on tasks for delete using (auth.uid() = user_id);

-- decks
create policy "Users can view own decks" on decks for select using (auth.uid() = user_id);
create policy "Users can insert own decks" on decks for insert with check (auth.uid() = user_id);
create policy "Users can update own decks" on decks for update using (auth.uid() = user_id);
create policy "Users can delete own decks" on decks for delete using (auth.uid() = user_id);

-- cards (join through decks)
create policy "Users can view own cards" on cards for select using (
  exists (select 1 from decks where decks.id = cards.deck_id and decks.user_id = auth.uid())
);
create policy "Users can insert own cards" on cards for insert with check (
  exists (select 1 from decks where decks.id = cards.deck_id and decks.user_id = auth.uid())
);
create policy "Users can update own cards" on cards for update using (
  exists (select 1 from decks where decks.id = cards.deck_id and decks.user_id = auth.uid())
);
create policy "Users can delete own cards" on cards for delete using (
  exists (select 1 from decks where decks.id = cards.deck_id and decks.user_id = auth.uid())
);

-- review_logs
create policy "Users can view own review logs" on review_logs for select using (auth.uid() = user_id);
create policy "Users can insert own review logs" on review_logs for insert with check (auth.uid() = user_id);
-- delete/update intentionally omitted (audit trail)
