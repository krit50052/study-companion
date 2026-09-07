/**
 * Seeds sample tasks, decks, cards, and review history for a test account.
 * Usage: fill SEED_USER_EMAIL / SEED_USER_PASSWORD in .env.local, then:
 *   npm run seed
 *
 * Resets (deletes) that user's existing tasks/decks/cards/review_logs
 * before reseeding, so it's safe to rerun.
 */
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.local')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
}
if (!SEED_USER_EMAIL || !SEED_USER_PASSWORD) {
  throw new Error(
    'Missing SEED_USER_EMAIL / SEED_USER_PASSWORD in .env.local — add your test account credentials.'
  )
}

function daysAgo(n: number): Date {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - n)
  return date
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

const DECKS = [
  {
    name: 'Biology 101',
    subject: 'Biology',
    cards: [
      { front: 'What is the powerhouse of the cell?', back: 'The mitochondria' },
      {
        front: 'What is photosynthesis?',
        back: 'The process by which plants convert light energy into chemical energy',
      },
      {
        front: 'Define homeostasis',
        back: 'The maintenance of a stable internal environment despite external changes',
      },
      {
        front: 'What are the four nitrogenous bases in DNA?',
        back: 'Adenine, Thymine, Guanine, Cytosine',
      },
      {
        front: 'What is natural selection?',
        back: 'The process by which organisms better adapted to their environment tend to survive and reproduce',
      },
    ],
  },
  {
    name: 'Spanish Vocabulary',
    subject: 'Spanish',
    cards: [
      { front: "How do you say 'library' in Spanish?", back: 'La biblioteca' },
      { front: "Translate: 'I would like a coffee'", back: 'Me gustaría un café' },
      { front: "What is the Spanish word for 'yesterday'?", back: 'Ayer' },
      { front: "Conjugate 'hablar' in present tense (yo)", back: 'Hablo' },
      { front: "What does 'sin embargo' mean?", back: 'However / nevertheless' },
    ],
  },
  {
    name: 'Calculus II',
    subject: 'Math',
    cards: [
      { front: 'What is the derivative of sin(x)?', back: 'cos(x)' },
      { front: 'State the power rule for derivatives', back: 'd/dx[x^n] = n·x^(n-1)' },
      { front: 'What is the integral of 1/x dx?', back: 'ln|x| + C' },
      { front: 'Define a limit', back: 'The value a function approaches as its input approaches some value' },
      {
        front: "What is L'Hôpital's rule used for?",
        back: 'Evaluating limits of indeterminate forms like 0/0 or ∞/∞',
      },
    ],
  },
]

// Index within each deck's 5-card list -> spaced-repetition state.
const CARD_STATES = [
  { ease_factor: 2.5, interval_days: 0, repetitions: 0, next_review_date: dateOnly(daysAgo(0)) }, // due now
  { ease_factor: 2.5, interval_days: 0, repetitions: 0, next_review_date: dateOnly(daysAgo(0)) }, // due now
  { ease_factor: 2.3, interval_days: 6, repetitions: 2, next_review_date: dateOnly(daysAgo(3)) }, // overdue
  { ease_factor: 2.6, interval_days: 15, repetitions: 3, next_review_date: dateOnly(daysAgo(-10)) }, // future
  { ease_factor: 2.4, interval_days: 6, repetitions: 1, next_review_date: dateOnly(daysAgo(-3)) }, // future
]

const OPEN_TASKS = [
  { title: 'Read Chapter 5', subject: 'Biology', priority: 'medium', status: 'todo', dueOffset: -3 },
  { title: 'Practice conjugations', subject: 'Spanish', priority: 'high', status: 'doing', dueOffset: -1 },
  { title: 'Review calculus formulas', subject: 'Math', priority: 'low', status: 'todo', dueOffset: null },
] as const

