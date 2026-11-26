import { describe, expect, it } from 'vitest'
import { format, subDays } from 'date-fns'
import {
  bmiCategory,
  calculateAge,
  calculateBMI,
  currentStreak,
  periodKey,
  periodRange,
  sessionsThisWeek,
  sessionsToday,
  statsForPeriod,
  totalSets,
  totalVolume,
  totalVolumeAllTime,
} from './stats'
import type { Exercise, SetEntry, WorkoutExercise, WorkoutSession } from '../types'

// Fixed reference date so tests are not sensitive to the real "today":
// Saturday, June 15 2024. Its Monday-start week runs Mon Jun 10 - Sun Jun 16.
const REFERENCE = new Date(2024, 5, 15, 12, 0, 0)

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function makeSet(reps: number, weight: number, overrides: Partial<SetEntry> = {}): SetEntry {
  return { id: `set-${Math.random()}`, reps, weight, unit: 'kg', ...overrides }
}

function makeExercise(
  exerciseId: string,
  sets: SetEntry[],
  overrides: Partial<WorkoutExercise> = {},
): WorkoutExercise {
  return { id: `we-${Math.random()}`, exerciseId, sets, ...overrides }
}

function makeSession(date: string, exercises: WorkoutExercise[] = [], overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return { id: `session-${Math.random()}`, date, name: 'Workout', exercises, ...overrides }
}

function makeExerciseDef(id: string, muscleGroup: Exercise['muscleGroup']): Exercise {
  return { id, name: id, muscleGroup, isCustom: false, equipment: ['other'] }
}

describe('calculateAge', () => {
  it('counts a full year on the exact birthday', () => {
    expect(calculateAge('2000-06-15', REFERENCE)).toBe(24)
  })

  it('has not incremented yet the day before the birthday', () => {
    expect(calculateAge('2000-06-16', REFERENCE)).toBe(23)
  })

  it('has already incremented the day after the birthday', () => {
    expect(calculateAge('2000-06-14', REFERENCE)).toBe(24)
  })

  it('returns 0 for a birth date within the reference year and before reference', () => {
    expect(calculateAge('2024-01-01', REFERENCE)).toBe(0)
  })
})

describe('calculateBMI', () => {
  it('computes BMI from weight in kg and height in cm', () => {
    expect(calculateBMI(70, 175)).toBeCloseTo(22.857142857, 6)
  })

  it('computes BMI for a different weight/height pair', () => {
    expect(calculateBMI(100, 200)).toBeCloseTo(25, 6)
  })

  it('handles small weights/heights without throwing', () => {
    expect(calculateBMI(1, 100)).toBeCloseTo(1, 6)
  })
})

describe('bmiCategory', () => {
  it('classifies values below 18.5 as Underweight', () => {
    expect(bmiCategory(10)).toBe('Underweight')
    expect(bmiCategory(18.49)).toBe('Underweight')
  })

  it('classifies 18.5 (inclusive boundary) as Normal', () => {
    expect(bmiCategory(18.5)).toBe('Normal')
  })

  it('classifies values just below 25 as Normal', () => {
    expect(bmiCategory(24.99)).toBe('Normal')
  })

  it('classifies 25 (inclusive boundary) as Overweight', () => {
    expect(bmiCategory(25)).toBe('Overweight')
  })

  it('classifies values just below 30 as Overweight', () => {
    expect(bmiCategory(29.99)).toBe('Overweight')
  })

  it('classifies 30 (inclusive boundary) as Obese', () => {
    expect(bmiCategory(30)).toBe('Obese')
  })

  it('classifies large values as Obese', () => {
    expect(bmiCategory(45)).toBe('Obese')
  })
})

