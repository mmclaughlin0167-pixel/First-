import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useWorkoutData } from '../store/WorkoutDataContext'
import { Card, EmptyState } from '../components/ui'

export function ProgressPage() {
  const { sessions, exercises } = useWorkoutData()

  const exercisesWithData = useMemo(() => {
    const idsUsed = new Set<string>()
    sessions.forEach((s) => s.exercises.forEach((e) => idsUsed.add(e.exerciseId)))
    return exercises.filter((e) => idsUsed.has(e.id))
  }, [sessions, exercises])

  const [selectedId, setSelectedId] = useState<string>('')
  const activeId = selectedId || exercisesWithData[0]?.id || ''

  const chartData = useMemo(() => {
    if (!activeId) return []
    return sessions
      .filter((s) => s.exercises.some((e) => e.exerciseId === activeId))
      .map((s) => {
        const entry = s.exercises.find((e) => e.exerciseId === activeId)!
        const maxWeight = Math.max(...entry.sets.map((set) => set.weight), 0)
        const volume = entry.sets.reduce((sum, set) => sum + set.reps * set.weight, 0)
        return {
          date: s.date,
          label: format(parseISO(s.date), 'MMM d'),
          maxWeight,
          volume,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [sessions, activeId])

  if (exercisesWithData.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold text-slate-100">Progress</h2>
        <EmptyState
          title="Nothing to chart yet"
          description="Log a few workouts for the same exercise to see your progress over time."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-100">Progress</h2>
        <p className="text-sm text-slate-400">Track strength gains over time, exercise by exercise.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {exercisesWithData.map((ex) => (
          <button
            key={ex.id}
            onClick={() => setSelectedId(ex.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeId === ex.id
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {ex.name}
          </button>
        ))}
      </div>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-slate-300">Max Weight per Session</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Line type="monotone" dataKey="maxWeight" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-slate-300">Total Volume per Session</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Line type="monotone" dataKey="volume" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
