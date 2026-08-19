'use client'

import { useState } from 'react'
import { deleteTask } from '@/lib/tasks/actions'
import { TaskForm } from './TaskForm'
import type { Task } from '@/lib/types'

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<Task['status'], string> = {
  todo: 'To do',
  doing: 'Doing',
  done: 'Done',
}

export function TaskCard({ task }: { task: Task }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (isEditing) {
    return <TaskForm mode="edit" task={task} onDone={() => setIsEditing(false)} />
  }

  async function handleDelete() {
    setIsDeleting(true)
    await deleteTask(task.id)
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium text-gray-900">{task.title}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
          >
            {task.priority}
          </span>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
            {STATUS_LABELS[task.status]}
          </span>
        </div>
        {task.subject && <p className="mt-1 text-sm text-gray-500">{task.subject}</p>}
        {task.description && <p className="mt-1 text-sm text-gray-600">{task.description}</p>}
        {task.due_date && (
          <p className="mt-1 text-xs text-gray-400">
            Due {new Date(task.due_date).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm font-medium text-gray-500 hover:text-indigo-600"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-sm font-medium text-gray-500 hover:text-red-600 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
