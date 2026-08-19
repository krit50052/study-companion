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
