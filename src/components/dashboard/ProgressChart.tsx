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
import type { DailyProgress } from '@/lib/types'

const TASKS_COLOR = '#2a78d6'
const CARDS_COLOR = '#eb6834'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function formatDateLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-')
  return `${MONTH_NAMES[Number(month) - 1]} ${Number(day)}`
}

export function ProgressChart({ data }: { data: DailyProgress[] }) {
  const chartData = data.map((day) => ({ ...day, label: formatDateLabel(day.date) }))

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#898781', fontSize: 12 }}
            axisLine={{ stroke: '#c3c2b7' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#898781', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: '#f9f9f7' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="tasks_completed" name="Tasks completed" fill={TASKS_COLOR} radius={[4, 4, 0, 0]} />
          <Bar dataKey="cards_reviewed" name="Cards reviewed" fill={CARDS_COLOR} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
