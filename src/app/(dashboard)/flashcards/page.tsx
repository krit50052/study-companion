import { createClient } from '@/lib/supabase/server'
import { DeckList } from '@/components/flashcards/DeckList'
import { getDueCards } from '@/lib/spaced-repetition'
import type { Card, DeckWithStats } from '@/lib/types'

export default async function FlashcardsPage() {
  const supabase = await createClient()
  const { data: decks } = await supabase
    .from('decks')
    .select('*')
    .order('created_at', { ascending: false })

  const deckIds = (decks ?? []).map((deck) => deck.id)

  const { data: cards } = deckIds.length
    ? await supabase.from('cards').select('*').in('deck_id', deckIds)
    : { data: [] as Card[] }

  const decksWithStats: DeckWithStats[] = (decks ?? []).map((deck) => {
    const deckCards = (cards ?? []).filter((card) => card.deck_id === deck.id)
    return {
      ...deck,
      card_count: deckCards.length,
      due_today_count: getDueCards(deckCards).length,
    }
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Flashcards</h1>
      <div className="mt-6">
        <DeckList decks={decksWithStats} />
      </div>
    </div>
  )
}
