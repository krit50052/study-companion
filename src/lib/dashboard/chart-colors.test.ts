import { describe, it, expect } from 'vitest'
import { getChartColors } from './chart-colors'

describe('getChartColors', () => {
  it('returns the light palette for theme "light"', () => {
    expect(getChartColors('light').tasksBar).toBe('#2a78d6')
  })

  it('returns the dark palette for theme "dark"', () => {
    expect(getChartColors('dark').tasksBar).toBe('#5b9bf0')
  })

  it('returns a distinct palette per theme', () => {
    expect(getChartColors('light')).not.toEqual(getChartColors('dark'))
  })
})
