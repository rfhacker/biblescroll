import { readFileSync } from 'node:fs'
import { buildStore, refKey } from './verseStore'
import curated from './curated.json'
import type { CuratedRef } from './types'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const refs = curated as CuratedRef[]

test('at least 250 curated refs, no duplicates', () => {
  expect(refs.length).toBeGreaterThanOrEqual(250)
  const keys = refs.map((r) => r.join(':'))
  expect(new Set(keys).size).toBe(keys.length)
})

test('every ref (and range end) resolves to a real verse', () => {
  for (const [b, c, v, end] of refs) {
    expect(store.byKey.has(refKey(b, c, v)), `${b} ${c}:${v}`).toBe(true)
    if (end) {
      expect(end).toBeGreaterThan(v)
      expect(end - v).toBeLessThanOrEqual(9)
      expect(store.byKey.has(refKey(b, c, end)), `${b} ${c}:${end}`).toBe(true)
    }
  }
})
