import { differenceInCalendarDays, differenceInYears, isSameWeek, parseISO } from 'date-fns'
import type { WorkoutSession } from '../types'

export function calculateAge(birthDate: string, reference = new Date()): number {
  return differenceInYears(reference, parseISO(birthDate))
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
