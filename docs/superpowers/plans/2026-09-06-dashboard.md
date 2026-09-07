# Phase 4 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 4 progress dashboard: a streak tracker (current + longest, both-required definition) and a 14-day tasks/reviews bar chart.

**Architecture:** A pure `computeStreaks` function (unit-tested with Vitest) sits behind a server-only `getDailyProgress` query in `src/lib/dashboard/queries.ts`. The dashboard page (server component) calls both once and passes plain data down to two presentational components — `StreakCounter` (server-renderable) and `ProgressChart` (client, Recharts). `tasks` gains a `completed_at` column so "tasks completed per day" can be computed accurately; `updateTask`/`createTask` are extended to maintain it.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (`@supabase/ssr`), Tailwind CSS, Recharts (already a dependency). Vitest is added as a new devDependency for this phase — the repo's first test framework.

**Spec:** `docs/superpowers/specs/2026-09-06-dashboard-design.md`

## Global Constraints

- Schema: `tasks.completed_at timestamptz` (nullable) has already been added to `supabase/schema.sql` and `CLAUDE.md` (commit `3650acb`). It has **not** been applied to the live Supabase database yet — the final task's manual walkthrough will fail with a Postgres error ("column tasks.completed_at does not exist") until `alter table tasks add column completed_at timestamptz;` is run by hand in the Supabase SQL editor. This is a one-time manual step, not something any task's code performs.
- "Today" / calendar-date grouping uses the **UTC** calendar date (`timestamp.toISOString().split('T')[0]` / `.slice(0, 10)`), matching the existing convention in `isDue()` (`src/lib/spaced-repetition.ts`). Do not use browser/server-local time for grouping.
- Any UI displaying a plain `'YYYY-MM-DD'` string must format it by direct string manipulation, never `new Date(dateString).toLocaleDateString()` — that mis-parses as UTC midnight and shows the wrong day for negative-UTC-offset users. (This bug was already fixed once in `CardItem.tsx` during Phase 3; do not reintroduce it in `ProgressChart`.)
- The streak/chart data window is bounded to 90 days (`getDailyProgress(90)`), not full account history — a documented, deliberate scope limit.
- Server actions that back a form keep the existing `'use server'` + `(prevState, formData) => Promise<TaskActionState>` shape (see `src/lib/tasks/actions.ts`). Plain mutations are `async (...) => Promise<void>`.
- Tailwind classes match existing conventions from `src/components/tasks/*` and `src/components/flashcards/*` (e.g. `rounded-lg border border-gray-200 bg-white p-4`, indigo-600 primary actions, gray-500 secondary text).
- Chart colors are fixed, pre-validated categorical values — do not substitute other hex values without re-running the dataviz palette validator: `tasks_completed` → `#2a78d6` (blue), `cards_reviewed` → `#eb6834` (orange).
- Vitest is scoped to unit-testing `computeStreaks` only. Do not add tests for server actions or components in this phase — no framework exists yet for rendering/DB-dependent tests, and that's out of scope here.
- Verification per task is `npx tsc --noEmit` and `npm run lint`, plus `npm run test` for the task that adds Vitest. The final task adds a full manual browser walkthrough.

---

### Task 1: `tasks.completed_at` plumbing

**Files:**
- Modify: `src/lib/types.ts` (`Task` interface)
- Modify: `src/lib/tasks/actions.ts` (`createTask`, `updateTask`)

**Interfaces:**
- Produces: `Task.completed_at: string | null` (flows automatically into `TaskInsert`/`TaskUpdate` via their existing `Omit`/`Partial` definitions — no change needed to those two lines).

- [ ] **Step 1: Add `completed_at` to the `Task` interface in `src/lib/types.ts`**

Change:

```ts
export interface Task {
  id: string
  user_id: string
  title: string
  subject: string | null
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  created_at: string
  updated_at: string
}
```

to:

```ts
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
```

- [ ] **Step 2: Stamp `completed_at` in `createTask` (`src/lib/tasks/actions.ts`)**

Change the insert call:

```ts
  const { error } = await supabase.from('tasks').insert({
    user_id: user.id,
    title,
    subject,
    description,
    priority,
    status,
    due_date,
  })
```

to:

