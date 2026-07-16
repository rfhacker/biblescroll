import { SESSION_SEED } from './session'

test('session seed is a 16-hex string, stable within one module instance', async () => {
  expect(SESSION_SEED).toMatch(/^[0-9a-f]{16}$/)
  const again = await import('./session')
  expect(again.SESSION_SEED).toBe(SESSION_SEED)
})

test('a fresh app load (new module instance) gets a different seed', async () => {
  vi.resetModules()
  const fresh = await import('./session')
  expect(fresh.SESSION_SEED).toMatch(/^[0-9a-f]{16}$/)
  expect(fresh.SESSION_SEED).not.toBe(SESSION_SEED)
})
