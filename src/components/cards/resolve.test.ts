import { readFileSync } from 'node:fs'
import { buildStore } from '../../content/verseStore'
import { refText } from '../../content/verseStore'
import { memoryPool, MEMORY_MAX_CHARS } from './resolve'
import curated from '../../content/curated.json'
import type { CuratedRef } from '../../content/types'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

test('memory pool only includes curated refs at or under the char cap', () => {
  const pool = memoryPool(store)
  for (const ref of pool) {
    expect(refText(store, ref).length).toBeLessThanOrEqual(MEMORY_MAX_CHARS)
  }
})

test('memory pool retains a healthy majority of the curated set', () => {
  const pool = memoryPool(store)
  // 306 of 332 curated refs are <= 280 chars against the real corpus; floor
  // set just below that so small corpus edits don't make this test brittle.
  expect(pool.length).toBeGreaterThanOrEqual(300)
  expect(pool.length).toBeLessThan((curated as CuratedRef[]).length)
})

test('memory pool caches and returns the same content on repeated calls', () => {
  const first = memoryPool(store)
  const second = memoryPool(store)
  expect(second).toBe(first) // same array instance — cache hit, not recomputed
})

test('excludes long multi-verse ranges like Psalms 23:1–6 (595 chars)', () => {
  const pool = memoryPool(store)
  const hasPsalm23 = pool.some(([b, c, v, end]) => b === 'PSA' && c === 23 && v === 1 && end === 6)
  expect(hasPsalm23).toBe(false)
  // sanity: it really is in the full curated set (so the exclusion is the filter, not a typo)
  const inCurated = (curated as CuratedRef[]).some(([b, c, v, end]) => b === 'PSA' && c === 23 && v === 1 && end === 6)
  expect(inCurated).toBe(true)
})
