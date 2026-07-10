import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { Plus, Trash2, Check, CheckCircle2, Circle, Pause, Play, Timer } from 'lucide-react'
import { useWorkoutData } from '../store/WorkoutDataContext'
import { Button, Card } from '../components/ui'
import { RestTimer, type RestTimerHandle } from '../components/RestTimer'
import { formatDuration } from '../lib/time'
import type { SetEntry, WorkoutExercise } from '../types'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function LogWorkout() {
  const { exercises, addSession } = useWorkoutData()
  const navigate = useNavigate()

  const [workoutName, setWorkoutName] = useState('')
  const [date, setDate] = useState(todayISO())
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0]?.id ?? '')
  const [entries, setEntries] = useState<WorkoutExercise[]>([])

  const [elapsedSec, setElapsedSec] = useState(0)
  const [timerRunning, setTimerRunning] = useState(true)
  const intervalRef = useRef<number | null>(null)
  const restTimerRef = useRef<RestTimerHandle>(null)

  useEffect(() => {
    if (!timerRunning) return
    intervalRef.current = window.setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    }
  }, [timerRunning])

  function addExerciseToWorkout() {
    if (!selectedExerciseId) return
    if (entries.some((e) => e.exerciseId === selectedExerciseId)) return
    setEntries((prev) => [
      ...prev,
      {
        id: uuid(),
        exerciseId: selectedExerciseId,
        sets: [{ id: uuid(), reps: 8, weight: 0, unit: 'lb' }],
      },
    ])
  }

  function removeExercise(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  function addSet(exerciseEntryId: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === exerciseEntryId
          ? {
              ...e,
              sets: [
                ...e.sets,
                {
                  id: uuid(),
                  reps: e.sets.at(-1)?.reps ?? 8,
                  weight: e.sets.at(-1)?.weight ?? 0,
                  unit: e.sets.at(-1)?.unit ?? 'lb',
                },
              ],
            }
          : e,
      ),
    )
  }

  function updateSet(exerciseEntryId: string, setId: string, patch: Partial<SetEntry>) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === exerciseEntryId
          ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
          : e,
      ),
    )
  }

  function toggleSetComplete(exerciseEntryId: string, setId: string) {
    const currentSet = entries
      .find((e) => e.id === exerciseEntryId)
      ?.sets.find((s) => s.id === setId)
    const nextCompleted = !currentSet?.completed

    setEntries((prev) =>
      prev.map((e) =>
        e.id === exerciseEntryId
          ? {
              ...e,
              sets: e.sets.map((s) => (s.id === setId ? { ...s, completed: nextCompleted } : s)),
            }
          : e,
      ),
    )

    if (nextCompleted) restTimerRef.current?.start()
  }

  function removeSet(exerciseEntryId: string, setId: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === exerciseEntryId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e,
      ),
    )
  }

  function handleSave() {
    if (entries.length === 0) return
    addSession({
      name: workoutName.trim() || 'Workout',
      date,
      exercises: entries,
      durationMinutes: Math.round(elapsedSec / 60),
    })
    navigate('/history')
  }

  const exerciseById = Object.fromEntries(exercises.map((e) => [e.id, e]))
  const canSave = entries.length > 0 && entries.every((e) => e.sets.length > 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">Log Workout</h2>
          <p className="text-sm text-slate-400">Record today's session, set by set.</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-slate-900/60 px-4 py-2 ring-1 ring-slate-800">
          <Timer size={18} className="text-emerald-400" />
          <span className="text-lg font-semibold tabular-nums text-slate-100">
            {formatDuration(elapsedSec)}
          </span>
          <button
            onClick={() => setTimerRunning((r) => !r)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label={timerRunning ? 'Pause workout timer' : 'Resume workout timer'}
          >
            {timerRunning ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
      </div>

      <RestTimer ref={restTimerRef} />

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-400">Workout name</label>
          <input
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="e.g. Push Day"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 sm:w-44"
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-400">Add exercise</label>
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.muscleGroup})
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={addExerciseToWorkout} icon={<Plus size={16} />}>
            Add to Workout
          </Button>
        </div>
      </Card>

      {entries.length === 0 ? (
        <Card className="text-center text-sm text-slate-400">
          No exercises added yet. Pick one above to get started.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map((entry) => {
            const exercise = exerciseById[entry.exerciseId]
            return (
              <Card key={entry.id}>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-100">{exercise?.name}</p>
                    <p className="text-xs text-slate-400">{exercise?.muscleGroup}</p>
                  </div>
                  <button
                    onClick={() => removeExercise(entry.id)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-[2rem_1fr_1fr_4rem_2.25rem_2rem] gap-2 px-1 text-xs font-medium text-slate-500">
                    <span>#</span>
                    <span>Reps</span>
                    <span>Weight</span>
                    <span>Unit</span>
                    <span></span>
                    <span></span>
                  </div>
                  {entry.sets.map((set, idx) => (
                    <div
                      key={set.id}
                      className={`grid grid-cols-[2rem_1fr_1fr_4rem_2.25rem_2rem] items-center gap-2 rounded-lg transition-colors ${
                        set.completed ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      <span className="text-sm text-slate-400">{idx + 1}</span>
                      <input
                        type="number"
                        min={0}
                        value={set.reps}
                        onChange={(e) =>
                          updateSet(entry.id, set.id, { reps: Number(e.target.value) })
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-emerald-500"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={set.weight}
                        onChange={(e) =>
                          updateSet(entry.id, set.id, { weight: Number(e.target.value) })
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-emerald-500"
                      />
                      <select
                        value={set.unit}
                        onChange={(e) =>
                          updateSet(entry.id, set.id, { unit: e.target.value as 'lb' | 'kg' })
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-1 py-1.5 text-sm text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="lb">lb</option>
                        <option value="kg">kg</option>
                      </select>
                      <button
                        onClick={() => toggleSetComplete(entry.id, set.id)}
                        className={`flex items-center justify-center rounded-lg p-1.5 ${
                          set.completed
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-slate-500 hover:bg-slate-800 hover:text-slate-100'
                        }`}
                        aria-label={set.completed ? 'Mark set incomplete' : 'Mark set complete and start rest timer'}
                        title={set.completed ? 'Completed' : 'Mark complete — starts rest timer'}
                      >
                        {set.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <button
                        onClick={() => removeSet(entry.id, set.id)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={() => addSet(entry.id)}
                  icon={<Plus size={14} />}
                >
                  Add Set
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!canSave} icon={<Check size={16} />}>
          Save Workout
        </Button>
      </div>
    </div>
  )
}
