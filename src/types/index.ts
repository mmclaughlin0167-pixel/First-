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

export interface BodyProfile {
  birthDate?: string // ISO date string
  height?: number
  heightUnit: 'cm' | 'in'
}

export interface BodyMeasurements {
  chest?: number
  waist?: number
  hips?: number
  biceps?: number
  thighs?: number
  calves?: number
  neck?: number
  shoulders?: number
}

export interface BodyLogEntry {
  id: string
  date: string // ISO date string
  weight?: number
  weightUnit: 'lb' | 'kg'
  measurementUnit: 'in' | 'cm'
  measurements: BodyMeasurements
}
