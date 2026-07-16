import { readFileSync } from 'node:fs'
import { searchVerses, normalize } from './search'
import { buildStore, refKey } from '../content/verseStore'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const key = (i: number) => refKey(store.list[i][0], store.list[i][1], store.list[i][2])

test('finds the classic verse by two-word prefix query', () => {
  const r = searchVerses(store, 'eagle wing')
  expect(r.length).toBeGreaterThan(0)
  expect(r.map((x) => key(x.index))).toContain('ISA 40:31')
})

test('all terms must match — adding a bogus term empties results', () => {
  expect(searchVerses(store, 'shepherd xyzzy')).toEqual([])
})

test('exact word outranks prefix-only match', () => {
  const r = searchVerses(store, 'shepherd')
  const first = store.list[r[0].index][3].toLowerCase()
  expect(first).toContain('shepherd')
  // a verse containing the exact word must not rank below one matching only by prefix elsewhere
  expect(r[0].score).toBeGreaterThanOrEqual(r[r.length - 1].score)
})

test('caps results and respects the limit param', () => {
  expect(searchVerses(store, 'the').length).toBeLessThanOrEqual(50)
  expect(searchVerses(store, 'the', 5)).toHaveLength(5)
})

test('punctuation and case are ignored; sub-2-char terms dropped', () => {
  const a = searchVerses(store, 'GOD SO LOVED')
  const b = searchVerses(store, 'god, so? loved!')
  expect(a).toEqual(b)
  expect(searchVerses(store, 'a I')).toEqual([])
})

test('normalize strips punctuation and lowercases', () => {
  expect(normalize("Don't—Fear!")).toBe('don t fear')
})
