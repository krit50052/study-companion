import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDueCards } from '@/lib/spaced-repetition'
import { ReviewSession } from '@/components/flashcards/ReviewSession'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  const { deckId } = await params
  const supabase = await createClient()

  const { data: deck } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .single()

  if (!deck) {
    notFound()
  }

  const { data: cards } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)

  const dueCards = getDueCards(cards ?? [])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Reviewing {deck.name}</h1>
      <div className="mt-6">
        <ReviewSession cards={dueCards} deckId={deckId} />
      </div>
    </div>
  )
}
