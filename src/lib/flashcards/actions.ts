'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface FlashcardActionState {
  error?: string
}

function parseDeckForm(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const subject = (formData.get('subject') as string)?.trim() || null
  return { name, subject }
}

export async function createDeck(
  _prevState: FlashcardActionState,
  formData: FormData
): Promise<FlashcardActionState> {
  const { name, subject } = parseDeckForm(formData)

  if (!name) {
    return { error: 'Name is required' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not signed in' }
  }

  const { error } = await supabase.from('decks').insert({
    user_id: user.id,
    name,
    subject,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/flashcards')
  return {}
}

export async function updateDeck(
  id: string,
  _prevState: FlashcardActionState,
  formData: FormData
): Promise<FlashcardActionState> {
  const { name, subject } = parseDeckForm(formData)

  if (!name) {
    return { error: 'Name is required' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('decks')
    .update({ name, subject })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/flashcards')
  return {}
}

export async function deleteDeck(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('decks').delete().eq('id', id)
  revalidatePath('/flashcards')
}

function parseCardForm(formData: FormData) {
  const front = (formData.get('front') as string)?.trim()
  const back = (formData.get('back') as string)?.trim()
  return { front, back }
}

export async function createCard(
  deckId: string,
  _prevState: FlashcardActionState,
  formData: FormData
): Promise<FlashcardActionState> {
  const { front, back } = parseCardForm(formData)

  if (!front || !back) {
    return { error: 'Front and back are required' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('cards').insert({
    deck_id: deckId,
    front,
    back,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/flashcards/${deckId}`)
  return {}
}

export async function updateCard(
  id: string,
  deckId: string,
  _prevState: FlashcardActionState,
  formData: FormData
): Promise<FlashcardActionState> {
  const { front, back } = parseCardForm(formData)

  if (!front || !back) {
    return { error: 'Front and back are required' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('cards')
    .update({ front, back })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/flashcards/${deckId}`)
  return {}
}

export async function deleteCard(id: string, deckId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('cards').delete().eq('id', id)
  revalidatePath(`/flashcards/${deckId}`)
}
