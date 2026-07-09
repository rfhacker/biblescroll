import { cardAt, type PoolSizes } from './feed'

const SIZES: PoolSizes = { curated: 280, corpus: 31103, trivia: 150, fact: 100, map: 14 }
const at = (i: number) => cardAt(i, 'test-seed', SIZES, 7)

test('card 0 is the verse of the day', () => {
  expect(at(0)).toEqual({ kind: 'verse', pool: 'curated', poolIndex: 7, votd: true })
})

test('cards 1..10 follow the interleave cycle', () => {
  const kinds = Array.from({ length: 10 }, (_, j) => at(j + 1).kind)
  expect(kinds).toEqual(['verse', 'fact', 'verse', 'trivia', 'verse', 'map', 'verse', 'fact', 'verse', 'trivia'])
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
