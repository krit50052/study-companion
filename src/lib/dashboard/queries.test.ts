import { describe, it, expect } from 'vitest'
import { computeStreaks } from './queries'
import type { DailyProgress } from '@/lib/types'

function day(date: string, tasks_completed: number, cards_reviewed: number): DailyProgress {
  return { date, tasks_completed, cards_reviewed }
}

describe('computeStreaks', () => {
  it('returns zero streaks for an empty array', () => {
    expect(computeStreaks([])).toEqual({ current: 0, longest: 0 })
  })

  it('returns zero streaks when no day is active', () => {
    const progress = [day('2026-09-01', 0, 0), day('2026-09-02', 1, 0), day('2026-09-03', 0, 2)]
    expect(computeStreaks(progress)).toEqual({ current: 0, longest: 0 })
  })

  it('counts a single active day as a streak of 1', () => {
    const progress = [day('2026-09-01', 0, 0), day('2026-09-02', 2, 3)]
    expect(computeStreaks(progress)).toEqual({ current: 1, longest: 1 })
  })

  it('resets the current streak when the most recent active run is broken by an inactive day', () => {
    const progress = [
      day('2026-09-01', 1, 1),
      day('2026-09-02', 1, 1),
      day('2026-09-03', 0, 0),
      day('2026-09-04', 1, 1),
    ]
    expect(computeStreaks(progress)).toEqual({ current: 1, longest: 2 })
  })

  it('does not break the current streak when today has no activity yet', () => {
    const progress = [day('2026-09-01', 1, 1), day('2026-09-02', 1, 1), day('2026-09-03', 0, 0)]
    expect(computeStreaks(progress)).toEqual({ current: 2, longest: 2 })
  })

  it('counts the whole window when every day is active', () => {
    const progress = [day('2026-09-01', 1, 1), day('2026-09-02', 2, 1), day('2026-09-03', 1, 3)]
    expect(computeStreaks(progress)).toEqual({ current: 3, longest: 3 })
  })
})
