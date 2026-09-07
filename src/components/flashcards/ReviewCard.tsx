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
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{card.front}</p>

      {revealed ? (
        <>
          <hr className="my-6 border-gray-200 dark:border-gray-700" />
          <p className="text-lg text-gray-700 dark:text-gray-300">{card.back}</p>
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
