import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import type {
  BodyLogEntry,
  BodyProfile,
  Equipment,
  Exercise,
  WorkoutLocation,
  WorkoutSession,
  WorkoutTemplate,
} from '../types'
import { DEFAULT_EXERCISES } from '../lib/defaultExercises'
import { useLocalStorageState } from './useLocalStorageState'

const DEFAULT_PROFILE: BodyProfile = { heightUnit: 'in' }

export interface BackupData {
  version: 1
  exportedAt: string
  exercises: Exercise[]
  sessions: WorkoutSession[]
  profile: BodyProfile
  bodyLogs: BodyLogEntry[]
  templates: WorkoutTemplate[]
}

interface WorkoutDataContextValue {
  exercises: Exercise[]
  sessions: WorkoutSession[]
  addExercise: (name: string, muscleGroup: Exercise['muscleGroup'], equipment: Equipment[]) => Exercise
  deleteExercise: (id: string) => void
  workoutLocation: WorkoutLocation
  setWorkoutLocation: (location: WorkoutLocation) => void
  addSession: (session: Omit<WorkoutSession, 'id'>) => WorkoutSession
  updateSession: (session: WorkoutSession) => void
  deleteSession: (id: string) => void
  profile: BodyProfile
  updateProfile: (profile: BodyProfile) => void
  bodyLogs: BodyLogEntry[]
  addBodyLog: (entry: Omit<BodyLogEntry, 'id'>) => BodyLogEntry
  deleteBodyLog: (id: string) => void
  templates: WorkoutTemplate[]
  addTemplate: (template: Omit<WorkoutTemplate, 'id'>) => WorkoutTemplate
  updateTemplate: (template: WorkoutTemplate) => void
  deleteTemplate: (id: string) => void
  exportAllData: () => BackupData
  importAllData: (data: BackupData) => void
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
  const [profile, setProfile] = useLocalStorageState<BodyProfile>(
    'workout-tracker:profile',
    DEFAULT_PROFILE,
  )
  const [bodyLogs, setBodyLogs] = useLocalStorageState<BodyLogEntry[]>(
    'workout-tracker:body-logs',
    [],
  )
  const [templates, setTemplates] = useLocalStorageState<WorkoutTemplate[]>(
    'workout-tracker:templates',
    [],
  )
  const [workoutLocation, setWorkoutLocation] = useLocalStorageState<WorkoutLocation>(
    'workout-tracker:location',
    'gym',
  )

  useEffect(() => {
    setExercises((prev) => {
      const byName = new Map(DEFAULT_EXERCISES.map((e) => [e.name.toLowerCase(), e]))
      const existingNames = new Set(prev.map((e) => e.name.toLowerCase()))
      const missing = DEFAULT_EXERCISES.filter((e) => !existingNames.has(e.name.toLowerCase()))
      const backfilled = prev.map((e) =>
        e.equipment && e.equipment.length > 0
          ? e
          : { ...e, equipment: byName.get(e.name.toLowerCase())?.equipment ?? (['other'] as Equipment[]) },
      )
      return missing.length === 0 ? backfilled : [...backfilled, ...missing]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<WorkoutDataContextValue>(
    () => ({
      exercises,
      sessions,
      addExercise: (name, muscleGroup, equipment) => {
        const exercise: Exercise = { id: uuid(), name, muscleGroup, isCustom: true, equipment }
        setExercises((prev) => [...prev, exercise])
        return exercise
      },
      deleteExercise: (id) => {
        setExercises((prev) => prev.filter((e) => e.id !== id))
      },
      workoutLocation,
      setWorkoutLocation: (location) => setWorkoutLocation(location),
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
      profile,
      updateProfile: (next) => setProfile(next),
      bodyLogs,
      addBodyLog: (entry) => {
        const newEntry: BodyLogEntry = { ...entry, id: uuid() }
        setBodyLogs((prev) =>
          [...prev, newEntry].sort((a, b) => b.date.localeCompare(a.date)),
        )
        return newEntry
      },
      deleteBodyLog: (id) => {
        setBodyLogs((prev) => prev.filter((e) => e.id !== id))
      },
      templates,
      addTemplate: (template) => {
        const newTemplate: WorkoutTemplate = { ...template, id: uuid() }
        setTemplates((prev) => [...prev, newTemplate])
        return newTemplate
      },
      updateTemplate: (template) => {
        setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)))
      },
      deleteTemplate: (id) => {
        setTemplates((prev) => prev.filter((t) => t.id !== id))
      },
      exportAllData: () => ({
        version: 1,
        exportedAt: new Date().toISOString(),
        exercises,
        sessions,
        profile,
        bodyLogs,
        templates,
      }),
      importAllData: (data) => {
        setExercises(data.exercises)
        setSessions(data.sessions)
        setProfile(data.profile)
        setBodyLogs(data.bodyLogs)
        setTemplates(data.templates)
      },
    }),
    [
      exercises,
      sessions,
      setExercises,
      setSessions,
      profile,
      setProfile,
      bodyLogs,
      setBodyLogs,
      templates,
      setTemplates,
      workoutLocation,
      setWorkoutLocation,
    ],
  )

  return <WorkoutDataContext.Provider value={value}>{children}</WorkoutDataContext.Provider>
}

export function useWorkoutData() {
  const ctx = useContext(WorkoutDataContext)
  if (!ctx) throw new Error('useWorkoutData must be used within WorkoutDataProvider')
  return ctx
}
