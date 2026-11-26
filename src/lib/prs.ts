import type { SetEntry, WorkoutSession } from '../types'
import { toKg } from './units'

export function estimatedOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg
  return weightKg * (1 + reps / 30)
}

export interface PersonalRecord {
  maxWeightKg: number
  maxWeightDate: string
  maxVolumeSetKg: number
  maxVolumeSetDate: string
  estimated1RMKg: number
  estimated1RMDate: string
}

export function getPersonalRecords(
  sessions: WorkoutSession[],
  exerciseId: string,
): PersonalRecord | null {
  let record: PersonalRecord | null = null

  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      for (const set of ex.sets) {
        if (set.reps <= 0 || set.weight <= 0) continue
        const weightKg = toKg(set.weight, set.unit)
        const volumeKg = weightKg * set.reps
        const oneRmKg = estimatedOneRepMax(weightKg, set.reps)

        if (!record) {
          record = {
            maxWeightKg: weightKg,
            maxWeightDate: session.date,
            maxVolumeSetKg: volumeKg,
            maxVolumeSetDate: session.date,
            estimated1RMKg: oneRmKg,
            estimated1RMDate: session.date,
          }
          continue
        }

        if (weightKg > record.maxWeightKg) {
          record.maxWeightKg = weightKg
          record.maxWeightDate = session.date
        }
        if (volumeKg > record.maxVolumeSetKg) {
          record.maxVolumeSetKg = volumeKg
          record.maxVolumeSetDate = session.date
        }
        if (oneRmKg > record.estimated1RMKg) {
          record.estimated1RMKg = oneRmKg
          record.estimated1RMDate = session.date
        }
      }
    }
  }

  return record
}

export interface PRCheckResult {
  isWeightPR: boolean
  isVolumePR: boolean
  isEstimated1RMPR: boolean
}

const NO_PR: PRCheckResult = { isWeightPR: false, isVolumePR: false, isEstimated1RMPR: false }

/**
 * Compares a just-logged set against the athlete's prior history for that
 * exercise. A brand-new exercise with no prior sets returns no PR flags —
 * there's nothing yet to have beaten.
 */
export function checkForNewPR(
  priorSessions: WorkoutSession[],
  exerciseId: string,
  set: SetEntry,
): PRCheckResult {
  if (set.reps <= 0 || set.weight <= 0) return NO_PR

  const existing = getPersonalRecords(priorSessions, exerciseId)
  if (!existing) return NO_PR

  const weightKg = toKg(set.weight, set.unit)
  const volumeKg = weightKg * set.reps
  const oneRmKg = estimatedOneRepMax(weightKg, set.reps)

  return {
    isWeightPR: weightKg > existing.maxWeightKg,
    isVolumePR: volumeKg > existing.maxVolumeSetKg,
    isEstimated1RMPR: oneRmKg > existing.estimated1RMKg,
  }
}
