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
  // Synthetic store: one verse has the exact term "shepherd", the other only
  // matches by prefix ("shepherds"). The exact match must score strictly higher.
  const tiny = buildStore([
    ['GEN', 1, 1, 'the shepherds sat'],
    ['GEN', 1, 2, 'the shepherd sat'],
  ])
  const r = searchVerses(tiny, 'shepherd')
  expect(r).toHaveLength(2)
  expect(r[0].index).toBe(1) // exact match verse ranks first
  expect(r[1].index).toBe(0) // prefix-only match ranks second
  expect(r[0].score).toBeGreaterThan(r[1].score)
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
  expect(normalize("Don't—Fear!")).toBe('dont fear')
})

test('caches per-verse word arrays: repeated calls return identical results', () => {
  const first = searchVerses(store, 'eagle wing')
  const second = searchVerses(store, 'eagle wing')
  expect(second).toEqual(first)
})

test('apostrophe-free query matches contractions in the source text', () => {
  const r = searchVerses(store, 'dont be afraid')
  expect(r.length).toBeGreaterThan(0)
  const text = store.list[r[0].index][3]
  expect(text.toLowerCase()).toMatch(/don['’]t be afraid/)
})

test('possessive apostrophes are stripped so "gods" matches "God\'s"', () => {
  const r = searchVerses(store, 'gods love')
  expect(r.length).toBeGreaterThan(0)
})
