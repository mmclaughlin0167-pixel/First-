import { describe, expect, it } from 'vitest'
import { formatDuration } from './time'

describe('formatDuration', () => {
  it('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('00:00')
  })

  it('formats a sub-minute duration', () => {
    expect(formatDuration(5)).toBe('00:05')
    expect(formatDuration(45)).toBe('00:45')
    expect(formatDuration(59)).toBe('00:59')
  })

  it('formats an exact-minute duration', () => {
    expect(formatDuration(60)).toBe('01:00')
    expect(formatDuration(120)).toBe('02:00')
    expect(formatDuration(600)).toBe('10:00')
  })

  it('formats a duration with minutes and seconds', () => {
    expect(formatDuration(90)).toBe('01:30')
    expect(formatDuration(125)).toBe('02:05')
  })

  it('formats a duration of exactly one hour', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
  })

  it('formats a duration over an hour, including hours/minutes/seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
    expect(formatDuration(7325)).toBe('2:02:05')
  })

  it('pads minutes and seconds under 10 with a leading zero once hours are shown', () => {
    expect(formatDuration(3605)).toBe('1:00:05')
    expect(formatDuration(3665)).toBe('1:01:05')
  })

  it('does not pad the hours component itself', () => {
    expect(formatDuration(36000)).toBe('10:00:00')
  })
})
