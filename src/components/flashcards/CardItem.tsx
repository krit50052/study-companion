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
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 dark:text-gray-100">{card.front}</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{card.back}</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Next review{' '}
          {(() => {
            const [year, month, day] = card.next_review_date.split('-')
            return `${month}/${day}/${year}`
          })()}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
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
