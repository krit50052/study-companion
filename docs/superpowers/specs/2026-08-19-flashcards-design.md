# Phase 3 — Flashcards Design

## Overview

Adds spaced-repetition flashcards to the Study Companion app: deck CRUD, card
CRUD, and a review mode driven by the existing SM-2 implementation in
`src/lib/spaced-repetition.ts`. Follows the same server-component-fetches /
client-component-mutates pattern established by the Task Tracker (Phase 2).

Schema, types (`Deck`, `Card`, `ReviewLog`, `DeckWithStats`, `SM2Result`,
`ReviewQuality`), and the SM-2 algorithm itself already exist per CLAUDE.md —
this phase is UI and server actions only. No schema changes.

## Routes

- `src/app/(dashboard)/flashcards/page.tsx` (server component)
  Fetches all decks for the user, then all cards belonging to those decks in
  one query. Computes `card_count` and `due_today_count` per deck in
  TypeScript (using `isDue`/`getDueCards` from `spaced-repetition.ts`) to
  build `DeckWithStats[]`. Renders `DeckList`.

- `src/app/(dashboard)/flashcards/[deckId]/page.tsx` (server component)
  Fetches the deck (404/redirect if not found or not owned — RLS makes a
  missing row indistinguishable from unauthorized) and its cards. Renders
  `CardList` plus a "Start review" link to the review route. Card count of 0
  is a valid empty state, not an error.

- `src/app/(dashboard)/flashcards/[deckId]/review/page.tsx` (server component)
  Fetches due cards for the deck via `getDueCards`. If empty, renders a
  "Nothing due" message with a link back to the deck page. Otherwise renders
  `ReviewSession` (client) with the due-cards array as its initial queue.

## Components (`src/components/flashcards/`)

- `DeckList` (client) — mirrors `TaskList`: holds `DeckForm` (create) at the
  top, maps decks to `DeckCard`. No filter/sort needed (decks list is small).
- `DeckCard` (client) — name, subject, card_count/due_today_count badges,
  links to `[deckId]`, edit (swaps to `DeckForm` in edit mode) and delete
  buttons.
- `DeckForm` (client) — `useActionState` form for name + subject, mirrors
  `TaskForm`'s create/edit dual-mode pattern.
- `CardList` (client) — mirrors `TaskList` structure: `CardForm` (create) at
  top, maps cards to `CardItem`.
- `CardItem` (client) — front/back preview, ease/interval/next-review debug
  info optional, edit (swaps to `CardForm`) and delete buttons.
- `CardForm` (client) — `useActionState` form for front + back text areas.
- `ReviewSession` (client, stateful) — owns `queue: Card[]` and `currentIndex`
  in local state (seeded from server-fetched due cards, never refetched
  mid-session). Renders `ReviewCard` for `queue[currentIndex]`. On grade,
  calls the `gradeCard` server action, then advances `currentIndex` locally.
  When `currentIndex >= queue.length`, renders the completion screen.
- `ReviewCard` (client, presentational) — props: `card`, `revealed`,
  `onReveal`, `onGrade`. Shows `front`; click/tap (or a "Show answer" button)
  sets `revealed`; once revealed shows `back` plus four grade buttons (Again
  / Hard / Good / Easy) mapped to quality scores 0 / 3 / 4 / 5.

## Server Actions (`src/lib/flashcards/actions.ts`)

All follow the existing `'use server'` + `useActionState`-compatible
`(prevState, formData) => Promise<{error?: string}>` shape used in
`src/lib/tasks/actions.ts`, except `deleteDeck`/`deleteCard`/`gradeCard`
which are plain async functions (no form state needed):

- `createDeck(prevState, formData)` — validates `name` required, inserts
  scoped to `auth.getUser()`, `revalidatePath('/flashcards')`.
- `updateDeck(id, prevState, formData)` — same validation, updates by id,
  `revalidatePath('/flashcards')`.
- `deleteDeck(id)` — deletes by id (cards cascade via FK),
  `revalidatePath('/flashcards')`.
- `createCard(deckId, prevState, formData)` — validates `front`/`back`
  required, inserts with `deck_id`, `revalidatePath(`/flashcards/${deckId}`)`.
- `updateCard(id, deckId, prevState, formData)` — updates front/back,
  revalidates the same `/flashcards/${deckId}` path.
- `deleteCard(id, deckId)` — deletes by id, revalidates the deck path.
- `gradeCard(card: Pick<Card, 'id'|'ease_factor'|'interval_days'|'repetitions'>, deckId: string, quality: ReviewQuality)`
  — calls `calculateNextReview(card, quality)`, updates the `cards` row with
  the result, inserts a `review_logs` row (`card_id`, `user_id` from
  `auth.getUser()`, `quality`), revalidates the deck and flashcards list
  paths. Returns nothing meaningful to the client — `ReviewSession` advances
  its queue optimistically regardless of the action's result, since a failed
  grade write just means the card's next-review date doesn't update (low
  stakes, no error UI needed for v1).

Client passes the card's current SM-2 fields into `gradeCard` directly
(already in the local queue) rather than the action re-fetching the row —
avoids an extra round-trip; acceptable since RLS still scopes the update to
the owning user regardless of what fields the client supplies.

## Data Flow Summary

1. List page: 2 queries (decks, cards-for-those-decks) → JS aggregation →
   `DeckWithStats[]`.
2. Deck page: 2 queries (deck, cards-for-deck) → `CardList`.
3. Review page: 1 query (cards-for-deck), filtered server-side via
   `getDueCards` → `ReviewSession` seeded once.
4. Grading: 1 server action per card (update + insert), client advances
   local queue without refetching — no full-page reload during a session.

## Error Handling

- Form validation errors (missing title/front/back) surface via the
  existing `state.error` pattern, same as `TaskForm`.
- Deck/card not found or not owned: RLS returns no row; `[deckId]` page
  calls `notFound()` (Next.js) rather than rendering an empty deck.
- `gradeCard` failures are swallowed client-side per above — logged to
  console in dev, no user-facing error (matches the low-stakes nature of a
  single review event; revisit if this becomes a real complaint).

## Testing

- `npx tsc --noEmit` and `npm run lint` must pass, as with Phase 2.
- Manual browser walkthrough: create deck → add 2-3 cards → start review →
  reveal → grade each of the four buttons at least once → confirm session
  completion screen → revisit deck page and confirm `next_review_date`
  moved forward on graded cards.

## Out of Scope (this phase)

- Session summary stats (grade breakdown) — deferred, simple completion
  screen only.
- Postgres view/RPC for deck stats — client-side aggregation is sufficient
  at this scale.
- Dashboard charts / streaks — Phase 4.
