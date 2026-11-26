import type { Exercise } from '../types'

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'bench-press', name: 'Bench Press', muscleGroup: 'Chest', isCustom: false },
  { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', muscleGroup: 'Chest', isCustom: false },
  { id: 'push-up', name: 'Push-Up', muscleGroup: 'Chest', isCustom: false },
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'Back', isCustom: false },
  { id: 'pull-up', name: 'Pull-Up', muscleGroup: 'Back', isCustom: false },
  { id: 'barbell-row', name: 'Barbell Row', muscleGroup: 'Back', isCustom: false },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', isCustom: false },
  { id: 'squat', name: 'Back Squat', muscleGroup: 'Legs', isCustom: false },
  { id: 'leg-press', name: 'Leg Press', muscleGroup: 'Legs', isCustom: false },
  { id: 'lunge', name: 'Lunge', muscleGroup: 'Legs', isCustom: false },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscleGroup: 'Legs', isCustom: false },
  { id: 'overhead-press', name: 'Overhead Press', muscleGroup: 'Shoulders', isCustom: false },
  { id: 'lateral-raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', isCustom: false },
  { id: 'bicep-curl', name: 'Bicep Curl', muscleGroup: 'Arms', isCustom: false },
  { id: 'tricep-extension', name: 'Tricep Extension', muscleGroup: 'Arms', isCustom: false },
  { id: 'plank', name: 'Plank', muscleGroup: 'Core', isCustom: false },
  { id: 'crunch', name: 'Crunch', muscleGroup: 'Core', isCustom: false },
  { id: 'running', name: 'Running', muscleGroup: 'Cardio', isCustom: false },
  { id: 'cycling', name: 'Cycling', muscleGroup: 'Cardio', isCustom: false },
  { id: 'burpee', name: 'Burpee', muscleGroup: 'Full Body', isCustom: false },
]
