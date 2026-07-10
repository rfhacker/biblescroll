import { updateStreak, daysBetween, scoreTitle } from './streak'

test('daysBetween handles month/year rollovers', () => {
  expect(daysBetween('2026-07-09', '2026-07-10')).toBe(1)
  expect(daysBetween('2026-07-31', '2026-08-01')).toBe(1)
  expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
  expect(daysBetween('2026-07-09', '2026-07-09')).toBe(0)
})

test('first visit starts streak at 1', () => {
  expect(updateStreak(null, '2026-07-09')).toEqual({ count: 1, last: '2026-07-09' })
})

test('same-day repeat visits do not change the streak', () => {
  expect(updateStreak({ count: 4, last: '2026-07-09' }, '2026-07-09')).toEqual({ count: 4, last: '2026-07-09' })
})

test('next-day visit increments', () => {
  expect(updateStreak({ count: 4, last: '2026-07-09' }, '2026-07-10')).toEqual({ count: 5, last: '2026-07-10' })
})

test('missed day resets to 1', () => {
  expect(updateStreak({ count: 9, last: '2026-07-07' }, '2026-07-09')).toEqual({ count: 1, last: '2026-07-09' })
})

test('score titles', () => {
  expect(scoreTitle(0)).toBe('Seeker')
  expect(scoreTitle(9)).toBe('Seeker')
  expect(scoreTitle(10)).toBe('Student')
  expect(scoreTitle(50)).toBe('Scholar')
  expect(scoreTitle(150)).toBe('Berean')
})
