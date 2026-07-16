import { getSessionSeed, regenerateSessionSeed, randomSeed, RESUME_SESSION_MS } from './session'

test('session seed is a 16-hex string, stable until regenerated', () => {
  const a = getSessionSeed()
  expect(a).toMatch(/^[0-9a-f]{16}$/)
  expect(getSessionSeed()).toBe(a)
})

test('regenerateSessionSeed swaps in a new seed', () => {
  const before = getSessionSeed()
  const next = regenerateSessionSeed()
  expect(next).toMatch(/^[0-9a-f]{16}$/)
  expect(next).not.toBe(before)
  expect(getSessionSeed()).toBe(next)
})

test('randomSeed produces distinct values; resume threshold is 30 minutes', () => {
  expect(randomSeed()).not.toBe(randomSeed())
  expect(RESUME_SESSION_MS).toBe(30 * 60 * 1000)
})
