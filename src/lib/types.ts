export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'doing' | 'done'

export interface Task {
  id: string
  user_id: string
  title: string
  subject: string | null
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface Deck {
  id: string
  user_id: string
  name: string
  subject: string | null
  created_at: string
}

export interface Card {
  id: string
  deck_id: string
  front: string
  back: string
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_date: string
  created_at: string
}

export interface ReviewLog {
  id: string
  card_id: string
  user_id: string
  quality: number
  reviewed_at: string
}

export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at'>
export type DeckInsert = Omit<Deck, 'id' | 'created_at'>
export type CardInsert = Omit<
  Card,
  'id' | 'created_at' | 'ease_factor' | 'interval_days' | 'repetitions' | 'next_review_date'
> & {
  ease_factor?: number
  interval_days?: number
  repetitions?: number
  next_review_date?: string
}
export type ReviewLogInsert = Omit<ReviewLog, 'id' | 'reviewed_at'>

export type TaskUpdate = Partial<TaskInsert>
export type DeckUpdate = Partial<DeckInsert>
export type CardUpdate = Partial<Omit<Card, 'id' | 'deck_id' | 'created_at'>>

export interface DeckWithStats extends Deck {
  card_count: number
  due_today_count: number
}

export interface DailyProgress {
  date: string
  tasks_completed: number
  cards_reviewed: number
}

export interface SM2Result {
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_date: string
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5
