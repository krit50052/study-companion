'use client'

import { useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { createTask, updateTask, type TaskActionState } from '@/lib/tasks/actions'
import type { Task } from '@/lib/types'

const initialState: TaskActionState = {}

interface TaskFormProps {
  mode: 'create' | 'edit'
  task?: Task
  onDone?: () => void
}

export function TaskForm({ mode, task, onDone }: TaskFormProps) {
  const action =
    mode === 'edit' && task
      ? (updateTask.bind(null, task.id) as (
          state: TaskActionState,
          formData: FormData
        ) => Promise<TaskActionState>)
      : createTask
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      if (mode === 'create') {
        formRef.current?.reset()
      }
      onDone?.()
    }
    wasPending.current = isPending
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">{state.error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="title"
          placeholder="Title"
          required
          defaultValue={task?.title}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:col-span-2"
        />
        <input
          name="subject"
          placeholder="Subject"
          defaultValue={task?.subject ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <input
          name="due_date"
          type="date"
          defaultValue={task?.due_date ? task.due_date.slice(0, 10) : ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <select
          name="priority"
          defaultValue={task?.priority ?? 'medium'}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select
          name="status"
          defaultValue={task?.status ?? 'todo'}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="todo">To do</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
        </select>
        <textarea
          name="description"
          placeholder="Description"
          defaultValue={task?.description ?? ''}
          rows={2}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:col-span-2"
        />
      </div>
      <div className="flex justify-end gap-2">
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {mode === 'create' ? 'Add task' : 'Save'}
        </button>
      </div>
    </form>
  )
}
