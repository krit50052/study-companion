# Phase 4 — Progress Dashboard Design

## Overview

Adds a progress dashboard to the Study Companion app: a streak tracker and a
14-day activity chart, built on top of existing `tasks` and `review_logs`
data. Follows the same server-component-fetches / client-component-renders
pattern established by Phases 2 and 3. One schema change is required:
`tasks` gains a `completed_at` timestamp so "tasks completed per day" can be
computed accurately (the existing `updated_at` column changes on any edit,
not just completion, so it can't be used as a proxy).

## Schema Change

```sql
alter table tasks add column completed_at timestamptz;
```

- Nullable. `null` means the task has never been completed, or was completed
  and then reopened.
- Set by `updateTask` / `createTask` in `src/lib/tasks/actions.ts` (see
  below) — not by a trigger, to keep the write path visible in application
  code.
- `supabase/schema.sql` and `CLAUDE.md`'s embedded schema block are updated
  to include this column in the `create table tasks` statement, so a fresh
  setup already has it. Since this project has no migrations mechanism (a
  single flat `schema.sql`, applied by hand), the user runs the `alter
  table` statement above directly against their existing Supabase database
  as part of this phase's rollout — it is not executed by any code in this
  repo.

### `updateTask` change

Before writing the update, fetch the task's current `status` and
`completed_at`. Compute the new `completed_at`:

- If new `status === 'done'` and current `status !== 'done'` →
  `completed_at = now()`.
- If new `status !== 'done'` → `completed_at = null`.
- Otherwise (status unchanged, or already `done` and staying `done`) →
  leave `completed_at` as its current value.

### `createTask` change

If the form's `status` is `'done'` at creation time, set
`completed_at = now()`; otherwise `null`. (Covers the edge case of a task
logged retroactively as already done.)

## Data Layer (`src/lib/dashboard/queries.ts`)

- `getDailyProgress(days: number): Promise<DailyProgress[]>` — server-only
  function (calls `createClient()` from `lib/supabase/server`). Runs two
  queries scoped to the current user and a `[today - days, today]` date
  window:
  - `tasks` where `status = 'done'` and `completed_at` in range, selecting
    `completed_at`.
  - `review_logs` where `reviewed_at` in range, selecting `reviewed_at`.

  Both result sets are grouped by calendar date in TypeScript (not in SQL)
  and merged into a dense `DailyProgress[]` covering every day in the
  window — including zero-activity days — ordered oldest to newest. Reuses
  the existing `DailyProgress` type from `src/lib/types.ts` unchanged.

  "Calendar date" here means the UTC calendar date
  (`timestamp.toISOString().split('T')[0]`), matching the definition of
  "today" already used by `isDue()` in `spaced-repetition.ts`. A server
  component has no access to the visitor's browser timezone, so rather than
  invent a second, inconsistent notion of "today" (server-local time), this
  reuses the app's existing one. This is a distinct concern from the
  timezone bug fixed in Phase 3 (`CardItem.tsx`): that bug was a bare
  `date`-typed string being mis-parsed as UTC on *display*; this is a
  deliberate, consistent choice of UTC as the boundary for *grouping*
  `timestamptz` values.

- `computeStreaks(progress: DailyProgress[]): { current: number; longest: number }` —
  pure function, no I/O, in the same file. A day is "active" only when
  `tasks_completed > 0 AND cards_reviewed > 0` (both required, per approved
  design).
  - `longest`: the length of the longest run of consecutive active days
    anywhere in `progress`.
  - `current`: walk `progress` from the last entry backward. If the last day
    (today) is active, count it and keep walking backward through
    consecutive active days. If the last day (today) is *not* active, skip
    it (today not having activity yet doesn't break an existing streak) and
    start the backward walk from the day before. Stop at the first inactive
    day encountered (after the optional today-skip) or the start of the
    array.
  - Both are computed over whatever window `progress` covers — the caller
    (the dashboard page) is responsible for choosing that window.

### Window bound

The dashboard page calls `getDailyProgress(90)` — a 90-day window. This
bounds both queries and the streak computation to a fixed, small amount of
data regardless of how long the user has had an account, which is
sufficient for a portfolio-scale app. It is a real limitation (a streak or
best-streak older than 90 days won't be reflected) called out here
explicitly rather than left implicit.

## Components (`src/components/dashboard/`)

- `StreakCounter` (server-renderable, presentational — no client state
  needed) — props: `current: number`, `longest: number`. Displays both as
  simple stat text (e.g. "🔥 Current streak: 5 days" / "Best: 12 days").
- `ProgressChart` (client component — Recharts requires a browser
  environment) — props: `data: DailyProgress[]`. Renders a Recharts
  `BarChart` with grouped bars for `tasks_completed` and `cards_reviewed`
  per day, `date` on the X axis (formatted as e.g. "Sep 3", using the same
  direct-string-formatting discipline as `CardItem.tsx` — `date` here is a
  `'YYYY-MM-DD'` string and must not be run through `new Date(dateString)`,
  for the same reason documented there).

## Page (`src/app/(dashboard)/dashboard/page.tsx`)

Server component. Replaces the current placeholder body:

1. Calls `getDailyProgress(90)` once.
2. Passes the full 90-day array to `computeStreaks`, renders `StreakCounter`
   with the result.
3. Slices the last 14 entries for `ProgressChart`.

No client-side data fetching, no server actions needed for this phase (the
dashboard is read-only).

## Error Handling

- Not signed in: unreachable in practice (middleware redirects
  `/dashboard` to `/login`), so no explicit handling beyond what
  `createClient()` / RLS already provide.
- No activity at all (new user): `getDailyProgress` still returns a dense
  90-entry array of zeros; `computeStreaks` returns `{ current: 0, longest: 0 }`;
  `ProgressChart` renders an all-zero chart rather than a special empty
  state — simplest option, and a flat chart is itself informative.

## Testing

- Unit tests for `computeStreaks` (pure function, the only real logic added
  this phase): empty array, all-zero window, single active day, streak
  broken by one inactive day, today inactive but yesterday continues a
  streak, entire window active (current === longest === window length).
- Manual pass through the browser: create tasks and mark done across
  different days (or adjust `completed_at` directly in Supabase for testing
  multi-day streaks), review some flashcards, confirm the chart and streak
  numbers match expectations.
