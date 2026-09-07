import { createClient } from '@/lib/supabase/server'
import { TaskList } from '@/components/tasks/TaskList'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Tasks</h1>
      <div className="mt-6">
        <TaskList tasks={tasks ?? []} />
      </div>
    </div>
  )
}
