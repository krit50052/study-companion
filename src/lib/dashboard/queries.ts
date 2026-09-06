import type { DailyProgress } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'

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

function toDateKey(iso: string): string {
  return iso.slice(0, 10)
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export async function getDailyProgress(days: number): Promise<DailyProgress[]> {
  const supabase = await createClient()

  const todayKey = new Date().toISOString().slice(0, 10)
  const startKey = addDays(todayKey, -(days - 1))
  const startOfRange = `${startKey}T00:00:00.000Z`

  const [{ data: doneTasks }, { data: reviewLogs }] = await Promise.all([
    supabase
      .from('tasks')
      .select('completed_at')
      .eq('status', 'done')
      .gte('completed_at', startOfRange),
    supabase.from('review_logs').select('reviewed_at').gte('reviewed_at', startOfRange),
  ])

  const tasksByDate = new Map<string, number>()
  for (const task of doneTasks ?? []) {
    if (!task.completed_at) continue
    const dateKey = toDateKey(task.completed_at)
    tasksByDate.set(dateKey, (tasksByDate.get(dateKey) ?? 0) + 1)
  }

  const reviewsByDate = new Map<string, number>()
  for (const log of reviewLogs ?? []) {
    const dateKey = toDateKey(log.reviewed_at)
    reviewsByDate.set(dateKey, (reviewsByDate.get(dateKey) ?? 0) + 1)
  }

  const progress: DailyProgress[] = []
  let cursor = startKey
  while (cursor <= todayKey) {
    progress.push({
      date: cursor,
      tasks_completed: tasksByDate.get(cursor) ?? 0,
      cards_reviewed: reviewsByDate.get(cursor) ?? 0,
    })
    cursor = addDays(cursor, 1)
  }

  return progress
}
