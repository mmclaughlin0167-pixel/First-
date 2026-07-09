import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useWorkoutData } from '../store/WorkoutDataContext'
import { Button, Card } from '../components/ui'
import type { MuscleGroup } from '../types'

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Cardio',
  'Full Body',
]

export function ExercisesPage() {
  const { exercises, addExercise, deleteExercise, sessions } = useWorkoutData()
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('Chest')
  const [filter, setFilter] = useState<MuscleGroup | 'All'>('All')

  const usedExerciseIds = useMemo(() => {
    const ids = new Set<string>()
    sessions.forEach((s) => s.exercises.forEach((e) => ids.add(e.exerciseId)))
    return ids
  }, [sessions])

  const filtered = exercises.filter((e) => filter === 'All' || e.muscleGroup === filter)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    addExercise(trimmed, muscleGroup)
    setName('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-100">Exercise Library</h2>
        <p className="text-sm text-slate-400">Manage the exercises you can log in your workouts.</p>
      </div>

      <Card>
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-400">Exercise name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cable Fly"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Muscle group</label>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 sm:w-44"
            >
              {MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" icon={<Plus size={16} />}>
            Add Exercise
          </Button>
        </form>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(['All', ...MUSCLE_GROUPS] as const).map((g) => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === g
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((exercise) => (
          <Card key={exercise.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-100">{exercise.name}</p>
              <p className="text-xs text-slate-400">{exercise.muscleGroup}</p>
            </div>
            {exercise.isCustom && (
              <button
                onClick={() => deleteExercise(exercise.id)}
                disabled={usedExerciseIds.has(exercise.id)}
                title={
                  usedExerciseIds.has(exercise.id)
                    ? 'Cannot delete — used in a logged workout'
                    : 'Delete exercise'
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Trash2 size={16} />
              </button>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