```ts
  const { error } = await supabase.from('tasks').insert({
    user_id: user.id,
    title,
    subject,
    description,
    priority,
    status,
    due_date,
    completed_at: status === 'done' ? new Date().toISOString() : null,
  })
```

- [ ] **Step 3: Maintain `completed_at` in `updateTask` (`src/lib/tasks/actions.ts`)**

Change:

```ts
export async function updateTask(
  id: string,
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const { title, subject, description, priority, status, due_date } = parseTaskForm(formData)

  if (!title) {
    return { error: 'Title is required' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({
      title,
      subject,
      description,
      priority,
      status,
      due_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tasks')
  return {}
}
```

to:

```ts
export async function updateTask(
  id: string,
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const { title, subject, description, priority, status, due_date } = parseTaskForm(formData)

  if (!title) {
    return { error: 'Title is required' }
  }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('tasks')
    .select('status, completed_at')
    .eq('id', id)
    .single()

  let completed_at = existing?.completed_at ?? null
  if (status === 'done' && existing?.status !== 'done') {
    completed_at = new Date().toISOString()
  } else if (status !== 'done') {
    completed_at = null
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      title,
      subject,
      description,
      priority,
      status,
      due_date,
      completed_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tasks')
  return {}
}
```

This stamps `completed_at` the moment a task first transitions to `done`, clears it if the task is reopened (`todo`/`doing`), and leaves it untouched on any other edit (including staying `done`).

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/tasks/actions.ts
git commit -m "Add completed_at tracking to tasks"
```

---

### Task 2: Vitest setup + `computeStreaks` (TDD)

**Files:**
- Modify: `package.json` (add `vitest` devDependency, add `test` script)
- Create: `vitest.config.ts`
- Create: `src/lib/dashboard/queries.ts` (this task adds only `computeStreaks`; Task 3 appends `getDailyProgress`)
- Create: `src/lib/dashboard/queries.test.ts`

**Interfaces:**
- Consumes: `DailyProgress` from `@/lib/types` (existing: `{ date: string; tasks_completed: number; cards_reviewed: number }`)
- Produces: `computeStreaks(progress: DailyProgress[]): { current: number; longest: number }`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Add the `test` script to `package.json`**

In the `"scripts"` block, add:

```json
    "test": "vitest run"
```

(alongside the existing `dev`, `build`, `start`, `lint` scripts)

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: Write the failing test file `src/lib/dashboard/queries.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { computeStreaks } from './queries'
import type { DailyProgress } from '@/lib/types'

function day(date: string, tasks_completed: number, cards_reviewed: number): DailyProgress {
  return { date, tasks_completed, cards_reviewed }
}

