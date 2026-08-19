import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CardList } from '@/components/flashcards/CardList'

export default async function DeckPage({
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
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{deck.name}</h1>
          {deck.subject && <p className="mt-1 text-sm text-gray-500">{deck.subject}</p>}
        </div>
        <Link
          href={`/flashcards/${deckId}/review`}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Start review
        </Link>
      </div>
      <div className="mt-6">
        <CardList cards={cards ?? []} deckId={deckId} />
      </div>
    </div>
  )
}
