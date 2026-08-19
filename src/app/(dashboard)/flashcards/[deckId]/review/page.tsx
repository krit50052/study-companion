import Link from 'next/link'
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
      <h1 className="text-2xl font-semibold text-gray-900">Reviewing {deck.name}</h1>
      <div className="mt-6">
        {dueCards.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-lg font-medium text-gray-900">Nothing due right now.</p>
            <Link
              href={`/flashcards/${deckId}`}
              className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Back to deck
            </Link>
          </div>
        ) : (
          <ReviewSession cards={dueCards} deckId={deckId} />
        )}
      </div>
    </div>
  )
}
