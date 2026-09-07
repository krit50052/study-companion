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
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/flashcards/${deck.id}`}
            className="font-medium text-gray-900 hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-400"
          >
            {deck.name}
          </Link>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {deck.card_count} card{deck.card_count === 1 ? '' : 's'}
          </span>
          {deck.due_today_count > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              {deck.due_today_count} due
            </span>
          )}
        </div>
        {deck.subject && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{deck.subject}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {deck.due_today_count > 0 && (
          <Link
            href={`/flashcards/${deck.id}/review`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Review
          </Link>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-sm font-medium text-gray-500 hover:text-red-600 disabled:opacity-50 dark:text-gray-400 dark:hover:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
