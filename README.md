# Study Companion

A web app for students that combines a task/deadline tracker, spaced-repetition flashcards, and a progress dashboard — built with Next.js, TypeScript, and Supabase.

**Live demo:** [study-companion-bice.vercel.app](https://study-companion-bice.vercel.app)

## Features

- **Task tracker** — create, edit, and filter tasks by priority, status, and due date
- **Spaced-repetition flashcards** — decks and cards reviewed using the SM-2 algorithm, the same scheduling approach behind apps like Anki
- **Progress dashboard** — daily activity chart and current/longest streak counters
- **Dark mode** — manual toggle, persisted across sessions
- **Responsive layout** — usable from a phone up to desktop
- **Auth** — email/password accounts with row-level security, so each user only ever sees their own data

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend/DB/Auth:** Supabase (Postgres, Auth, Row Level Security)
- **Charts:** Recharts
- **Dates:** date-fns
- **Testing:** Vitest

## Getting Started

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/krit50052/study-companion.git
   cd study-companion
   npm install
   ```
2. Create a [Supabase](https://supabase.com) project, then run `supabase/schema.sql` in its SQL Editor to create the tables and Row Level Security policies.
3. Copy your Supabase project's URL and anon key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```
   (Find these under Project Settings → API in the Supabase dashboard.)
4. Start the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) and sign up for an account.

## Seeding Test Data

To populate an account with sample tasks, decks, cards, and a review history (so the dashboard isn't empty), add that account's credentials to `.env.local`:

```
SEED_USER_EMAIL=
SEED_USER_PASSWORD=
```

Then run:

```bash
npm run seed
```

This resets and reseeds that user's data — safe to rerun. See `scripts/seed.ts`.

## Running Tests

```bash
npm run test
```

Unit tests cover pure logic only (SM-2 scheduling, streak calculation, chart color selection) — see `src/lib/**/*.test.ts`.

## Project Structure

```
src/
├── app/          # Next.js App Router pages (auth, tasks, flashcards, dashboard)
├── components/   # UI components, grouped by feature
├── hooks/        # Client-side React hooks
├── lib/          # Supabase clients, server actions, and pure business logic
└── proxy.ts      # route protection (redirects unauthenticated users)
scripts/
└── seed.ts       # test data seeding script
supabase/
└── schema.sql    # database schema + RLS policies
```

## License

MIT — see [LICENSE](./LICENSE).
