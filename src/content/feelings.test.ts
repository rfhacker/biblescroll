import { readFileSync } from 'node:fs'
import feelings from './feelings.json'
import { buildStore, refKey } from './verseStore'
import type { CuratedRef } from './types'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const EXPECTED_IDS = ['anxious', 'overwhelmed', 'sad', 'depressed', 'lonely', 'tired', 'angry', 'afraid', 'panicked', 'guilty', 'doubting', 'grieving', 'hopeful', 'grateful', 'joyful', 'tempted']
const OMITTED = new Set(['LUK 17:36', 'ACT 8:37', 'ACT 15:34', 'ACT 24:7', 'ROM 16:25'])

interface Feeling { id: string; label: string; intro: string; refs: CuratedRef[] }
const items = feelings as Feeling[]

test('exactly the 16 specified feelings, in order', () => {
  expect(items.map((f) => f.id)).toEqual(EXPECTED_IDS)
  for (const f of items) {
    expect(f.label.length).toBeGreaterThan(2)
    expect(f.intro.length).toBeGreaterThanOrEqual(40)
    expect(f.intro.length).toBeLessThanOrEqual(140)
  }
})

test('12-15 refs per feeling, all resolving, no dupes, no variant-verse conflicts', () => {
  for (const f of items) {
    expect(f.refs.length, f.id).toBeGreaterThanOrEqual(12)
    expect(f.refs.length, f.id).toBeLessThanOrEqual(15)
    const keys = f.refs.map((r) => r.join(':'))
    expect(new Set(keys).size, f.id).toBe(keys.length)
    for (const [b, c, v, end] of f.refs) {
      expect(store.byKey.has(refKey(b, c, v)), `${f.id} ${b} ${c}:${v}`).toBe(true)
      if (end) {
        expect(end - v).toBeGreaterThanOrEqual(1)
        expect(end - v).toBeLessThanOrEqual(9)
        expect(store.byKey.has(refKey(b, c, end)), `${f.id} ${b} ${c}:${end}`).toBe(true)
        for (let i = v; i <= end; i++) {
          expect(OMITTED.has(refKey(b, c, i)), `${f.id} spans omitted ${b} ${c}:${i}`).toBe(false)
        }
      } else {
        expect(OMITTED.has(refKey(b, c, v))).toBe(false)
      }
    }
  }
})
