'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TaskPriority, TaskStatus } from '@/lib/types'

export interface TaskActionState {
  error?: string
}

function parseTaskForm(formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  const subject = (formData.get('subject') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const priority = (formData.get('priority') as TaskPriority) || 'medium'
  const status = (formData.get('status') as TaskStatus) || 'todo'
  const due_date = (formData.get('due_date') as string) || null

  return { title, subject, description, priority, status, due_date }
}

export async function createTask(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const { title, subject, description, priority, status, due_date } = parseTaskForm(formData)

  if (!title) {
    return { error: 'Title is required' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not signed in' }
  }

  const { error } = await supabase.from('tasks').insert({
    user_id: user.id,
    title,
    subject,
    description,
    priority,
    status,
    due_date,
    completed_at: status === 'done' ? new Date().toISOString() : null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tasks')
  return {}
}

export async function updateTask(
  id: string,
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const { title, subject, description, priority, status, due_date } = parseTaskForm(formData)

  if (!title) {
    return { error: 'Title is required' }
  }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('tasks')
    .select('status, completed_at')
    .eq('id', id)
    .single()

  let completed_at = existing?.completed_at ?? null
  if (status === 'done' && existing?.status !== 'done') {
    completed_at = new Date().toISOString()
  } else if (status !== 'done') {
    completed_at = null
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      title,
      subject,
      description,
      priority,
      status,
      due_date,
      completed_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tasks')
  return {}
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('tasks').delete().eq('id', id)
  revalidatePath('/tasks')
}
