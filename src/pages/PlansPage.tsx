import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { Plus, Trash2, Pencil, Play, X, Home, Dumbbell } from 'lucide-react'
import { useWorkoutData } from '../store/WorkoutDataContext'
import { Button, Card, EmptyState } from '../components/ui'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { matchesLocation, isPlanHomeFriendly, LOCATION_LABEL } from '../lib/equipment'
import type { DayOfWeek, TemplateExercise, WorkoutLocation } from '../types'

type PlanFilter = 'all' | WorkoutLocation

const DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const LOCATIONS: WorkoutLocation[] = ['home', 'gym']

type DraftEntry = TemplateExercise

function blankDraftEntry(exerciseId: string): DraftEntry {
  return { id: uuid(), exerciseId, targetSets: 3, targetReps: 10 }
}

export function PlansPage() {
  const { exercises, templates, addTemplate, updateTemplate, deleteTemplate, workoutLocation, setWorkoutLocation } =
    useWorkoutData()
  const navigate = useNavigate()

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [planName, setPlanName] = useState('')
  const [planDay, setPlanDay] = useState<DayOfWeek | ''>('')
  const [draftEntries, setDraftEntries] = useState<DraftEntry[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all')

  const exerciseById = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises])

  const availableExercises = useMemo(
    () => exercises.filter((ex) => matchesLocation(ex, workoutLocation)),
    [exercises, workoutLocation],
  )

  const effectiveSelectedExerciseId = availableExercises.some((ex) => ex.id === selectedExerciseId)
    ? selectedExerciseId
    : (availableExercises[0]?.id ?? '')

  const sortedPlans = useMemo(() => {
    const order = (d?: DayOfWeek) => (d ? DAYS.indexOf(d) : DAYS.length)
    return [...templates].sort((a, b) => order(a.dayOfWeek) - order(b.dayOfWeek))
  }, [templates])

  function planIsHome(plan: { exercises: TemplateExercise[] }): boolean {
    return isPlanHomeFriendly(
      plan.exercises.map((e) => e.exerciseId),
      exerciseById,
    )
  }

  const visiblePlans = useMemo(() => {
    if (planFilter === 'all') return sortedPlans
    return sortedPlans.filter((plan) => (planFilter === 'home' ? planIsHome(plan) : !planIsHome(plan)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedPlans, planFilter, exerciseById])

  function resetDraft() {
    setEditingPlanId(null)
    setPlanName('')
    setPlanDay('')
    setDraftEntries([])
  }

  function startEditingPlan(planId: string) {
    const plan = templates.find((t) => t.id === planId)
    if (!plan) return
    setEditingPlanId(plan.id)
    setPlanName(plan.name)
    setPlanDay(plan.dayOfWeek ?? '')
    setDraftEntries(plan.exercises)
  }

  function addExerciseToDraft() {
    if (!effectiveSelectedExerciseId) return
    if (draftEntries.some((e) => e.exerciseId === effectiveSelectedExerciseId)) return
    setDraftEntries((prev) => [...prev, blankDraftEntry(effectiveSelectedExerciseId)])
  }

  function removeDraftEntry(id: string) {
    setDraftEntries((prev) => prev.filter((e) => e.id !== id))
  }

  function updateDraftEntry(id: string, patch: Partial<TemplateExercise>) {
    setDraftEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function handleSavePlan() {
    const name = planName.trim()
    if (!name || draftEntries.length === 0) return
    if (editingPlanId) {
      updateTemplate({
        id: editingPlanId,
        name,
        dayOfWeek: planDay || undefined,
        exercises: draftEntries,
      })
    } else {
      addTemplate({ name, dayOfWeek: planDay || undefined, exercises: draftEntries })
    }
    resetDraft()
  }

  function handleStartWorkout(planId: string) {
    navigate(`/log?templateId=${planId}`)
  }

  const canSave = planName.trim().length > 0 && draftEntries.length > 0

  return (
    <div className="flex flex-col gap-6">
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this workout plan?"
        description="This removes the saved plan. Workouts you've already logged from it are not affected."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (pendingDeleteId) {
            deleteTemplate(pendingDeleteId)
            if (editingPlanId === pendingDeleteId) resetDraft()
          }
          setPendingDeleteId(null)
        }}
        onCancel={() => setPendingDeleteId(null)}
      />

      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Workout Plans</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Build out a weekly split — e.g. "Monday Chest Workout," "Wednesday Leg Workout" — and start
          logging from it in one tap.
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {editingPlanId ? 'Edit Plan' : 'New Plan'}
          </h3>
          {editingPlanId && (
            <button
              onClick={resetDraft}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <X size={14} /> Cancel edit
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Plan name
            </label>
            <input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. Monday Chest Workout"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Day (optional)
            </label>
            <select
              value={planDay}
              onChange={(e) => setPlanDay(e.target.value as DayOfWeek | '')}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 sm:w-44"
            >
              <option value="">No specific day</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Add exercise</label>
          <div className="flex gap-1 rounded-lg bg-slate-200 p-1 dark:bg-slate-800">
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setWorkoutLocation(loc)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            {availableExercises.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No exercises match {LOCATION_LABEL[workoutLocation]} equipment yet.
              </p>
            ) : (
              <select
                value={effectiveSelectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
              >
                {availableExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.muscleGroup})
                  </option>
                ))}
              </select>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={addExerciseToDraft}
            disabled={availableExercises.length === 0}
            icon={<Plus size={16} />}
          >
            Add to Plan
          </Button>
        </div>

        {draftEntries.length > 0 && (
          <div className="flex flex-col gap-2">
            {draftEntries.map((entry) => {
              const exercise = exerciseById[entry.exerciseId]
              return (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-950/60"
                >
                  <div className="min-w-[8rem] flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {exercise?.name ?? 'Unknown exercise'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{exercise?.muscleGroup}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <input
                      type="number"
                      min={1}
                      value={entry.targetSets}
                      onChange={(e) =>
                        updateDraftEntry(entry.id, { targetSets: Number(e.target.value) })
                      }
                      className="w-14 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                    sets
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <input
                      type="number"
                      min={1}
                      value={entry.targetReps ?? ''}
                      onChange={(e) =>
                        updateDraftEntry(entry.id, {
                          targetReps: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className="w-14 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                    reps
                  </div>
                  <button
                    onClick={() => removeDraftEntry(entry.id)}
                    className="rounded-lg p-1.5 text-slate-600 dark:text-slate-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSavePlan} disabled={!canSave} icon={<Plus size={16} />}>
            {editingPlanId ? 'Save Changes' : 'Save Plan'}
          </Button>
        </div>
      </Card>

      {sortedPlans.length === 0 ? (
        <EmptyState
          title="No workout plans yet"
          description="Create one above — name it, optionally pin it to a day of the week, and add the exercises you want."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Your Plans
            </h3>
            <div className="flex gap-1 rounded-lg bg-slate-200 p-1 dark:bg-slate-800">
              {(['all', 'home', 'gym'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setPlanFilter(f)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    planFilter === f
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-600 hover:bg-slate-300 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {f === 'home' && <Home size={14} />}
                  {f === 'gym' && <Dumbbell size={14} />}
                  {f === 'all' ? 'All' : LOCATION_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          {visiblePlans.length === 0 && (
            <EmptyState
              title={`No ${LOCATION_LABEL[planFilter as WorkoutLocation]} plans yet`}
              description={
                planFilter === 'home'
                  ? 'None of your saved plans are fully doable with just dumbbells, a band, a bench, or bodyweight. Switch to "All" to see everything, or build a new home-friendly plan above.'
                  : 'All of your saved plans are home-friendly. Switch to "All" to see everything.'
              }
            />
          )}

          {visiblePlans.map((plan) => (
            <Card key={plan.id}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{plan.name}</p>
                    {plan.dayOfWeek && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {plan.dayOfWeek}
                      </span>
                    )}
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        planIsHome(plan)
                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {planIsHome(plan) ? <Home size={11} /> : <Dumbbell size={11} />}
                      {planIsHome(plan) ? 'Home' : 'Gym'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {plan.exercises.length} exercise{plan.exercises.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    onClick={() => startEditingPlan(plan.id)}
                    icon={<Pencil size={14} />}
                  >
                    Edit
                  </Button>
                  <Button onClick={() => handleStartWorkout(plan.id)} icon={<Play size={14} />}>
                    Start
                  </Button>
                  <button
                    onClick={() => setPendingDeleteId(plan.id)}
                    className="rounded-lg p-2 text-slate-600 dark:text-slate-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {plan.exercises.map((e) => (
                  <span
                    key={e.id}
                    className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {exerciseById[e.exerciseId]?.name ?? 'Unknown'} — {e.targetSets}×
                    {e.targetReps ?? '?'}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
