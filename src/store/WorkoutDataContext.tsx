import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import type { Exercise, WorkoutSession } from '../types'
import { DEFAULT_EXERCISES } from '../lib/defaultExercises'
import { useLocalStorageState } from './useLocalStorageState'

interface WorkoutDataContextValue {
  exercises: Exercise[]
  sessions: WorkoutSession[]
  addExercise: (name: string, muscleGroup: Exercise['muscleGroup']) => Exercise
  deleteExercise: (id: string) => void
  addSession: (session: Omit<WorkoutSession, 'id'>) => WorkoutSession
  updateSession: (session: WorkoutSession) => void
  deleteSession: (id: string) => void
}

const WorkoutDataContext = createContext<WorkoutDataContextValue | null>(null)

export function WorkoutDataProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useLocalStorageState<Exercise[]>(
    'workout-tracker:exercises',
    DEFAULT_EXERCISES,
  )
  const [sessions, setSessions] = useLocalStorageState<WorkoutSession[]>(
    'workout-tracker:sessions',
    [],
  )

  const value = useMemo<WorkoutDataContextValue>(
    () => ({
      exercises,
      sessions,
      addExercise: (name, muscleGroup) => {
        const exercise: Exercise = { id: uuid(), name, muscleGroup, isCustom: true }
        setExercises((prev) => [...prev, exercise])
        return exercise
      },
      deleteExercise: (id) => {
        setExercises((prev) => prev.filter((e) => e.id !== id))
      },
      addSession: (session) => {
        const newSession: WorkoutSession = { ...session, id: uuid() }
        setSessions((prev) =>
          [...prev, newSession].sort((a, b) => b.date.localeCompare(a.date)),
        )
        return newSession
      },
      updateSession: (session) => {
        setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)))
      },
      deleteSession: (id) => {
        setSessions((prev) => prev.filter((s) => s.id !== id))
      },
    }),
    [exercises, sessions, setExercises, setSessions],
  )

  return <WorkoutDataContext.Provider value={value}>{children}</WorkoutDataContext.Provider>
}

export function useWorkoutData() {
  const ctx = useContext(WorkoutDataContext)
  if (!ctx) throw new Error('useWorkoutData must be used within WorkoutDataProvider')
  return ctx
}
