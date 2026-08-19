'use client'

import { useState } from 'react'
import Link from 'next/link'
import { gradeCard } from '@/lib/flashcards/actions'
import { ReviewCard } from './ReviewCard'
import type { Card, ReviewQuality } from '@/lib/types'

function EmptyState({ deckId, message }: { deckId: string; message: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <p className="text-lg font-medium text-gray-900">{message}</p>
      <Link
        href={`/flashcards/${deckId}`}
        className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        Back to deck
      </Link>
    </div>
  )
}

export function ReviewSession({ cards, deckId }: { cards: Card[]; deckId: string }) {
  const [queue] = useState(cards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  if (queue.length === 0) {
    return <EmptyState deckId={deckId} message="Nothing due right now." />
  }

  if (currentIndex >= queue.length) {
    return <EmptyState deckId={deckId} message="All done for now." />
  }

  const currentCard = queue[currentIndex]

  function handleGrade(quality: ReviewQuality) {
    gradeCard(currentCard, deckId, quality).catch(console.error)
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
