import { useMemo, useState } from 'react'
import { Plus, Trash2, Home, Dumbbell } from 'lucide-react'
import { useWorkoutData } from '../store/WorkoutDataContext'
import { Button, Card } from '../components/ui'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EQUIPMENT_LABEL, EQUIPMENT_OPTIONS, LOCATION_LABEL, matchesLocation } from '../lib/equipment'
import type { Equipment, Exercise, MuscleGroup, WorkoutLocation } from '../types'

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

const LOCATIONS: WorkoutLocation[] = ['home', 'gym']

export function ExercisesPage() {
  const { exercises, addExercise, deleteExercise, sessions, workoutLocation, setWorkoutLocation } =
    useWorkoutData()
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('Chest')
  const [newEquipment, setNewEquipment] = useState<Equipment[]>(['bodyweight'])
  const [filter, setFilter] = useState<MuscleGroup | 'All'>('All')
  const [pendingDelete, setPendingDelete] = useState<Exercise | null>(null)

  const usedExerciseIds = useMemo(() => {
    const ids = new Set<string>()
    sessions.forEach((s) => s.exercises.forEach((e) => ids.add(e.exerciseId)))
    return ids
  }, [sessions])

  const filtered = exercises.filter(
    (e) => (filter === 'All' || e.muscleGroup === filter) && matchesLocation(e, workoutLocation),
  )

  function toggleNewEquipment(item: Equipment) {
    setNewEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item],
    )
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || newEquipment.length === 0) return
    addExercise(trimmed, muscleGroup, newEquipment)
    setName('')
    setNewEquipment(['bodyweight'])
  }

  return (
    <div className="flex flex-col gap-6">
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this exercise?"
        description={`"${pendingDelete?.name}" will be removed from your exercise library. This can't be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (pendingDelete) deleteExercise(pendingDelete.id)
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Exercise Library</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage the exercises you can log in your workouts.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-200 p-1 dark:bg-slate-800">
          {LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setWorkoutLocation(loc)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                workoutLocation === loc
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-600 hover:bg-slate-300 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {loc === 'home' ? <Home size={14} /> : <Dumbbell size={14} />}
              {LOCATION_LABEL[loc]}
            </button>
          ))}
        </div>
      </div>

      {workoutLocation === 'home' && (
        <p className="-mt-3 text-xs text-slate-500 dark:text-slate-400">
          Showing exercises that only need dumbbells, a resistance band, an adjustable bench, or your
          bodyweight.
        </p>
      )}

      <Card>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Exercise name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cable Fly"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Muscle group</label>
              <select
                value={muscleGroup}
                onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 sm:w-44"
              >
                {MUSCLE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={newEquipment.length === 0} icon={<Plus size={16} />}>
              Add Exercise
            </Button>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Equipment needed
            </label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleNewEquipment(item)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    newEquipment.includes(item)
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {EQUIPMENT_LABEL[item]}
                </button>
              ))}
            </div>
          </div>
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
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
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
              <p className="font-medium text-slate-900 dark:text-slate-100">{exercise.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{exercise.muscleGroup}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {exercise.equipment.map((item) => (
                  <span
                    key={item}
                    className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  >
                    {EQUIPMENT_LABEL[item]}
                  </span>
                ))}
              </div>
            </div>
            {exercise.isCustom && (
              <button
                onClick={() => setPendingDelete(exercise)}
                disabled={usedExerciseIds.has(exercise.id)}
                title={
                  usedExerciseIds.has(exercise.id)
                    ? 'Cannot delete — used in a logged workout'
                    : 'Delete exercise'
                }
                className="rounded-lg p-2 text-slate-600 dark:text-slate-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Trash2 size={16} />
              </button>
            )}
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="col-span-full text-center text-sm text-slate-500 dark:text-slate-400">
            No exercises match this filter.
          </Card>
        )}
      </div>
    </div>
  )
}
