import type { Equipment, Exercise, WorkoutLocation } from '../types'

export const HOME_EQUIPMENT: Equipment[] = ['bodyweight', 'dumbbell', 'band', 'bench']

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  bodyweight: 'Bodyweight',
  dumbbell: 'Dumbbell',
  band: 'Band',
  bench: 'Bench',
  barbell: 'Barbell',
  kettlebell: 'Kettlebell',
  cable: 'Cable',
  machine: 'Machine',
  plate: 'Plate',
  'cardio-machine': 'Cardio Machine',
  other: 'Other',
}

export const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABEL) as Equipment[]

export const LOCATION_LABEL: Record<WorkoutLocation, string> = {
  home: 'Home',
  gym: 'Gym',
}

export function isHomeFriendly(exercise: Exercise): boolean {
  if (exercise.equipment.length === 0) return false
  return exercise.equipment.every((item) => HOME_EQUIPMENT.includes(item))
}

export function matchesLocation(exercise: Exercise, location: WorkoutLocation): boolean {
  return location === 'home' ? isHomeFriendly(exercise) : true
}

export function isPlanHomeFriendly(
  exerciseIds: string[],
  exerciseById: Record<string, Exercise | undefined>,
): boolean {
  if (exerciseIds.length === 0) return false
  return exerciseIds.every((id) => {
    const exercise = exerciseById[id]
    return exercise ? isHomeFriendly(exercise) : false
  })
}
