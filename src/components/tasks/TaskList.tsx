'use client'

import { useMemo, useState } from 'react'
import { TaskForm } from './TaskForm'
import { TaskCard } from './TaskCard'
import type { Task, TaskPriority, TaskStatus } from '@/lib/types'

type StatusFilter = TaskStatus | 'all'
type PriorityFilter = TaskPriority | 'all'
type SortOrder = 'due_asc' | 'due_desc'

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('due_asc')

  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      const diff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      return sortOrder === 'due_asc' ? diff : -diff
    })
  }, [tasks, statusFilter, priorityFilter, sortOrder])

  return (
    <div className="space-y-6">
      <TaskForm mode="create" />

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="all">All statuses</option>
          <option value="todo">To do</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="due_asc">Due date ↑</option>
          <option value="due_desc">Due date ↓</option>
        </select>
      </div>

      {visibleTasks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No tasks match these filters.</p>
      ) : (
        <div className="space-y-3">
          {visibleTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
