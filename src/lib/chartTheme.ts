import { useTheme } from '../store/ThemeContext'

export interface ChartColors {
  grid: string
  axis: string
  tooltipBg: string
  tooltipBorder: string
  tooltipLabel: string
}

const DARK: ChartColors = {
  grid: '#1e293b',
  axis: '#64748b',
  tooltipBg: '#0f172a',
  tooltipBorder: '#1e293b',
  tooltipLabel: '#e2e8f0',
}

const LIGHT: ChartColors = {
  grid: '#e2e8f0',
  axis: '#64748b',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e2e8f0',
  tooltipLabel: '#0f172a',
}

export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme()
  return resolvedTheme === 'light' ? LIGHT : DARK
}
