import { useMemo, useState } from 'react'
import { subMonths, subQuarters, subWeeks } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Bell, BellOff, Dumbbell, ListChecks, TrendingDown, TrendingUp } from 'lucide-react'
import { useWorkoutData } from '../store/WorkoutDataContext'
import { useProgressRecap } from '../hooks/useProgressRecap'
import { Button, Card, EmptyState } from '../components/ui'
import { statsForPeriod, type ReportPeriod } from '../lib/stats'

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
}

const PREVIOUS_REFERENCE: Record<ReportPeriod, (d: Date) => Date> = {
  week: (d) => subWeeks(d, 1),
  month: (d) => subMonths(d, 1),
  quarter: (d) => subQuarters(d, 1),
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return current > 0 ? (
      <span className="text-xs font-medium text-emerald-400">New</span>
    ) : null
  }
  const change = ((current - previous) / previous) * 100
  const isUp = change >= 0
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isUp ? 'text-emerald-400' : 'text-red-400'
      }`}
    >
      {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(change).toFixed(0)}%
    </span>
  )
}

export function ReportsPage() {
  const { sessions, exercises } = useWorkoutData()
  const {
    notificationsEnabled,
    notificationsSupported,
    enableNotifications,
    disableNotifications,
  } = useProgressRecap()
  const [period, setPeriod] = useState<ReportPeriod>('week')

  const now = useMemo(() => new Date(), [])
  const current = useMemo(
    () => statsForPeriod(sessions, exercises, period, now),
    [sessions, exercises, period, now],
  )
  const previous = useMemo(
    () => statsForPeriod(sessions, exercises, period, PREVIOUS_REFERENCE[period](now)),
    [sessions, exercises, period, now],
  )

  const muscleGroupData = useMemo(
    () =>
      Object.entries(current.muscleGroupVolume)
        .map(([muscleGroup, volume]) => ({ muscleGroup, volume }))
        .sort((a, b) => b.volume - a.volume),
    [current],
  )

  async function handleToggleNotifications() {
    if (notificationsEnabled) {
      disableNotifications()
    } else {
      await enableNotifications()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">Reports</h2>
          <p className="text-sm text-slate-400">
            Weekly, monthly, and quarterly progress recaps.
          </p>
        </div>
        {notificationsSupported && (
          <Button
            variant={notificationsEnabled ? 'secondary' : 'primary'}
            icon={notificationsEnabled ? <BellOff size={16} /> : <Bell size={16} />}
            onClick={handleToggleNotifications}
          >
            {notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['week', 'month', 'quarter'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              period === p
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-400">
            <Dumbbell size={16} />
            <span className="text-xs font-medium">Workouts</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-slate-100">{current.workoutCount}</p>
            <DeltaBadge current={current.workoutCount} previous={previous.workoutCount} />
          </div>
        </Card>
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-400">
            <TrendingUp size={16} />
            <span className="text-xs font-medium">Total Weight</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-slate-100">
              {current.totalWeight.toLocaleString()}
            </p>
            <DeltaBadge current={current.totalWeight} previous={previous.totalWeight} />
          </div>
        </Card>
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-400">
            <ListChecks size={16} />
            <span className="text-xs font-medium">Sets</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-slate-100">{current.totalSets}</p>
            <DeltaBadge current={current.totalSets} previous={previous.totalSets} />
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-slate-300">Muscle Groups Worked</h3>
        {muscleGroupData.length === 0 ? (
          <EmptyState
            title="No workouts in this period"
            description="Log a workout to see which muscle groups you've been training."
          />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={muscleGroupData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="muscleGroup" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="volume" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  )
}