// A deliberately uneven streak: 3 active days ending today, a gap, then an
// older 4-day active run — so the dashboard's current vs. longest streak
// (and the 14-day chart) actually show something besides all-zeros.
const STREAK_DAYS = [
  { offset: 0, title: 'Submit lab report', subject: 'Biology', tasksCompleted: 2 },
  { offset: 1, title: 'Complete worksheet 3', subject: 'Math', tasksCompleted: 1 },
  { offset: 2, title: 'Outline essay draft', subject: 'Spanish', tasksCompleted: 1 },
  { offset: 8, title: 'Finish practice exam', subject: 'Biology', tasksCompleted: 1 },
  { offset: 9, title: 'Review lecture notes', subject: 'Math', tasksCompleted: 2 },
  { offset: 10, title: 'Write summary notes', subject: 'Spanish', tasksCompleted: 1 },
  { offset: 11, title: 'Complete homework set 1', subject: 'Biology', tasksCompleted: 1 },
] as const

const REVIEWS_PER_STREAK_DAY: Record<number, number> = {
  0: 3,
  1: 2,
  2: 4,
  8: 2,
  9: 3,
  10: 2,
  11: 3,
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: SEED_USER_EMAIL!,
    password: SEED_USER_PASSWORD!,
  })
  if (signInError || !signInData.user) {
    throw new Error(`Sign-in failed: ${signInError?.message ?? 'unknown error'}`)
  }
  const userId = signInData.user.id
  console.log(`Signed in as ${SEED_USER_EMAIL} (${userId})`)

  console.log('Clearing existing seed-scoped data...')
  await supabase.from('review_logs').delete().eq('user_id', userId)
  await supabase.from('tasks').delete().eq('user_id', userId)
  await supabase.from('decks').delete().eq('user_id', userId)

  console.log('Inserting decks and cards...')
  const allCardIds: string[] = []
  for (const deck of DECKS) {
    const { data: insertedDeck, error: deckError } = await supabase
      .from('decks')
      .insert({ user_id: userId, name: deck.name, subject: deck.subject })
      .select('id')
      .single()
    if (deckError || !insertedDeck) {
      throw new Error(`Failed to insert deck "${deck.name}": ${deckError?.message}`)
    }

    const cardRows = deck.cards.map((card, index) => ({
      deck_id: insertedDeck.id,
      front: card.front,
      back: card.back,
      ...CARD_STATES[index],
    }))
    const { data: insertedCards, error: cardsError } = await supabase
      .from('cards')
      .insert(cardRows)
      .select('id')
    if (cardsError || !insertedCards) {
      throw new Error(`Failed to insert cards for "${deck.name}": ${cardsError?.message}`)
    }
    allCardIds.push(...insertedCards.map((c) => c.id))
  }

  console.log('Inserting open tasks...')
  for (const task of OPEN_TASKS) {
    await supabase.from('tasks').insert({
      user_id: userId,
      title: task.title,
      subject: task.subject,
      priority: task.priority,
      status: task.status,
      due_date: task.dueOffset === null ? null : daysAgo(task.dueOffset).toISOString(),
    })
  }

  console.log('Inserting streak history (completed tasks + review logs)...')
  for (const day of STREAK_DAYS) {
    const completedAt = daysAgo(day.offset).toISOString()
    for (let i = 0; i < day.tasksCompleted; i++) {
      await supabase.from('tasks').insert({
        user_id: userId,
        title: i === 0 ? day.title : `${day.title} (part ${i + 1})`,
        subject: day.subject,
        priority: 'medium',
        status: 'done',
        due_date: completedAt,
        completed_at: completedAt,
      })
    }

    const reviewCount = REVIEWS_PER_STREAK_DAY[day.offset] ?? 1
    const reviewRows = Array.from({ length: reviewCount }, (_, i) => ({
      card_id: allCardIds[(day.offset + i) % allCardIds.length],
      user_id: userId,
      quality: 3 + (i % 3),
      reviewed_at: completedAt,
    }))
    await supabase.from('review_logs').insert(reviewRows)
  }

  console.log('Done. Seeded 3 decks (15 cards), 3 open tasks, and 7 days of streak history.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
