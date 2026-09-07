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
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">{state.error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <textarea
          name="front"
          placeholder="Front"
          required
          defaultValue={card?.front}
          rows={2}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <textarea
          name="back"
          placeholder="Back"
          required
          defaultValue={card?.back}
          rows={2}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="flex justify-end gap-2">
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
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
