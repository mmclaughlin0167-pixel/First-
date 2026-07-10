import {
  differenceInCalendarDays,
  differenceInYears,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  getISOWeek,
  getMonth,
  getQuarter,
  getYear,
  isSameDay,
  isSameWeek,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from 'date-fns'
import type { Exercise, MuscleGroup, WorkoutSession } from '../types'

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

export type ReportPeriod = 'week' | 'month' | 'quarter'

export function periodRange(period: ReportPeriod, reference = new Date()): { start: Date; end: Date } {
  switch (period) {
    case 'week':
      return {
        start: startOfWeek(reference, { weekStartsOn: 1 }),
        end: endOfWeek(reference, { weekStartsOn: 1 }),
      }
    case 'month':
      return { start: startOfMonth(reference), end: endOfMonth(reference) }
    case 'quarter':
      return { start: startOfQuarter(reference), end: endOfQuarter(reference) }
  }
}

export function periodKey(period: ReportPeriod, reference = new Date()): string {
  const year = getYear(reference)
  if (period === 'week') return `${year}-W${getISOWeek(reference)}`
  if (period === 'month') return `${year}-M${getMonth(reference) + 1}`
  return `${year}-Q${getQuarter(reference)}`
}

export interface PeriodStats {
  workoutCount: number
  totalWeight: number
  totalSets: number
  muscleGroupVolume: Partial<Record<MuscleGroup, number>>
}

export function statsForPeriod(
  sessions: WorkoutSession[],
  exercises: Exercise[],
  period: ReportPeriod,
  reference = new Date(),
): PeriodStats {
  const { start, end } = periodRange(period, reference)
  const exerciseById = Object.fromEntries(exercises.map((e) => [e.id, e]))
  const inRange = sessions.filter((s) => {
    const d = parseISO(s.date)
    return d >= start && d <= end
  })

  const muscleGroupVolume: Partial<Record<MuscleGroup, number>> = {}
  let totalWeight = 0
  let setsCount = 0

  for (const session of inRange) {
    for (const ex of session.exercises) {
      const muscleGroup = exerciseById[ex.exerciseId]?.muscleGroup
      const exVolume = ex.sets.reduce((sum, set) => sum + set.reps * set.weight, 0)
      totalWeight += exVolume
      setsCount += ex.sets.length
      if (muscleGroup) {
        muscleGroupVolume[muscleGroup] = (muscleGroupVolume[muscleGroup] ?? 0) + exVolume
      }
    }
  }

  return { workoutCount: inRange.length, totalWeight, totalSets: setsCount, muscleGroupVolume }
}
