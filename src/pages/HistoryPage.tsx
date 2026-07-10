import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Trash2, Dumbbell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWorkoutData } from '../store/WorkoutDataContext'
import { Card, EmptyState, Button } from '../components/ui'
import { totalSets, totalVolume } from '../lib/stats'

export function HistoryPage() {
  const { sessions, exercises, deleteSession } = useWorkoutData()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const exerciseById = Object.fromEntries(exercises.map((e) => [e.id, e]))

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold text-slate-100">History</h2>
        <EmptyState
          title="No workouts logged yet"
          description="Once you save a workout it will show up here with full set-by-set detail."
          action={
            <Link to="/log">
              <Button>Log a Workout</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-100">History</h2>
        <p className="text-sm text-slate-400">{sessions.length} workout{sessions.length === 1 ? '' : 's'} logged</p>
      </div>

      <div className="flex flex-col gap-3">
        {sessions.map((session) => {
          const expanded = expandedId === session.id
          return (
            <Card key={session.id}>
              <div className="flex w-full items-center justify-between text-left">
                <button
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() => setExpandedId(expanded ? null : session.id)}
                >
                  <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400">
                    <Dumbbell size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-100">{session.name}</p>
                    <p className="text-xs text-slate-400">
                      {format(parseISO(session.date), 'EEE, MMM d yyyy')} &middot;{' '}
                      {session.exercises.length} exercise{session.exercises.length === 1 ? '' : 's'} &middot;{' '}
                      {totalSets(session)} sets &middot; {totalVolume(session).toLocaleString()} vol
                      {session.durationMinutes !== undefined && session.durationMinutes > 0 && (
                        <> &middot; {session.durationMinutes} min</>
                      )}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => deleteSession(session.id)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {expanded && (
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4">
                  {session.exercises.map((ex) => (
                    <div key={ex.id}>
                      <p className="mb-1 text-sm font-medium text-slate-200">
                        {exerciseById[ex.exerciseId]?.name ?? 'Unknown exercise'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ex.sets.map((set, idx) => (
                          <span
                            key={set.id}
                            className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300"
                          >
                            Set {idx + 1}: {set.reps} × {set.weight}{set.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
