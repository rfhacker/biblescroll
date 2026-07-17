import { readFileSync } from 'node:fs'
import { buildStore, parseLooseRef, refText } from './verseStore'
import whosaid from './whosaid.json'
import cont from './continue.json'
import type { CuratedRef } from './types'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
// parseLooseRef ignores verse ranges, so pull an end verse out of the
// display string ("John 3:16-17" or en dash) for range-aware refText.
const toTuple = (ref: string): CuratedRef => {
  const r = parseLooseRef(ref)!
  const m = ref.match(/:(\d+)[–-](\d+)/)
  return m ? [r.b, r.c, r.v, Number(m[2])] : [r.b, r.c, r.v]
}
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

interface WS { id: string; quote: string; choices: string[]; answer: number; why: string; ref: string }
interface CV { id: string; stem: string; endings: string[]; sources: string[]; answer: number; why: string; ref: string }
const WSP = whosaid as WS[]
const CVP = cont as CV[]

test('whosaid: 60+ items, unique zero-padded ids', () => {
  expect(WSP.length).toBeGreaterThanOrEqual(60)
  expect(new Set(WSP.map((w) => w.id)).size).toBe(WSP.length)
  for (const w of WSP) expect(w.id).toMatch(/^ws\d{3}$/)
})

test('whosaid: every quote is a verbatim substring of its ref text', () => {
  for (const w of WSP) {
    const text = norm(refText(store, toTuple(w.ref)))
    expect(text.includes(norm(w.quote)), `${w.id}: quote not verbatim in ${w.ref}`).toBe(true)
  }
})

test('whosaid: four unique choices containing the answer; every index used pack-wide', () => {
  const used = new Set<number>()
  for (const w of WSP) {
    expect(w.choices).toHaveLength(4)
    expect(new Set(w.choices).size).toBe(4)
    expect(w.answer).toBeGreaterThanOrEqual(0)
    expect(w.answer).toBeLessThan(4)
    expect(w.why.length).toBeGreaterThan(10)
    used.add(w.answer)
  }
  expect(used.size).toBe(4)
})

test('whosaid: curly punctuation only (no straight quotes/apostrophes in quotes)', () => {
  for (const w of WSP) {
    expect(w.quote.includes('"'), `${w.id} straight double quote`).toBe(false)
    expect(w.quote.includes("'"), `${w.id} straight apostrophe`).toBe(false)
  }
})

test('continue: 50+ items, unique ids, distinct endings, every answer index used', () => {
  expect(CVP.length).toBeGreaterThanOrEqual(50)
  expect(new Set(CVP.map((c) => c.id)).size).toBe(CVP.length)
  const used = new Set<number>()
  for (const c of CVP) {
    expect(c.id).toMatch(/^cv\d{3}$/)
    expect(c.endings).toHaveLength(3)
    expect(c.sources).toHaveLength(3)
    expect(new Set(c.endings.map(norm)).size).toBe(3)
    expect(c.answer).toBeGreaterThanOrEqual(0)
    expect(c.answer).toBeLessThan(3)
    used.add(c.answer)
  }
  expect(used.size).toBe(3)
})

test('continue: stem + true ending reconstructs the ref text exactly', () => {
  for (const c of CVP) {
    const text = norm(refText(store, toTuple(c.ref)))
    // endsWith (not equality): psalm superscriptions and acrostic headers
    // are trimmed from stems, so stem+ending reconstructs the verse tail.
    expect(text.endsWith(norm(`${c.stem} ${c.endings[c.answer]}`)), `${c.id}: does not reconstruct ${c.ref}`).toBe(true)
    expect(norm(c.sources[c.answer])).toBe(norm(c.ref))
  }
})

test('continue: every distractor ending is a verbatim suffix of its source text', () => {
  for (const c of CVP) {
    c.endings.forEach((e, i) => {
      if (i === c.answer) return
      const src = norm(refText(store, toTuple(c.sources[i])))
      expect(src.endsWith(norm(e)), `${c.id} ending ${i}: not a suffix of ${c.sources[i]}`).toBe(true)
    })
  }
})
