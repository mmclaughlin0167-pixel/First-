import { differenceInCalendarDays, differenceInYears, isSameDay, isSameWeek, parseISO } from 'date-fns'
import type { WorkoutSession } from '../types'

export function calculateAge(birthDate: string, reference = new Date()): number {
  return differenceInYears(reference, parseISO(birthDate))
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

export function bmiCategory(bmi: number): 'Underweight' | 'Normal' | 'Overweight' | 'Obese' {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Overweight'
  return 'Obese'
}

export function totalVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0),
    0,
  )
}

export function totalSets(session: WorkoutSession): number {
  return session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
}

export function sessionsThisWeek(sessions: WorkoutSession[], reference = new Date()): WorkoutSession[] {
  return sessions.filter((s) => isSameWeek(parseISO(s.date), reference, { weekStartsOn: 1 }))
}

export function sessionsToday(sessions: WorkoutSession[], reference = new Date()): WorkoutSession[] {
  return sessions.filter((s) => isSameDay(parseISO(s.date), reference))
}

export function totalVolumeAllTime(sessions: WorkoutSession[]): number {
  return sessions.reduce((sum, s) => sum + totalVolume(s), 0)
}

export function currentStreak(sessions: WorkoutSession[], reference = new Date()): number {
  if (sessions.length === 0) return 0
  const uniqueDays = Array.from(
    new Set(sessions.map((s) => parseISO(s.date).toDateString())),
  )
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())

  let streak = 0
  let cursor = reference
  for (const day of uniqueDays) {
    const gap = differenceInCalendarDays(cursor, day)
    if (gap === 0 || gap === 1) {
      streak += 1
      cursor = day
    } else if (gap > 1) {
      break
    }
  }
  return streak
}
