# Phase 3 Flashcards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build deck CRUD, card CRUD, and an SM-2-driven review session for the Flashcards feature.

**Architecture:** Server components fetch data and pass it to client components that own form/interaction state, mirroring the Task Tracker (Phase 2). Server actions in `src/lib/flashcards/actions.ts` handle all writes and call `revalidatePath`. The review session fetches due cards once server-side, then manages grading client-side without refetching mid-session.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (`@supabase/ssr`), Tailwind CSS. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-19-flashcards-design.md`

## Global Constraints

- No schema changes — `decks`, `cards`, `review_logs` tables and their RLS policies already exist exactly as documented in CLAUDE.md.
- No new dependencies — build only with what's already in `package.json`.
- Server actions that back a form follow the existing `'use server'` +
  `(prevState: FlashcardActionState, formData: FormData) => Promise<FlashcardActionState>`
  shape (see `src/lib/tasks/actions.ts` for the established pattern). Plain
  delete/grade actions are `async (...) => Promise<void>`.
- Grade button → SM-2 quality mapping is fixed: Again=0, Hard=3, Good=4, Easy=5.
- Tailwind classes match existing conventions from `src/components/tasks/*`
  (e.g. `rounded-lg border border-gray-200 bg-white p-4`, indigo-600 primary
  buttons, gray-500 secondary text).
- This repo has no unit test framework (`package.json` has no jest/vitest).
  Per the spec's Testing section, verification per task is
  `npx tsc --noEmit` and `npm run lint`; the final task adds a full manual
  browser walkthrough. Do not add a test framework — out of scope.
- Client components importing server actions must only import the specific
  actions they call (existing convention, keeps server/client boundary
  explicit).

---

### Task 1: Deck server actions

**Files:**
- Create: `src/lib/flashcards/actions.ts`

**Interfaces:**
- Produces:
  - `interface FlashcardActionState { error?: string }`
  - `createDeck(prevState: FlashcardActionState, formData: FormData): Promise<FlashcardActionState>` — reads `name`, `subject` from formData
  - `updateDeck(id: string, prevState: FlashcardActionState, formData: FormData): Promise<FlashcardActionState>`
  - `deleteDeck(id: string): Promise<void>`

- [ ] **Step 1: Write `src/lib/flashcards/actions.ts` with the deck actions**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface FlashcardActionState {
  error?: string
}

function parseDeckForm(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const subject = (formData.get('subject') as string)?.trim() || null
  return { name, subject }
}

export async function createDeck(
  _prevState: FlashcardActionState,
  formData: FormData
): Promise<FlashcardActionState> {
  const { name, subject } = parseDeckForm(formData)

  if (!name) {
    return { error: 'Name is required' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not signed in' }
  }

  const { error } = await supabase.from('decks').insert({
    user_id: user.id,
    name,
    subject,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/flashcards')
  return {}
}

export async function updateDeck(
  id: string,
  _prevState: FlashcardActionState,
  formData: FormData
): Promise<FlashcardActionState> {
  const { name, subject } = parseDeckForm(formData)

  if (!name) {
    return { error: 'Name is required' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('decks')
    .update({ name, subject })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/flashcards')
  return {}
}

export async function deleteDeck(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('decks').delete().eq('id', id)
  revalidatePath('/flashcards')
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/flashcards/actions.ts
git commit -m "Add deck server actions (create/update/delete)"
```

---

### Task 2: Deck UI components and deck list page

**Files:**
- Create: `src/components/flashcards/DeckForm.tsx`
- Create: `src/components/flashcards/DeckCard.tsx`
- Create: `src/components/flashcards/DeckList.tsx`
- Modify: `src/app/(dashboard)/flashcards/page.tsx` (replace the Phase-3 placeholder)

**Interfaces:**
- Consumes: `createDeck`, `updateDeck`, `deleteDeck`, `FlashcardActionState` from Task 1 (`@/lib/flashcards/actions`); `Deck`, `DeckWithStats` from `@/lib/types`; `getDueCards` from `@/lib/spaced-repetition` (signature: `getDueCards<T extends Pick<Card, 'next_review_date'>>(cards: T[]): T[]`)
- Produces:
  - `DeckForm({ mode: 'create' | 'edit', deck?: Deck, onDone?: () => void })`
  - `DeckCard({ deck: DeckWithStats })`
  - `DeckList({ decks: DeckWithStats[] })`

- [ ] **Step 1: Write `src/components/flashcards/DeckForm.tsx`**

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { createDeck, updateDeck, type FlashcardActionState } from '@/lib/flashcards/actions'
import type { Deck } from '@/lib/types'

const initialState: FlashcardActionState = {}

interface DeckFormProps {
  mode: 'create' | 'edit'
  deck?: Deck
  onDone?: () => void
}

export function DeckForm({ mode, deck, onDone }: DeckFormProps) {
  const action =
    mode === 'edit' && deck
      ? (updateDeck.bind(null, deck.id) as (
          state: FlashcardActionState,
          formData: FormData
        ) => Promise<FlashcardActionState>)
      : createDeck
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      if (mode === 'create') {
        formRef.current?.reset()
      }
      onDone?.()
    }
    wasPending.current = isPending
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          placeholder="Deck name"
          required
          defaultValue={deck?.name}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:col-span-2"
        />
        <input
          name="subject"
          placeholder="Subject"
          defaultValue={deck?.subject ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:col-span-2"
        />
      </div>
      <div className="flex justify-end gap-2">
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-800"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {mode === 'create' ? 'Add deck' : 'Save'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Write `src/components/flashcards/DeckCard.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { deleteDeck } from '@/lib/flashcards/actions'
import { DeckForm } from './DeckForm'
import type { DeckWithStats } from '@/lib/types'

export function DeckCard({ deck }: { deck: DeckWithStats }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (isEditing) {
    return <DeckForm mode="edit" deck={deck} onDone={() => setIsEditing(false)} />
  }

  async function handleDelete() {
    setIsDeleting(true)
    await deleteDeck(deck.id)
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/flashcards/${deck.id}`}
            className="font-medium text-gray-900 hover:text-indigo-600"
          >
            {deck.name}
          </Link>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
            {deck.card_count} card{deck.card_count === 1 ? '' : 's'}
          </span>
          {deck.due_today_count > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {deck.due_today_count} due
            </span>
          )}
        </div>
        {deck.subject && <p className="mt-1 text-sm text-gray-500">{deck.subject}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {deck.due_today_count > 0 && (
          <Link
            href={`/flashcards/${deck.id}/review`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Review
          </Link>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm font-medium text-gray-500 hover:text-indigo-600"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-sm font-medium text-gray-500 hover:text-red-600 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/flashcards/DeckList.tsx`**

```tsx
'use client'

import { DeckForm } from './DeckForm'
import { DeckCard } from './DeckCard'
import type { DeckWithStats } from '@/lib/types'

export function DeckList({ decks }: { decks: DeckWithStats[] }) {
  return (
    <div className="space-y-6">
      <DeckForm mode="create" />

      {decks.length === 0 ? (
        <p className="text-sm text-gray-500">No decks yet. Create one above.</p>
      ) : (
        <div className="space-y-3">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Replace `src/app/(dashboard)/flashcards/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { DeckList } from '@/components/flashcards/DeckList'
import { getDueCards } from '@/lib/spaced-repetition'
import type { Card, DeckWithStats } from '@/lib/types'

export default async function FlashcardsPage() {
  const supabase = await createClient()
  const { data: decks } = await supabase
    .from('decks')
    .select('*')
    .order('created_at', { ascending: false })

  const deckIds = (decks ?? []).map((deck) => deck.id)

  const { data: cards } = deckIds.length
    ? await supabase.from('cards').select('*').in('deck_id', deckIds)
    : { data: [] as Card[] }

  const decksWithStats: DeckWithStats[] = (decks ?? []).map((deck) => {
    const deckCards = (cards ?? []).filter((card) => card.deck_id === deck.id)
    return {
      ...deck,
      card_count: deckCards.length,
      due_today_count: getDueCards(deckCards).length,
    }
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Flashcards</h1>
      <div className="mt-6">
        <DeckList decks={decksWithStats} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/flashcards/DeckForm.tsx src/components/flashcards/DeckCard.tsx src/components/flashcards/DeckList.tsx "src/app/(dashboard)/flashcards/page.tsx"
git commit -m "Add deck list page with create/edit/delete UI"
```

---

### Task 3: Card server actions

**Files:**
- Modify: `src/lib/flashcards/actions.ts` (append)

**Interfaces:**
- Produces:
  - `createCard(deckId: string, prevState: FlashcardActionState, formData: FormData): Promise<FlashcardActionState>` — reads `front`, `back` from formData
  - `updateCard(id: string, deckId: string, prevState: FlashcardActionState, formData: FormData): Promise<FlashcardActionState>`
  - `deleteCard(id: string, deckId: string): Promise<void>`

- [ ] **Step 1: Append card actions to `src/lib/flashcards/actions.ts`**

Add after `deleteDeck`:

```ts

function parseCardForm(formData: FormData) {
  const front = (formData.get('front') as string)?.trim()
  const back = (formData.get('back') as string)?.trim()
  return { front, back }
}

export async function createCard(
  deckId: string,
  _prevState: FlashcardActionState,
  formData: FormData
): Promise<FlashcardActionState> {
  const { front, back } = parseCardForm(formData)

  if (!front || !back) {
    return { error: 'Front and back are required' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('cards').insert({
    deck_id: deckId,
    front,
    back,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/flashcards/${deckId}`)
  return {}
}

export async function updateCard(
  id: string,
  deckId: string,
  _prevState: FlashcardActionState,
  formData: FormData
): Promise<FlashcardActionState> {
  const { front, back } = parseCardForm(formData)

  if (!front || !back) {
    return { error: 'Front and back are required' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('cards')
    .update({ front, back })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/flashcards/${deckId}`)
  return {}
}

export async function deleteCard(id: string, deckId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('cards').delete().eq('id', id)
  revalidatePath(`/flashcards/${deckId}`)
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/flashcards/actions.ts
git commit -m "Add card server actions (create/update/delete)"
```

---

### Task 4: Card UI components and deck detail page

**Files:**
- Create: `src/components/flashcards/CardForm.tsx`
- Create: `src/components/flashcards/CardItem.tsx`
- Create: `src/components/flashcards/CardList.tsx`
- Create: `src/app/(dashboard)/flashcards/[deckId]/page.tsx`

**Interfaces:**
- Consumes: `createCard`, `updateCard`, `deleteCard`, `FlashcardActionState` from Task 3; `Card` from `@/lib/types`
- Produces:
  - `CardForm({ mode: 'create' | 'edit', deckId: string, card?: Card, onDone?: () => void })`
  - `CardItem({ card: Card, deckId: string })`
  - `CardList({ cards: Card[], deckId: string })`

- [ ] **Step 1: Write `src/components/flashcards/CardForm.tsx`**

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { createCard, updateCard, type FlashcardActionState } from '@/lib/flashcards/actions'
import type { Card } from '@/lib/types'

const initialState: FlashcardActionState = {}

interface CardFormProps {
  mode: 'create' | 'edit'
  deckId: string
  card?: Card
  onDone?: () => void
}

export function CardForm({ mode, deckId, card, onDone }: CardFormProps) {
  const action =
    mode === 'edit' && card
      ? (updateCard.bind(null, card.id, deckId) as (
          state: FlashcardActionState,
          formData: FormData
        ) => Promise<FlashcardActionState>)
      : (createCard.bind(null, deckId) as (
          state: FlashcardActionState,
          formData: FormData
        ) => Promise<FlashcardActionState>)
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      if (mode === 'create') {
        formRef.current?.reset()
      }
      onDone?.()
    }
    wasPending.current = isPending
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <textarea
          name="front"
          placeholder="Front"
          required
          defaultValue={card?.front}
          rows={2}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <textarea
          name="back"
          placeholder="Back"
          required
          defaultValue={card?.back}
          rows={2}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="flex justify-end gap-2">
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-800"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {mode === 'create' ? 'Add card' : 'Save'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Write `src/components/flashcards/CardItem.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { deleteCard } from '@/lib/flashcards/actions'
import { CardForm } from './CardForm'
import type { Card } from '@/lib/types'

export function CardItem({ card, deckId }: { card: Card; deckId: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (isEditing) {
    return (
      <CardForm mode="edit" deckId={deckId} card={card} onDone={() => setIsEditing(false)} />
    )
  }

  async function handleDelete() {
    setIsDeleting(true)
    await deleteCard(card.id, deckId)
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{card.front}</p>
        <p className="mt-1 text-sm text-gray-600">{card.back}</p>
        <p className="mt-1 text-xs text-gray-400">
          Next review {new Date(card.next_review_date).toLocaleDateString()}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm font-medium text-gray-500 hover:text-indigo-600"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-sm font-medium text-gray-500 hover:text-red-600 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/flashcards/CardList.tsx`**

```tsx
'use client'

import { CardForm } from './CardForm'
import { CardItem } from './CardItem'
import type { Card } from '@/lib/types'

export function CardList({ cards, deckId }: { cards: Card[]; deckId: string }) {
  return (
    <div className="space-y-6">
      <CardForm mode="create" deckId={deckId} />

      {cards.length === 0 ? (
        <p className="text-sm text-gray-500">No cards yet. Add one above.</p>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <CardItem key={card.id} card={card} deckId={deckId} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write `src/app/(dashboard)/flashcards/[deckId]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CardList } from '@/components/flashcards/CardList'

export default async function DeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  const { deckId } = await params
  const supabase = await createClient()

  const { data: deck } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .single()

  if (!deck) {
    notFound()
  }

  const { data: cards } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{deck.name}</h1>
          {deck.subject && <p className="mt-1 text-sm text-gray-500">{deck.subject}</p>}
        </div>
        <Link
          href={`/flashcards/${deckId}/review`}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Start review
        </Link>
      </div>
      <div className="mt-6">
        <CardList cards={cards ?? []} deckId={deckId} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/flashcards/CardForm.tsx src/components/flashcards/CardItem.tsx src/components/flashcards/CardList.tsx "src/app/(dashboard)/flashcards/[deckId]/page.tsx"
git commit -m "Add deck detail page with card create/edit/delete UI"
```

---

### Task 5: Grade server action

**Files:**
- Modify: `src/lib/flashcards/actions.ts` (append)

**Interfaces:**
- Consumes: `calculateNextReview` from `@/lib/spaced-repetition` (signature: `calculateNextReview(card: Pick<Card, 'ease_factor' | 'interval_days' | 'repetitions'>, quality: ReviewQuality): SM2Result`)
- Produces:
  - `gradeCard(card: Pick<Card, 'id' | 'ease_factor' | 'interval_days' | 'repetitions'>, deckId: string, quality: ReviewQuality): Promise<void>`

- [ ] **Step 1: Add imports and the `gradeCard` action to `src/lib/flashcards/actions.ts`**

Update the top of the file to add these imports alongside the existing ones:

```ts
import { calculateNextReview } from '@/lib/spaced-repetition'
import type { Card, ReviewQuality } from '@/lib/types'
```

Add at the end of the file:

```ts

export async function gradeCard(
  card: Pick<Card, 'id' | 'ease_factor' | 'interval_days' | 'repetitions'>,
  deckId: string,
  quality: ReviewQuality
): Promise<void> {
  const result = calculateNextReview(card, quality)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  await supabase
    .from('cards')
    .update({
      ease_factor: result.ease_factor,
      interval_days: result.interval_days,
      repetitions: result.repetitions,
      next_review_date: result.next_review_date,
    })
    .eq('id', card.id)

  await supabase.from('review_logs').insert({
    card_id: card.id,
    user_id: user.id,
    quality,
  })

  revalidatePath(`/flashcards/${deckId}`)
  revalidatePath('/flashcards')
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/flashcards/actions.ts
git commit -m "Add gradeCard server action"
```

---

### Task 6: Review session UI and review page

**Files:**
- Create: `src/components/flashcards/ReviewCard.tsx`
- Create: `src/components/flashcards/ReviewSession.tsx`
- Create: `src/app/(dashboard)/flashcards/[deckId]/review/page.tsx`

**Interfaces:**
- Consumes: `gradeCard` from Task 5 (`@/lib/flashcards/actions`); `getDueCards` from `@/lib/spaced-repetition`; `Card`, `ReviewQuality` from `@/lib/types`
- Produces:
  - `ReviewCard({ card: Card, revealed: boolean, onReveal: () => void, onGrade: (quality: ReviewQuality) => void })`
  - `ReviewSession({ cards: Card[], deckId: string })`

- [ ] **Step 1: Write `src/components/flashcards/ReviewCard.tsx`**

```tsx
'use client'

import type { Card, ReviewQuality } from '@/lib/types'

const GRADE_BUTTONS: { label: string; quality: ReviewQuality; className: string }[] = [
  { label: 'Again', quality: 0, className: 'bg-red-600 hover:bg-red-500' },
  { label: 'Hard', quality: 3, className: 'bg-amber-600 hover:bg-amber-500' },
  { label: 'Good', quality: 4, className: 'bg-indigo-600 hover:bg-indigo-500' },
  { label: 'Easy', quality: 5, className: 'bg-emerald-600 hover:bg-emerald-500' },
]

interface ReviewCardProps {
  card: Card
  revealed: boolean
  onReveal: () => void
  onGrade: (quality: ReviewQuality) => void
}

export function ReviewCard({ card, revealed, onReveal, onGrade }: ReviewCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <p className="text-lg font-medium text-gray-900">{card.front}</p>

      {revealed ? (
        <>
          <hr className="my-6 border-gray-200" />
          <p className="text-lg text-gray-700">{card.back}</p>
          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADE_BUTTONS.map((button) => (
              <button
                key={button.label}
                onClick={() => onGrade(button.quality)}
                className={`rounded-md px-3 py-2 text-sm font-medium text-white ${button.className}`}
              >
                {button.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <button
          onClick={onReveal}
          className="mt-8 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Show answer
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/flashcards/ReviewSession.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { gradeCard } from '@/lib/flashcards/actions'
import { ReviewCard } from './ReviewCard'
import type { Card, ReviewQuality } from '@/lib/types'

export function ReviewSession({ cards, deckId }: { cards: Card[]; deckId: string }) {
  const [queue] = useState(cards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  if (currentIndex >= queue.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-lg font-medium text-gray-900">All done for now.</p>
        <Link
          href={`/flashcards/${deckId}`}
          className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          Back to deck
        </Link>
      </div>
    )
  }

  const currentCard = queue[currentIndex]

  function handleGrade(quality: ReviewQuality) {
    void gradeCard(currentCard, deckId, quality)
    setRevealed(false)
    setCurrentIndex((index) => index + 1)
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Card {currentIndex + 1} of {queue.length}
      </p>
      <ReviewCard
        card={currentCard}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onGrade={handleGrade}
      />
    </div>
  )
}
```

- [ ] **Step 3: Write `src/app/(dashboard)/flashcards/[deckId]/review/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDueCards } from '@/lib/spaced-repetition'
import { ReviewSession } from '@/components/flashcards/ReviewSession'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  const { deckId } = await params
  const supabase = await createClient()

  const { data: deck } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .single()

  if (!deck) {
    notFound()
  }

  const { data: cards } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)

  const dueCards = getDueCards(cards ?? [])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Reviewing {deck.name}</h1>
      <div className="mt-6">
        {dueCards.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-lg font-medium text-gray-900">Nothing due right now.</p>
            <Link
              href={`/flashcards/${deckId}`}
              className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Back to deck
            </Link>
          </div>
        ) : (
          <ReviewSession cards={dueCards} deckId={deckId} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/flashcards/ReviewCard.tsx src/components/flashcards/ReviewSession.tsx "src/app/(dashboard)/flashcards/[deckId]/review/page.tsx"
git commit -m "Add review session UI with SM-2 grading"
```

- [ ] **Step 6: Manual browser walkthrough**

Run: `npm run dev`, then in a browser (logged in as a test user):

1. Go to `/flashcards`, create a deck (e.g. name "Spanish", subject "Vocab").
2. Click into the deck, add 2-3 cards with distinct front/back text.
3. Go back to `/flashcards` and confirm the deck shows the correct card count and a "due" badge (new cards default to `next_review_date = current_date`, so they should be due immediately).
4. Click "Review" (or "Start review" from the deck page).
5. For each card: click "Show answer", confirm the back text appears, click each of Again/Hard/Good/Easy across the cards.
6. Confirm the session ends with "All done for now." and a link back to the deck.
7. Return to the deck page and confirm each card's "Next review" date moved forward (Again → tomorrow; Hard/Good/Easy → tomorrow or later depending on ease).
8. Edit a card and a deck; delete a card and a deck; confirm the UI updates correctly in each case.

Expected: all steps behave as described, no console errors.

---
