'use client'

import { DeckForm } from './DeckForm'
import { DeckCard } from './DeckCard'
import type { DeckWithStats } from '@/lib/types'

export function DeckList({ decks }: { decks: DeckWithStats[] }) {
  return (
    <div className="space-y-6">
      <DeckForm mode="create" />

      {decks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No decks yet. Create one above.</p>
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
