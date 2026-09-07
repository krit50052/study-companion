import type { Theme } from '@/components/providers/ThemeProvider'

export interface ChartColors {
  tasksBar: string
  cardsBar: string
  grid: string
  tick: string
  axisLine: string
  tooltipCursor: string
}

const LIGHT_CHART_COLORS: ChartColors = {
  tasksBar: '#2a78d6',
  cardsBar: '#eb6834',
  grid: '#e1e0d9',
  tick: '#898781',
  axisLine: '#c3c2b7',
  tooltipCursor: '#f9f9f7',
}

const DARK_CHART_COLORS: ChartColors = {
  tasksBar: '#5b9bf0',
  cardsBar: '#f28a5c',
  grid: '#3a3a38',
  tick: '#a3a29c',
  axisLine: '#52514c',
  tooltipCursor: '#262624',
}

export function getChartColors(theme: Theme): ChartColors {
  return theme === 'dark' ? DARK_CHART_COLORS : LIGHT_CHART_COLORS
}
