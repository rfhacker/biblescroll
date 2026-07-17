import { readFileSync } from 'node:fs'
import { buildStore, parseLooseRef, refKey } from './verseStore'
import prayer from './prayer.json'
import names from './names.json'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
interface PR { id: string; prompt: string; ref: string }
interface NG { id: string; name: string; original: string; language: string; meaning: string; body: string; refs: string[] }
const PRP = prayer as PR[]
const NGP = names as NG[]

test('prayer: 40+ items, unique ids, substantial prompts, resolvable refs', () => {
  expect(PRP.length).toBeGreaterThanOrEqual(40)
  expect(new Set(PRP.map((p) => p.id)).size).toBe(PRP.length)
  for (const p of PRP) {
    expect(p.id).toMatch(/^pr\d{3}$/)
    expect(p.prompt.length).toBeGreaterThan(40)
    expect(p.prompt.length).toBeLessThan(400)
    const r = parseLooseRef(p.ref)
    expect(r, `${p.id}: "${p.ref}" did not parse`).not.toBeNull()
    expect(store.byKey.has(refKey(r!.b, r!.c, r!.v)), `${p.id}: "${p.ref}" missing`).toBe(true)
  }
})

test('prayer: prompts use curly apostrophes, never straight', () => {
  for (const p of PRP) expect(p.prompt.includes("'"), `${p.id} straight apostrophe`).toBe(false)
})

test('names: 25+ items, unique ids, complete fields, 1–3 resolvable refs each', () => {
  expect(NGP.length).toBeGreaterThanOrEqual(25)
  expect(new Set(NGP.map((n) => n.id)).size).toBe(NGP.length)
  for (const n of NGP) {
    expect(n.id).toMatch(/^ng\d{3}$/)
    for (const f of [n.name, n.original, n.meaning, n.body] as string[]) expect(f.length).toBeGreaterThan(1)
    expect(['Hebrew', 'Greek', 'Aramaic']).toContain(n.language)
    expect(n.refs.length).toBeGreaterThanOrEqual(1)
    expect(n.refs.length).toBeLessThanOrEqual(3)
    for (const ref of n.refs) {
      const r = parseLooseRef(ref)
      expect(r, `${n.id}: "${ref}" did not parse`).not.toBeNull()
      expect(store.byKey.has(refKey(r!.b, r!.c, r!.v)), `${n.id}: "${ref}" missing`).toBe(true)
    }
  }
})

test('names: originals use real Hebrew/Greek script matching the language', () => {
  for (const n of NGP) {
    const hasHebrew = /[֐-׿]/.test(n.original)
    const hasGreek = /[Ͱ-Ͽἀ-῿]/.test(n.original)
    // Aramaic (Daniel) shares the Hebrew square script.
    expect(n.language === 'Greek' ? hasGreek : hasHebrew, `${n.id}: script/language mismatch`).toBe(true)
  }
})
