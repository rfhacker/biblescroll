import { render, screen, cleanup } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { vi } from 'vitest'
import { buildStore } from '../../content/verseStore'
import { refText } from '../../content/verseStore'
import { memoryPool, MEMORY_MAX_CHARS, resolveCard } from './resolve'
import curated from '../../content/curated.json'
import whosaid from '../../content/whosaid.json'
import cont from '../../content/continue.json'
import prayer from '../../content/prayer.json'
import names from '../../content/names.json'
import type { CuratedRef, WhoSaidItem, ContinueItem, PrayerItem, NamesItem } from '../../content/types'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

afterEach(() => {
  cleanup()
})

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

test('whosaid kind renders its distinct kicker', () => {
  const onScore = vi.fn()
  const item = {
    kind: 'whosaid' as const,
    pool: 'whosaid' as const,
    poolIndex: 0,
  }
  render(resolveCard(item, store, 0, onScore) as React.ReactElement)
  expect(screen.getByText('Who said it?')).toBeInTheDocument()
})

test('continue kind renders its distinct kicker', () => {
  const onScore = vi.fn()
  const item = {
    kind: 'continue' as const,
    pool: 'continue' as const,
    poolIndex: 0,
  }
  render(resolveCard(item, store, 0, onScore) as React.ReactElement)
  expect(screen.getByText('Continue the verse')).toBeInTheDocument()
})

test('prayer kind renders its distinct kicker', () => {
  const item = {
    kind: 'prayer' as const,
    pool: 'prayer' as const,
    poolIndex: 0,
  }
  render(resolveCard(item, store, 0, () => {}) as React.ReactElement)
  expect(screen.getByText('A moment of prayer')).toBeInTheDocument()
})

test('names kind renders its distinct kicker', () => {
  const item = {
    kind: 'names' as const,
    pool: 'names' as const,
    poolIndex: 0,
  }
  render(resolveCard(item, store, 0, () => {}) as React.ReactElement)
  expect(screen.getByText('Names of God')).toBeInTheDocument()
})