describe('totalVolume', () => {
  it('sums reps * weight across all sets of all exercises', () => {
    const session = makeSession(iso(REFERENCE), [
      makeExercise('ex1', [makeSet(10, 100), makeSet(8, 100)]),
      makeExercise('ex2', [makeSet(5, 50)]),
    ])
    // (10*100 + 8*100) + (5*50) = 1800 + 250 = 2050
    expect(totalVolume(session)).toBe(2050)
  })

  it('returns 0 for a session with no exercises', () => {
    const session = makeSession(iso(REFERENCE), [])
    expect(totalVolume(session)).toBe(0)
  })

  it('returns 0 for an exercise with no sets', () => {
    const session = makeSession(iso(REFERENCE), [makeExercise('ex1', [])])
    expect(totalVolume(session)).toBe(0)
  })

  it('ignores sets with zero weight or zero reps', () => {
    const session = makeSession(iso(REFERENCE), [makeExercise('ex1', [makeSet(0, 100), makeSet(10, 0)])])
    expect(totalVolume(session)).toBe(0)
  })
})

describe('totalSets', () => {
  it('counts sets across all exercises', () => {
    const session = makeSession(iso(REFERENCE), [
      makeExercise('ex1', [makeSet(10, 100), makeSet(8, 100)]),
      makeExercise('ex2', [makeSet(5, 50)]),
    ])
    expect(totalSets(session)).toBe(3)
  })

  it('returns 0 for a session with no exercises', () => {
    expect(totalSets(makeSession(iso(REFERENCE), []))).toBe(0)
  })

  it('returns 0 when exercises have empty set arrays', () => {
    expect(totalSets(makeSession(iso(REFERENCE), [makeExercise('ex1', [])]))).toBe(0)
  })
})

describe('sessionsThisWeek', () => {
  it('includes a session on the Monday that starts the week', () => {
    const monday = new Date(2024, 5, 10)
    const session = makeSession(iso(monday))
    expect(sessionsThisWeek([session], REFERENCE)).toEqual([session])
  })

  it('includes a session on the Sunday that ends the week', () => {
    const sunday = new Date(2024, 5, 16)
    const session = makeSession(iso(sunday))
    expect(sessionsThisWeek([session], REFERENCE)).toEqual([session])
  })

  it('excludes a session from the following week', () => {
    const nextMonday = new Date(2024, 5, 17)
    const session = makeSession(iso(nextMonday))
    expect(sessionsThisWeek([session], REFERENCE)).toEqual([])
  })

  it('excludes a session from the previous week', () => {
    const prevSunday = new Date(2024, 5, 9)
    const session = makeSession(iso(prevSunday))
    expect(sessionsThisWeek([session], REFERENCE)).toEqual([])
  })

  it('returns an empty array when given no sessions', () => {
    expect(sessionsThisWeek([], REFERENCE)).toEqual([])
  })

  it('filters a mixed list down to only this week', () => {
    const inWeek = makeSession(iso(new Date(2024, 5, 12)))
    const outOfWeek = makeSession(iso(new Date(2024, 5, 20)))
    expect(sessionsThisWeek([inWeek, outOfWeek], REFERENCE)).toEqual([inWeek])
  })
})

describe('sessionsToday', () => {
  it('includes a session dated on the reference day', () => {
    const session = makeSession(iso(REFERENCE))
    expect(sessionsToday([session], REFERENCE)).toEqual([session])
  })

  it('excludes a session dated the day before', () => {
    const session = makeSession(iso(subDays(REFERENCE, 1)))
    expect(sessionsToday([session], REFERENCE)).toEqual([])
  })

  it('excludes a session dated the day after', () => {
    const session = makeSession(iso(new Date(2024, 5, 16)))
    expect(sessionsToday([session], REFERENCE)).toEqual([])
  })

  it('returns an empty array when given no sessions', () => {
    expect(sessionsToday([], REFERENCE)).toEqual([])
  })
})

