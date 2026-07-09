import { hashString, mulberry32, seededShuffle, shuffledRange } from './rng'

test('hashString is deterministic and differs across inputs', () => {
  expect(hashString('a')).toBe(hashString('a'))
  expect(hashString('a')).not.toBe(hashString('b'))
})

test('mulberry32 yields deterministic sequence in [0,1)', () => {
  const a = mulberry32(42), b = mulberry32(42)
  for (let i = 0; i < 100; i++) {
    const x = a()
    expect(x).toBe(b())
    expect(x).toBeGreaterThanOrEqual(0)
    expect(x).toBeLessThan(1)
  }
})

test('seededShuffle is a deterministic permutation', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8]
  const s1 = seededShuffle(items, 'seed1')
  expect(seededShuffle(items, 'seed1')).toEqual(s1)
  expect([...s1].sort((a, b) => a - b)).toEqual(items)
  expect(seededShuffle(items, 'seed2')).not.toEqual(s1)
  expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]) // input untouched
})

test('shuffledRange returns permutation of 0..n-1', () => {
  const r = shuffledRange(50, 's')
  expect([...r].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i))
  expect(shuffledRange(50, 's')).toBe(r) // memoized: same array instance
})
