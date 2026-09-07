'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '@/hooks/useTheme'
import { getChartColors } from '@/lib/dashboard/chart-colors'
import type { DailyProgress } from '@/lib/types'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function formatDateLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-')
  return `${MONTH_NAMES[Number(month) - 1]} ${Number(day)}`
}

export function ProgressChart({ data }: { data: DailyProgress[] }) {
  const { theme } = useTheme()
  const colors = getChartColors(theme)
  const chartData = data.map((day) => ({ ...day, label: formatDateLabel(day.date) }))

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.tick, fontSize: 12 }}
            axisLine={{ stroke: colors.axisLine }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: colors.tick, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: colors.tooltipCursor }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="tasks_completed" name="Tasks completed" fill={colors.tasksBar} radius={[4, 4, 0, 0]} />
          <Bar dataKey="cards_reviewed" name="Cards reviewed" fill={colors.cardsBar} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