describe('totalVolumeAllTime', () => {
  it('sums volume across every session', () => {
    const s1 = makeSession(iso(REFERENCE), [makeExercise('ex1', [makeSet(10, 100)])]) // 1000
    const s2 = makeSession(iso(subDays(REFERENCE, 1)), [makeExercise('ex2', [makeSet(5, 50)])]) // 250
    expect(totalVolumeAllTime([s1, s2])).toBe(1250)
  })

  it('returns 0 for an empty sessions array', () => {
    expect(totalVolumeAllTime([])).toBe(0)
  })

  it('returns 0 when sessions have no logged sets', () => {
    expect(totalVolumeAllTime([makeSession(iso(REFERENCE), [])])).toBe(0)
  })
})

describe('currentStreak', () => {
  it('returns 0 for an empty sessions array', () => {
    expect(currentStreak([], REFERENCE)).toBe(0)
  })

  it('returns 1 for a single session today', () => {
    const session = makeSession(iso(REFERENCE))
    expect(currentStreak([session], REFERENCE)).toBe(1)
  })

  it('returns 2 for sessions today and yesterday', () => {
    const sessions = [makeSession(iso(REFERENCE)), makeSession(iso(subDays(REFERENCE, 1)))]
    expect(currentStreak(sessions, REFERENCE)).toBe(2)
  })

  it('returns 3 for three consecutive days ending today', () => {
    const sessions = [
      makeSession(iso(REFERENCE)),
      makeSession(iso(subDays(REFERENCE, 1))),
      makeSession(iso(subDays(REFERENCE, 2))),
    ]
    expect(currentStreak(sessions, REFERENCE)).toBe(3)
  })

  it('stops the streak at a gap of more than one day', () => {
    // Today's session plus one 3 days ago, with yesterday and 2-days-ago missing.
    const sessions = [makeSession(iso(REFERENCE)), makeSession(iso(subDays(REFERENCE, 3)))]
    expect(currentStreak(sessions, REFERENCE)).toBe(1)
  })

  it('still counts a streak that starts yesterday (no session today yet)', () => {
    const sessions = [makeSession(iso(subDays(REFERENCE, 1))), makeSession(iso(subDays(REFERENCE, 2)))]
    expect(currentStreak(sessions, REFERENCE)).toBe(2)
  })

  it('returns 0 when the most recent session is more than a day old', () => {
    const sessions = [makeSession(iso(subDays(REFERENCE, 2)))]
    expect(currentStreak(sessions, REFERENCE)).toBe(0)
  })

  it('deduplicates multiple sessions logged on the same day', () => {
    const sessions = [makeSession(iso(REFERENCE)), makeSession(iso(REFERENCE))]
    expect(currentStreak(sessions, REFERENCE)).toBe(1)
  })

  it('is independent of the input order of sessions', () => {
    const sessions = [
      makeSession(iso(subDays(REFERENCE, 2))),
      makeSession(iso(REFERENCE)),
      makeSession(iso(subDays(REFERENCE, 1))),
    ]
    expect(currentStreak(sessions, REFERENCE)).toBe(3)
  })
})

describe('periodRange', () => {
  it('returns the Monday-start / Sunday-end range for "week"', () => {
    const { start, end } = periodRange('week', REFERENCE)
    expect(start.getDay()).toBe(1) // Monday
    expect(start.getDate()).toBe(10)
    expect(start.getMonth()).toBe(5) // June
    expect(end.getDay()).toBe(0) // Sunday
    expect(end.getDate()).toBe(16)
  })

  it('returns the full calendar month for "month"', () => {
    const { start, end } = periodRange('month', REFERENCE)
    expect(start.getDate()).toBe(1)
    expect(start.getMonth()).toBe(5)
    expect(end.getMonth()).toBe(5)
    expect(end.getDate()).toBe(30) // June has 30 days
  })

  it('returns the full quarter for "quarter" (Q2 = Apr-Jun)', () => {
    const { start, end } = periodRange('quarter', REFERENCE)
    expect(start.getMonth()).toBe(3) // April
    expect(start.getDate()).toBe(1)
    expect(end.getMonth()).toBe(5) // June
    expect(end.getDate()).toBe(30)
  })
})

