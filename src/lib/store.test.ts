import { getFavorites, toggleFavorite, isFavorite, getScore, addScore, getStreakState, setStreakState, getInstallSeed } from './store'

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

test('streak state round-trips; corrupt data resets to null', () => {
  expect(getStreakState()).toBeNull()
  setStreakState({ count: 3, last: '2026-07-09' })
  expect(getStreakState()).toEqual({ count: 3, last: '2026-07-09' })
  localStorage.setItem('bs:streak', '{not json')
  expect(getStreakState()).toBeNull()
})

test('install seed is stable once created', () => {
  const s = getInstallSeed()
  expect(s).toMatch(/^[0-9a-f]{16}$/)
  expect(getInstallSeed()).toBe(s)
})
