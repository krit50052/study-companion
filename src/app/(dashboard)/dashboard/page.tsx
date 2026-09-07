import { getDailyProgress, computeStreaks } from '@/lib/dashboard/queries'
import { StreakCounter } from '@/components/dashboard/StreakCounter'
import { ProgressChart } from '@/components/dashboard/ProgressChart'

const STREAK_WINDOW_DAYS = 90
const CHART_WINDOW_DAYS = 14

export default async function DashboardPage() {
  const progress = await getDailyProgress(STREAK_WINDOW_DAYS)
  const { current, longest } = computeStreaks(progress)
  const chartData = progress.slice(-CHART_WINDOW_DAYS)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
      <div className="mt-6 space-y-6">
        <StreakCounter current={current} longest={longest} />
        <ProgressChart data={chartData} />
      </div>
    </div>
  )
}
