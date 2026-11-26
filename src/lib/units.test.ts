import { describe, expect, it } from 'vitest'
import { toKg, toCm, toIn } from './units'

const LB_PER_KG = 2.2046226218
const IN_PER_CM = 0.3937007874

describe('toKg', () => {
  it('returns the same value when unit is already kg (identity conversion)', () => {
    expect(toKg(10, 'kg')).toBe(10)
    expect(toKg(0, 'kg')).toBe(0)
    expect(toKg(82.5, 'kg')).toBe(82.5)
  })

  it('converts pounds to kilograms', () => {
    expect(toKg(10, 'lb')).toBeCloseTo(10 / LB_PER_KG, 10)
    expect(toKg(1, 'lb')).toBeCloseTo(0.45359237, 8)
    expect(toKg(220.462262, 'lb')).toBeCloseTo(100, 5)
  })

  it('converts zero pounds to zero kilograms', () => {
    expect(toKg(0, 'lb')).toBe(0)
  })
})

describe('toCm', () => {
  it('returns the same value when unit is already cm (identity conversion)', () => {
    expect(toCm(10, 'cm')).toBe(10)
    expect(toCm(0, 'cm')).toBe(0)
    expect(toCm(175, 'cm')).toBe(175)
  })

  it('converts inches to centimeters', () => {
    expect(toCm(10, 'in')).toBeCloseTo(10 / IN_PER_CM, 10)
    expect(toCm(1, 'in')).toBeCloseTo(2.54, 6)
    expect(toCm(12, 'in')).toBeCloseTo(30.48, 5)
  })

  it('converts zero inches to zero centimeters', () => {
    expect(toCm(0, 'in')).toBe(0)
  })
})

describe('toIn', () => {
  it('returns the same value when unit is already in (identity conversion)', () => {
    expect(toIn(10, 'in')).toBe(10)
    expect(toIn(0, 'in')).toBe(0)
    expect(toIn(70, 'in')).toBe(70)
  })

  it('converts centimeters to inches', () => {
    expect(toIn(10, 'cm')).toBeCloseTo(10 * IN_PER_CM, 10)
    expect(toIn(2.54, 'cm')).toBeCloseTo(1, 6)
    expect(toIn(30.48, 'cm')).toBeCloseTo(12, 5)
  })

  it('converts zero centimeters to zero inches', () => {
    expect(toIn(0, 'cm')).toBe(0)
  })
})

describe('round-trip conversions', () => {
  it('toKg and back is approximately identity for lb', () => {
    const original = 165
    const kg = toKg(original, 'lb')
    const backToLb = kg * LB_PER_KG
    expect(backToLb).toBeCloseTo(original, 6)
  })

  it('toCm and toIn are inverses of each other', () => {
    const original = 68
    const cm = toCm(original, 'in')
    const backToIn = toIn(cm, 'cm')
    expect(backToIn).toBeCloseTo(original, 6)
  })
})
