import { useEffect, useState } from 'react'
import { subMonths, subQuarters, subWeeks } from 'date-fns'
import { useWorkoutData } from '../store/WorkoutDataContext'
import { useLocalStorageState } from '../store/useLocalStorageState'
import { periodKey, statsForPeriod, type PeriodStats, type ReportPeriod } from '../lib/stats'

interface NotificationPrefs {
  enabled: boolean
  lastShown: Partial<Record<ReportPeriod, string>>
}

const DEFAULT_PREFS: NotificationPrefs = { enabled: false, lastShown: {} }

const PREVIOUS_PERIOD_REFERENCE: Record<ReportPeriod, (d: Date) => Date> = {
  week: (d) => subWeeks(d, 1),
  month: (d) => subMonths(d, 1),
  quarter: (d) => subQuarters(d, 1),
}

const PERIOD_NOUN: Record<ReportPeriod, string> = {
  week: 'weekly',
  month: 'monthly',
  quarter: 'quarterly',
}

export interface RecapCard {
  period: ReportPeriod
  stats: PeriodStats
}

export function useProgressRecap() {
  const { sessions, exercises } = useWorkoutData()
  const [prefs, setPrefs] = useLocalStorageState<NotificationPrefs>(
    'workout-tracker:notification-prefs',
    DEFAULT_PREFS,
  )
  const [pendingRecaps, setPendingRecaps] = useState<RecapCard[]>([])

  useEffect(() => {
    const now = new Date()
    const periods: ReportPeriod[] = ['week', 'month', 'quarter']
    const newRecaps: RecapCard[] = []
    const updatedLastShown = { ...prefs.lastShown }
    let changed = false

    for (const period of periods) {
      const prevReference = PREVIOUS_PERIOD_REFERENCE[period](now)
      const prevKey = periodKey(period, prevReference)
      if (prefs.lastShown[period] === prevKey) continue

      const stats = statsForPeriod(sessions, exercises, period, prevReference)
      if (stats.workoutCount > 0) {
        newRecaps.push({ period, stats })
        if (prefs.enabled && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`Your ${PERIOD_NOUN[period]} recap is ready`, {
            body: `${stats.workoutCount} workout${stats.workoutCount === 1 ? '' : 's'} · ${stats.totalWeight.toLocaleString()} lifted`,
          })
        }
      }
      updatedLastShown[period] = prevKey
      changed = true
    }

    if (changed) setPrefs((p) => ({ ...p, lastShown: updatedLastShown }))
    if (newRecaps.length > 0) setPendingRecaps(newRecaps)
    // Run once on mount: this evaluates whichever periods have rolled over since the app was last opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function enableNotifications(): Promise<boolean> {
    if (!('Notification' in window)) return false
    const permission = await Notification.requestPermission()
    const granted = permission === 'granted'
    setPrefs((p) => ({ ...p, enabled: granted }))
    return granted
  }

  function disableNotifications() {
    setPrefs((p) => ({ ...p, enabled: false }))
  }

  function dismissRecap(period: ReportPeriod) {
    setPendingRecaps((prev) => prev.filter((r) => r.period !== period))
  }

  return {
    notificationsEnabled: prefs.enabled,
    notificationsSupported: typeof window !== 'undefined' && 'Notification' in window,
    pendingRecaps,
    enableNotifications,
    disableNotifications,
    dismissRecap,
  }
}
