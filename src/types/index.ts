export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Legs'
  | 'Shoulders'
  | 'Arms'
  | 'Core'
  | 'Cardio'
  | 'Full Body'

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  isCustom: boolean
}

export interface SetEntry {
  id: string
  reps: number
  weight: number
  unit: 'lb' | 'kg'
}

export interface WorkoutExercise {
  id: string
  exerciseId: string
  sets: SetEntry[]
  notes?: string
}

export interface WorkoutSession {
  id: string
  date: string // ISO date string
  name: string
  exercises: WorkoutExercise[]
  durationMinutes?: number
  notes?: string
}
