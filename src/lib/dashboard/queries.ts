import type { DailyProgress } from '@/lib/types'

function isActiveDay(day: DailyProgress): boolean {
  return day.tasks_completed > 0 && day.cards_reviewed > 0
}

export function computeStreaks(progress: DailyProgress[]): { current: number; longest: number } {
  let longest = 0
  let run = 0
  for (const day of progress) {
    if (isActiveDay(day)) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
  }

  let current = 0
  let index = progress.length - 1
  if (index >= 0 && !isActiveDay(progress[index])) {
    index -= 1
  }
  while (index >= 0 && isActiveDay(progress[index])) {
    current += 1
    index -= 1
  }

  return { current, longest }
}
