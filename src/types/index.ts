export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Legs'
  | 'Shoulders'
  | 'Arms'
  | 'Core'
  | 'Cardio'
  | 'Full Body'

export type Equipment =
  | 'bodyweight'
  | 'dumbbell'
  | 'band'
  | 'bench'
  | 'barbell'
  | 'kettlebell'
  | 'cable'
  | 'machine'
  | 'plate'
  | 'cardio-machine'
  | 'other'

export type WorkoutLocation = 'home' | 'gym'

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  isCustom: boolean
  equipment: Equipment[]
}

export interface SetEntry {
  id: string
  reps: number
  weight: number
  unit: 'lb' | 'kg'
  completed?: boolean
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

export interface TemplateExercise {
  id: string
  exerciseId: string
  targetSets: number
  targetReps?: number
}

export interface WorkoutTemplate {
  id: string
  name: string
  exercises: TemplateExercise[]
}

