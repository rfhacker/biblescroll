import { vi } from 'vitest'
import { getFavorites, toggleFavorite, isFavorite, getScore, addScore, getStreakState, setStreakState, getInstallSeed, getAnsweredPick, setAnsweredPick, getCommentarySource, setCommentarySource } from './store'

beforeEach(() => localStorage.clear())

test('favorites toggle on and off, deduped by kind+id', () => {
  const f = { kind: 'verse' as const, id: 'JHN 3:16', title: 'John 3:16', body: 'For God so loved…' }
  expect(getFavorites()).toEqual([])
  expect(toggleFavorite(f)).toBe(true)
  expect(toggleFavorite({ ...f })).toBe(false)
  expect(getFavorites()).toEqual([])
  toggleFavorite(f)
  expect(isFavorite('verse', 'JHN 3:16')).toBe(true)
  expect(isFavorite('verse', 'GEN 1:1')).toBe(false)
})

test('score accumulates and persists', () => {
  expect(getScore()).toBe(0)
  expect(addScore(1)).toBe(1)
  expect(addScore(1)).toBe(2)
  expect(getScore()).toBe(2)
})

test('streak state round-trips; corrupt data resets to null', async () => {
  expect(getStreakState()).toBeNull()
  setStreakState({ count: 3, last: '2026-07-09' })
  expect(getStreakState()).toEqual({ count: 3, last: '2026-07-09' })
  localStorage.setItem('bs:streak', '{not json')
  // A fresh module instance has no mem entry yet, so this exercises the real
  // "corrupt JSON already in localStorage" path instead of getting shadowed by
  // this test's own in-session mem write above (mem always wins over storage).
  vi.resetModules()
  const store = await import('./store')
  expect(store.getStreakState()).toBeNull()
})

test('answered trivia picks round-trip; corrupt data resets to null', async () => {
  expect(getAnsweredPick('t001')).toBeNull()
  setAnsweredPick('t001', 1)
  expect(getAnsweredPick('t001')).toBe(1)
  setAnsweredPick('t002', 0)
  expect(getAnsweredPick('t002')).toBe(0)
  expect(getAnsweredPick('t001')).toBe(1) // unaffected by other ids

  localStorage.setItem('bs:answered', '{not json')
  // Fresh module instance has no mem entry yet, exercising the real corrupt-storage path.
  vi.resetModules()
  const store = await import('./store')
  expect(store.getAnsweredPick('t001')).toBeNull()
})

test('install seed is stable once created', () => {
  const s = getInstallSeed()
  expect(s).toMatch(/^[0-9a-f]{16}$/)
  expect(getInstallSeed()).toBe(s)
})

// The tests below use `vi.resetModules()` + a fresh dynamic import to get a store
// instance with its own private `mem` Map. That keeps them independent of whatever
// the tests above already wrote into the module-level `mem` singleton, without
// needing any test-only reset export from store.ts.

test('setItem throwing does not hide writes from reads in the same session', async () => {
  vi.resetModules()
  const store = await import('./store')
  const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota exceeded')
  })
  try {
    expect(store.addScore(1)).toBe(1)
    expect(store.getScore()).toBe(1)

    const f = { kind: 'trivia' as const, id: 'quota-fav', title: 'Quota Fav', body: 'body' }
    expect(store.toggleFavorite(f)).toBe(true)
    expect(store.isFavorite('trivia', 'quota-fav')).toBe(true)
  } finally {
    setSpy.mockRestore()
  }
})

test('getItem and setItem both throwing: no crash, writes still round-trip via mem', async () => {
  vi.resetModules()
  const store = await import('./store')
  const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota exceeded')
  })
  const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('storage blocked')
  })
  try {
    expect(() => store.addScore(1)).not.toThrow()
    expect(store.getScore()).toBe(1)

    const f = { kind: 'fact' as const, id: 'both-broken-fav', title: 'Both Broken', body: 'body' }
    expect(() => store.toggleFavorite(f)).not.toThrow()
    expect(store.isFavorite('fact', 'both-broken-fav')).toBe(true)
  } finally {
    setSpy.mockRestore()
    getSpy.mockRestore()
  }
})

test('malformed favorites elements in storage are rejected, not partially trusted', async () => {
  localStorage.setItem('bs:favorites', JSON.stringify([1, { kind: 'x' }]))
  vi.resetModules()
  const store = await import('./store')
  expect(store.getFavorites()).toEqual([])
})

test('commentary source preference defaults, persists, and rejects garbage', async () => {
  vi.resetModules()
  const store = await import('./store')
  localStorage.clear()
  expect(store.getCommentarySource()).toBe('mhcc')
  store.setCommentarySource('jfb')
  expect(store.getCommentarySource()).toBe('jfb')

  // Test that invalid values in storage are rejected. Use a fresh module
  // instance so mem is empty and we read the invalid value from localStorage.
  localStorage.setItem('bs:commentary', '"latin-vulgate"')
  vi.resetModules()
  const store2 = await import('./store')
  expect(store2.getCommentarySource()).toBe('mhcc')
})

test('commentary source preference accepts mhc and round-trips', async () => {
  vi.resetModules()
  const store = await import('./store')
  localStorage.clear()
  store.setCommentarySource('mhc')
  expect(store.getCommentarySource()).toBe('mhc')

  // A fresh module instance reading the persisted value from localStorage.
  vi.resetModules()
  const store2 = await import('./store')
  expect(store2.getCommentarySource()).toBe('mhc')

  // Garbage still falls back to 'mhcc', not 'mhc'.
  localStorage.setItem('bs:commentary', '"latin-vulgate"')
  vi.resetModules()
  const store3 = await import('./store')
  expect(store3.getCommentarySource()).toBe('mhcc')
})

test('memorized ids round-trip and reject corrupt data', async () => {
  vi.resetModules()
  localStorage.clear()
  const s = await import('./store')
  expect(s.isMemorized('Psalms 23:1')).toBe(false)
  s.setMemorized('Psalms 23:1')
  expect(s.isMemorized('Psalms 23:1')).toBe(true)
  localStorage.setItem('bs:memorized', '{broken')
  vi.resetModules()
  const s2 = await import('./store')
  expect(s2.isMemorized('Psalms 23:1')).toBe(false)
})