describe('computeStreaks', () => {
  it('returns zero streaks for an empty array', () => {
    expect(computeStreaks([])).toEqual({ current: 0, longest: 0 })
  })

  it('returns zero streaks when no day is active', () => {
    const progress = [day('2026-09-01', 0, 0), day('2026-09-02', 1, 0), day('2026-09-03', 0, 2)]
    expect(computeStreaks(progress)).toEqual({ current: 0, longest: 0 })
  })

  it('counts a single active day as a streak of 1', () => {
    const progress = [day('2026-09-01', 0, 0), day('2026-09-02', 2, 3)]
    expect(computeStreaks(progress)).toEqual({ current: 1, longest: 1 })
  })

  it('resets the current streak when the most recent active run is broken by an inactive day', () => {
    const progress = [
      day('2026-09-01', 1, 1),
      day('2026-09-02', 1, 1),
      day('2026-09-03', 0, 0),
      day('2026-09-04', 1, 1),
    ]
    expect(computeStreaks(progress)).toEqual({ current: 1, longest: 2 })
  })

  it('does not break the current streak when today has no activity yet', () => {
    const progress = [day('2026-09-01', 1, 1), day('2026-09-02', 1, 1), day('2026-09-03', 0, 0)]
    expect(computeStreaks(progress)).toEqual({ current: 2, longest: 2 })
  })

  it('counts the whole window when every day is active', () => {
    const progress = [day('2026-09-01', 1, 1), day('2026-09-02', 2, 1), day('2026-09-03', 1, 3)]
    expect(computeStreaks(progress)).toEqual({ current: 3, longest: 3 })
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm run test`
Expected: FAIL — `src/lib/dashboard/queries.ts` does not exist yet (module not found).

- [ ] **Step 6: Implement `computeStreaks` in `src/lib/dashboard/queries.ts`**

```ts
import type { DailyProgress } from '@/lib/types'

function isActiveDay(day: DailyProgress): boolean {
  return day.tasks_completed > 0 && day.cards_reviewed > 0
}

export function computeStreaks(progress: DailyProgress[]): { current: number; longest: number } {
  let longest = 0
  let run = 0
  for (const day of progress) {
    if (isActiveDay(day)) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
  }

  let current = 0
  let index = progress.length - 1
  if (index >= 0 && !isActiveDay(progress[index])) {
    index -= 1
  }
  while (index >= 0 && isActiveDay(progress[index])) {
    current += 1
    index -= 1
  }

  return { current, longest }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm run test`
Expected: PASS — all 6 tests green.

- [ ] **Step 8: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/dashboard/queries.ts src/lib/dashboard/queries.test.ts
git commit -m "Add Vitest and computeStreaks with unit tests"
```

---

### Task 3: `getDailyProgress` query

**Files:**
- Modify: `src/lib/dashboard/queries.ts` (append)

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`
- Produces: `getDailyProgress(days: number): Promise<DailyProgress[]>` — dense array, one entry per calendar day from `today - (days - 1)` to `today` inclusive, oldest first.

- [ ] **Step 1: Add `getDailyProgress` to `src/lib/dashboard/queries.ts`**

Update the top of the file to add this import alongside the existing one:

```ts
import { createClient } from '@/lib/supabase/server'
```

Add at the end of the file:

```ts

function toDateKey(iso: string): string {
  return iso.slice(0, 10)
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export async function getDailyProgress(days: number): Promise<DailyProgress[]> {
  const supabase = await createClient()

  const todayKey = new Date().toISOString().slice(0, 10)
  const startKey = addDays(todayKey, -(days - 1))
  const startOfRange = `${startKey}T00:00:00.000Z`

  const [{ data: doneTasks }, { data: reviewLogs }] = await Promise.all([
    supabase
      .from('tasks')
      .select('completed_at')
      .eq('status', 'done')
      .gte('completed_at', startOfRange),
    supabase.from('review_logs').select('reviewed_at').gte('reviewed_at', startOfRange),
  ])

  const tasksByDate = new Map<string, number>()
  for (const task of doneTasks ?? []) {
    if (!task.completed_at) continue
    const dateKey = toDateKey(task.completed_at)
    tasksByDate.set(dateKey, (tasksByDate.get(dateKey) ?? 0) + 1)
  }

  const reviewsByDate = new Map<string, number>()
  for (const log of reviewLogs ?? []) {
    const dateKey = toDateKey(log.reviewed_at)
    reviewsByDate.set(dateKey, (reviewsByDate.get(dateKey) ?? 0) + 1)
  }

  const progress: DailyProgress[] = []
  let cursor = startKey
  while (cursor <= todayKey) {
    progress.push({
      date: cursor,
      tasks_completed: tasksByDate.get(cursor) ?? 0,
      cards_reviewed: reviewsByDate.get(cursor) ?? 0,
    })
    cursor = addDays(cursor, 1)
  }

  return progress
}
```

Relies on Supabase RLS (`auth.uid() = user_id` on `tasks`; the `review_logs` select-own policy) to scope both queries to the signed-in user, matching the existing convention in `src/app/(dashboard)/tasks/page.tsx` (no explicit `.eq('user_id', ...)` needed).

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dashboard/queries.ts
git commit -m "Add getDailyProgress query"
```

---

### Task 4: Dashboard components

**Files:**
- Create: `src/components/dashboard/StreakCounter.tsx`
- Create: `src/components/dashboard/ProgressChart.tsx`

**Interfaces:**
- Consumes: `DailyProgress` from `@/lib/types`
- Produces:
  - `StreakCounter({ current: number, longest: number })`
  - `ProgressChart({ data: DailyProgress[] })`

- [ ] **Step 1: Write `src/components/dashboard/StreakCounter.tsx`**

```tsx
export function StreakCounter({ current, longest }: { current: number; longest: number }) {
  return (
    <div className="flex gap-8 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <p className="text-sm text-gray-500">Current streak</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">
          {current} day{current === 1 ? '' : 's'}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Longest streak</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">
          {longest} day{longest === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/dashboard/ProgressChart.tsx`**

```tsx
'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyProgress } from '@/lib/types'

const TASKS_COLOR = '#2a78d6'
const CARDS_COLOR = '#eb6834'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function formatDateLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-')
  return `${MONTH_NAMES[Number(month) - 1]} ${Number(day)}`
}

export function ProgressChart({ data }: { data: DailyProgress[] }) {
  const chartData = data.map((day) => ({ ...day, label: formatDateLabel(day.date) }))

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#898781', fontSize: 12 }}
            axisLine={{ stroke: '#c3c2b7' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#898781', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: '#f9f9f7' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="tasks_completed" name="Tasks completed" fill={TASKS_COLOR} radius={[4, 4, 0, 0]} />
          <Bar dataKey="cards_reviewed" name="Cards reviewed" fill={CARDS_COLOR} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

`formatDateLabel` parses the `'YYYY-MM-DD'` string directly (split on `-`) rather than `new Date(dateKey).toLocaleDateString()`, per the Global Constraints timezone rule.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/StreakCounter.tsx src/components/dashboard/ProgressChart.tsx
git commit -m "Add StreakCounter and ProgressChart components"
```

---

### Task 5: Dashboard page + manual walkthrough

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx` (replace the Phase-3 placeholder)

**Interfaces:**
- Consumes: `getDailyProgress`, `computeStreaks` from Task 2/3 (`@/lib/dashboard/queries`); `StreakCounter`, `ProgressChart` from Task 4

- [ ] **Step 1: Replace `src/app/(dashboard)/dashboard/page.tsx`**

```tsx
import { getDailyProgress, computeStreaks } from '@/lib/dashboard/queries'
import { StreakCounter } from '@/components/dashboard/StreakCounter'
import { ProgressChart } from '@/components/dashboard/ProgressChart'

const STREAK_WINDOW_DAYS = 90
const CHART_WINDOW_DAYS = 14

export default async function DashboardPage() {
  const progress = await getDailyProgress(STREAK_WINDOW_DAYS)
  const { current, longest } = computeStreaks(progress)
  const chartData = progress.slice(-CHART_WINDOW_DAYS)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <div className="mt-6 space-y-6">
        <StreakCounter current={current} longest={longest} />
        <ProgressChart data={chartData} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "Wire up dashboard page with streaks and progress chart"
```

- [ ] **Step 4: Apply the pending schema change to the live database**

Before the walkthrough below will work, run this once in the Supabase Dashboard → SQL Editor against your project:

```sql
alter table tasks add column completed_at timestamptz;
```

- [ ] **Step 5: Manual browser walkthrough**

Run: `npm run dev`, then in a browser (logged in as a test user):

1. Go to `/dashboard`. With no activity yet, confirm it shows "Current streak: 0 days", "Longest streak: 0 days", and a 14-bar chart that's flat at zero (no errors, no crash).
2. Go to `/tasks`, create a task, then edit it and change its status to "Done". Go to `/dashboard` and confirm today's bar now shows 1 for "Tasks completed" (hover the bar to see the tooltip breakdown).
3. Edit that same task back to "To do", then to "Done" again. Confirm `tasks_completed` for today is still 1, not 2 (re-completing doesn't double-count — `completed_at` only stamps on the `!== 'done' → 'done'` transition).
4. Go to `/flashcards`, review a due card (grade it any quality). Go to `/dashboard` and confirm today's bar now also shows 1 for "Cards reviewed".
5. Confirm the streak counter now shows "Current streak: 1 day" (both a task completion and a card review happened today) and "Longest streak: 1 day".
6. In the Supabase SQL editor, backdate yesterday's activity for the same user to simulate a multi-day streak — e.g.:
   ```sql
   update tasks set completed_at = now() - interval '1 day' where id = '<a done task id>';
   insert into review_logs (card_id, user_id, quality, reviewed_at) values ('<a card id>', '<your user id>', 4, now() - interval '1 day');
   ```
   Reload `/dashboard` and confirm "Current streak" is now 2 days.
7. Confirm no console errors appear at any point, and the chart legend/tooltip render correctly.

Expected: all steps behave as described.

---
