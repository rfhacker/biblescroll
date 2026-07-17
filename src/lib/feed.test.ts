import { cardAt, type PoolSizes, themeFor } from './feed'

const SIZES: PoolSizes = { curated: 280, corpus: 31103, trivia: 150, fact: 100, map: 14, memory: 280, whosaid: 60, continue: 50, prayer: 40, names: 25, prophecy: 40, hymn: 20, timeline: 25 }
const at = (i: number) => cardAt(i, 'test-seed', SIZES, 7)

test('card 0 is the verse of the day', () => {
  expect(at(0)).toEqual({ kind: 'verse', pool: 'curated', poolIndex: 7, votd: true })
})

test('cards 1..26 follow the interleave cycle', () => {
  const kinds = Array.from({ length: 26 }, (_, j) => at(j + 1).kind)
  expect(kinds).toEqual(['verse', 'fact', 'verse', 'trivia', 'verse', 'map', 'verse', 'whosaid', 'verse', 'prophecy', 'verse', 'fact', 'verse', 'trivia', 'verse', 'memory', 'verse', 'continue', 'verse', 'hymn', 'verse', 'prayer', 'verse', 'names', 'verse', 'timeline'])
})

test('deterministic for same seed, different for different seed', () => {
  expect(cardAt(5, 's1', SIZES, 0)).toEqual(cardAt(5, 's1', SIZES, 0))
  const many = Array.from({ length: 30 }, (_, i) => i + 1)
  const a = many.map((i) => JSON.stringify(cardAt(i, 's1', SIZES, 0)))
  const b = many.map((i) => JSON.stringify(cardAt(i, 's2', SIZES, 0)))
  expect(a).not.toEqual(b)
})

test('no fact repeats until the fact pool is exhausted', () => {
  const seen: number[] = []
  for (let i = 1; seen.length < SIZES.fact; i++) {
    const c = at(i)
    if (c.kind === 'fact') seen.push(c.poolIndex)
  }
  expect(new Set(seen).size).toBe(SIZES.fact)
})

test('no memory repeats until the memory pool is exhausted', () => {
  const seen: number[] = []
  for (let i = 1; seen.length < SIZES.memory; i++) {
    const c = at(i)
    if (c.kind === 'memory') seen.push(c.poolIndex)
  }
  expect(new Set(seen).size).toBe(SIZES.memory)
})

test('no whosaid repeats until the whosaid pool is exhausted', () => {
  const seen: number[] = []
  for (let i = 1; seen.length < SIZES.whosaid; i++) {
    const c = at(i)
    if (c.kind === 'whosaid') seen.push(c.poolIndex)
  }
  expect(new Set(seen).size).toBe(SIZES.whosaid)
})

test('no prophecy repeats until the prophecy pool is exhausted', () => {
  const seen: number[] = []
  for (let i = 1; seen.length < SIZES.prophecy; i++) {
    const c = at(i)
    if (c.kind === 'prophecy') seen.push(c.poolIndex)
  }
  expect(new Set(seen).size).toBe(SIZES.prophecy)
})

test('map pool reshuffles each epoch (still covers all items)', () => {
  const first: number[] = [], second: number[] = []
  for (let i = 1; second.length < SIZES.map; i++) {
    const c = at(i)
    if (c.kind !== 'map') continue
    if (first.length < SIZES.map) first.push(c.poolIndex)
    else second.push(c.poolIndex)
  }
  expect(new Set(first).size).toBe(SIZES.map)
  expect(new Set(second).size).toBe(SIZES.map)
})

test('verse cards are ~70% curated', () => {
  let curated = 0, corpus = 0
  for (let i = 1; curated + corpus < 100; i++) {
    const c = at(i)
    if (c.kind !== 'verse') continue
    if (c.pool === 'curated') curated++
    else corpus++
  }
  expect(curated).toBe(70)
  expect(corpus).toBe(30)
})

test('themeFor rotates every cycle slot through all 5 themes across cycles', () => {
  // 26-slot cycle; a plain i % 5 would pin each non-verse slot to one theme forever.
  for (let slot = 0; slot < 26; slot++) {
    const themes = new Set(Array.from({ length: 5 }, (_, c) => themeFor(slot + c * 26)))
    expect(themes.size).toBe(5)
  }
})
