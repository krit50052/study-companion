'use client'

import { CardForm } from './CardForm'
import { CardItem } from './CardItem'
import type { Card } from '@/lib/types'

export function CardList({ cards, deckId }: { cards: Card[]; deckId: string }) {
  return (
    <div className="space-y-6">
      <CardForm mode="create" deckId={deckId} />

      {cards.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No cards yet. Add one above.</p>
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
