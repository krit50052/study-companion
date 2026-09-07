import type { Card, SM2Result, ReviewQuality } from './types'

const MIN_EASE_FACTOR = 1.3

export function calculateNextReview(
  card: Pick<Card, 'ease_factor' | 'interval_days' | 'repetitions'>,
  quality: ReviewQuality
): SM2Result {
  let { ease_factor, interval_days, repetitions } = card

  if (quality < 3) {
    repetitions = 0
    interval_days = 1
  } else {
    if (repetitions === 0) {
      interval_days = 1
    } else if (repetitions === 1) {
      interval_days = 6
    } else {
      interval_days = Math.round(interval_days * ease_factor)
    }
    repetitions += 1

    ease_factor =
      ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    if (ease_factor < MIN_EASE_FACTOR) {
      ease_factor = MIN_EASE_FACTOR
    }
  }

  const next_review_date = addDays(new Date(), interval_days)
    .toISOString()
    .split('T')[0]

  return {
    ease_factor: roundTo(ease_factor, 2),
    interval_days,
    repetitions,
    next_review_date,
  }
}

export function isDue(card: Pick<Card, 'next_review_date'>): boolean {
  const today = new Date().toISOString().split('T')[0]
  return card.next_review_date <= today
}

export function getDueCards<T extends Pick<Card, 'next_review_date'>>(
  cards: T[]
): T[] {
  return cards.filter(isDue)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