describe('periodKey', () => {
  it('formats a week key as YYYY-W<isoWeek>', () => {
    expect(periodKey('week', REFERENCE)).toBe('2024-W24')
  })

  it('formats a month key as YYYY-M<month>', () => {
    expect(periodKey('month', REFERENCE)).toBe('2024-M6')
  })

  it('formats a quarter key as YYYY-Q<quarter>', () => {
    expect(periodKey('quarter', REFERENCE)).toBe('2024-Q2')
  })

  it('uses the calendar year even when the ISO week belongs to the prior week-year', () => {
    // Jan 1 2023 is a Sunday, which ISO-8601 places in week 52 of the *previous*
    // week-year (2022). periodKey still tags it with the calendar year (2023),
    // so this documents that known quirk of the current implementation.
    const jan1 = new Date(2023, 0, 1, 12, 0, 0)
    expect(periodKey('week', jan1)).toBe('2023-W52')
  })
});

describe('statsForPeriod', () => {
  const chestExercise = makeExerciseDef('bench', 'Chest')
  const legsExercise = makeExerciseDef('squat', 'Legs')
  const exercises: Exercise[] = [chestExercise, legsExercise]

  it('aggregates workout count, weight, sets and muscle-group volume for sessions in range', () => {
    const inMonth1 = makeSession(iso(new Date(2024, 5, 5)), [
      makeExercise('bench', [makeSet(10, 100), makeSet(8, 100)]), // 1800, chest
    ])
    const inMonth2 = makeSession(iso(new Date(2024, 5, 20)), [
      makeExercise('squat', [makeSet(5, 200)]), // 1000, legs
      makeExercise('bench', [makeSet(10, 50)]), // 500, chest
    ])
    const outsideMonth = makeSession(iso(new Date(2024, 6, 5)), [
      makeExercise('bench', [makeSet(10, 1000)]),
    ])

    const result = statsForPeriod([inMonth1, inMonth2, outsideMonth], exercises, 'month', REFERENCE)

    expect(result.workoutCount).toBe(2)
    expect(result.totalWeight).toBe(3300) // 1800 + 1000 + 500
    expect(result.totalSets).toBe(4)
    expect(result.muscleGroupVolume).toEqual({ Chest: 2300, Legs: 1000 })
  })

  it('counts volume/sets for an exercise missing from the exercise list, without attributing a muscle group', () => {
    const session = makeSession(iso(new Date(2024, 5, 10)), [
      makeExercise('unknown-exercise', [makeSet(10, 20)]), // 200
    ])
    const result = statsForPeriod([session], exercises, 'month', REFERENCE)

    expect(result.workoutCount).toBe(1)
    expect(result.totalWeight).toBe(200)
    expect(result.totalSets).toBe(1)
    expect(result.muscleGroupVolume).toEqual({})
  })

  it('returns all-zero stats when no sessions fall in the period', () => {
    const outsideMonth = makeSession(iso(new Date(2024, 6, 5)), [
      makeExercise('bench', [makeSet(10, 100)]),
    ])
    const result = statsForPeriod([outsideMonth], exercises, 'month', REFERENCE)

    expect(result).toEqual({ workoutCount: 0, totalWeight: 0, totalSets: 0, muscleGroupVolume: {} })
  })

  it('returns all-zero stats for an empty sessions array', () => {
    const result = statsForPeriod([], exercises, 'month', REFERENCE)
    expect(result).toEqual({ workoutCount: 0, totalWeight: 0, totalSets: 0, muscleGroupVolume: {} })
  })

  it('counts an in-range session with no exercises toward workoutCount only', () => {
    const emptySession = makeSession(iso(new Date(2024, 5, 10)), [])
    const result = statsForPeriod([emptySession], exercises, 'month', REFERENCE)
    expect(result).toEqual({ workoutCount: 1, totalWeight: 0, totalSets: 0, muscleGroupVolume: {} })
  })
})
