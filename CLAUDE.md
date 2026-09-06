# Study Companion — Project Context

## Overview
Portfolio-scale web app for students combining:
- Task/Deadline Tracker
- Spaced-Repetition Flashcards (SM-2 algorithm)
- Progress Dashboard

## Tech Stack
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend/DB/Auth:** Supabase (Postgres + Auth + RLS)
- **Charts:** recharts
- **Dates:** date-fns

## Roadmap
1. **Phase 1 — Foundation:** Next.js + Tailwind + Supabase setup, Auth, base layout
2. **Phase 2 — Task Tracker:** CRUD tasks, priority/due date, filter/sort
3. **Phase 3 — Flashcards:** CRUD decks/cards, SM-2 spaced repetition, review mode
4. **Phase 4 — Dashboard:** progress charts, streak tracker
5. **Phase 5 — Polish:** responsive/dark mode, deploy to Vercel, README

## Project Structure
```
study-companion/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/signup/page.tsx
│   │   ├── (dashboard)/tasks/page.tsx
│   │   ├── (dashboard)/flashcards/page.tsx
│   │   ├── (dashboard)/flashcards/[deckId]/page.tsx
│   │   ├── (dashboard)/flashcards/[deckId]/review/page.tsx
│   │   ├── (dashboard)/dashboard/page.tsx
│   │   ├── (dashboard)/layout.tsx
│   │   └── layout.tsx
│   ├── components/{ui,tasks,flashcards,dashboard}/
│   ├── lib/
│   │   ├── supabase/{client.ts,server.ts}
│   │   ├── auth/actions.ts
│   │   ├── spaced-repetition.ts
│   │   └── types.ts
│   ├── hooks/{useTasks.ts,useDecks.ts,useUser.ts}
│   └── middleware.ts
├── .env.local
```

## Database Schema (Supabase Postgres)

```sql
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
```

### RLS Policies

```sql
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
```

## src/lib/types.ts

```ts
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'doing' | 'done'

export interface Task {
  id: string
  user_id: string
  title: string
  subject: string | null
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Deck {
  id: string
  user_id: string
  name: string
  subject: string | null
  created_at: string
}

export interface Card {
  id: string
  deck_id: string
  front: string
  back: string
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_date: string
  created_at: string
}

export interface ReviewLog {
  id: string
  card_id: string
  user_id: string
  quality: number
  reviewed_at: string
}

export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at'>
export type DeckInsert = Omit<Deck, 'id' | 'created_at'>
export type CardInsert = Omit<
  Card,
  'id' | 'created_at' | 'ease_factor' | 'interval_days' | 'repetitions' | 'next_review_date'
> & {
  ease_factor?: number
  interval_days?: number
  repetitions?: number
  next_review_date?: string
}
export type ReviewLogInsert = Omit<ReviewLog, 'id' | 'reviewed_at'>

export type TaskUpdate = Partial<TaskInsert>
export type DeckUpdate = Partial<DeckInsert>
export type CardUpdate = Partial<Omit<Card, 'id' | 'deck_id' | 'created_at'>>

export interface DeckWithStats extends Deck {
  card_count: number
  due_today_count: number
}

export interface DailyProgress {
  date: string
  tasks_completed: number
  cards_reviewed: number
}

export interface SM2Result {
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_date: string
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5
```

## src/lib/spaced-repetition.ts (SM-2 Algorithm)

```ts
import type { Card, SM2Result, ReviewQuality } from './types'

const MIN_EASE_FACTOR = 1.3

export function calculateNextReview(
  card: Pick<Card, 'ease_factor' | 'interval_days' | 'repetitions'>,
  quality: ReviewQuality
): SM2Result {
  let { ease_factor, interval_days, repetitions } = card

  if (quality < 3) {
    repetitions = 0
    interval_days = 1
  } else {
    if (repetitions === 0) {
      interval_days = 1
    } else if (repetitions === 1) {
      interval_days = 6
    } else {
      interval_days = Math.round(interval_days * ease_factor)
    }
    repetitions += 1

    ease_factor =
      ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    if (ease_factor < MIN_EASE_FACTOR) {
      ease_factor = MIN_EASE_FACTOR
    }
  }

  const next_review_date = addDays(new Date(), interval_days)
    .toISOString()
    .split('T')[0]

  return {
    ease_factor: roundTo(ease_factor, 2),
    interval_days,
    repetitions,
    next_review_date,
  }
}

export function isDue(card: Pick<Card, 'next_review_date'>): boolean {
  const today = new Date().toISOString().split('T')[0]
  return card.next_review_date <= today
}

export function getDueCards<T extends Pick<Card, 'next_review_date'>>(
  cards: T[]
): T[] {
  return cards.filter(isDue)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
```

## Supabase Client Setup

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

## Auth Setup

```ts
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/tasks') ||
    request.nextUrl.pathname.startsWith('/flashcards') ||
    request.nextUrl.pathname.startsWith('/dashboard')

  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

```ts
// src/lib/auth/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  redirect('/tasks')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  redirect('/tasks')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
```

```ts
// src/hooks/useUser.ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

## Setup Commands
```bash
npx create-next-app@latest study-companion --typescript --tailwind --app --src-dir
cd study-companion
npm install @supabase/supabase-js @supabase/ssr recharts date-fns
```

## .env.local (fill from Supabase Dashboard → Project Settings → API)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Not yet built
- Dashboard components (ProgressChart, StreakCounter)
- Seed data for testing
