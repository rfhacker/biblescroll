import { readFileSync } from 'node:fs'
import { buildStore, parseLooseRef, refText } from './verseStore'
import type { CuratedRef } from './types'
import prophecy from './prophecy.json'
import hymns from './hymns.json'
import timeline from './timeline.json'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const toTuple = (ref: string): CuratedRef => {
  const r = parseLooseRef(ref)!
  const m = ref.match(/:(\d+)[–-](\d+)/)
  return m ? [r.b, r.c, r.v, Number(m[2])] : [r.b, r.c, r.v]
}
const NT = new Set(['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'])

interface PF { id: string; prophecyRef: string; fulfillmentRef: string; note: string }
interface HY { id: string; title: string; author: string; year: number; stanza: string; story: string; ref: string }
interface TL { id: string; title: string; when: string; position: number; blurb: string; ref: string }
const PFP = prophecy as PF[]
const HYP = hymns as HY[]
const TLP = timeline as TL[]

test('prophecy: 40+ pairs, unique ids, OT foretold / NT fulfilled', () => {
  expect(PFP.length).toBeGreaterThanOrEqual(40)
  expect(new Set(PFP.map((p) => p.id)).size).toBe(PFP.length)
  for (const p of PFP) {
    expect(p.id).toMatch(/^pf\d{3}$/)
    const op = parseLooseRef(p.prophecyRef)
    const nf = parseLooseRef(p.fulfillmentRef)
    expect(op, `${p.id}: prophecyRef unparsable`).not.toBeNull()
    expect(nf, `${p.id}: fulfillmentRef unparsable`).not.toBeNull()
    expect(NT.has(op!.b), `${p.id}: prophecy must be OT`).toBe(false)
    expect(NT.has(nf!.b), `${p.id}: fulfillment must be NT`).toBe(true)
  }
})

test('prophecy: pair texts fit a card; notes substantial', () => {
  for (const p of PFP) {
    const a = refText(store, toTuple(p.prophecyRef))
    const b = refText(store, toTuple(p.fulfillmentRef))
    expect(a.length, `${p.id}: prophecy text empty`).toBeGreaterThan(0)
    expect(b.length, `${p.id}: fulfillment text empty`).toBeGreaterThan(0)
    expect(a.length + b.length, `${p.id}: combined ${a.length + b.length} chars > 480`).toBeLessThanOrEqual(480)
    expect(p.note.length).toBeGreaterThanOrEqual(20)
    expect(p.note.length).toBeLessThanOrEqual(200)
  }
})

test('hymns: 20+, unique ids, public-domain years, sized fields, curly apostrophes', () => {
  expect(HYP.length).toBeGreaterThanOrEqual(20)
  expect(new Set(HYP.map((h) => h.id)).size).toBe(HYP.length)
  for (const h of HYP) {
    expect(h.id).toMatch(/^hy\d{3}$/)
    expect(h.year).toBeGreaterThanOrEqual(1500)
    expect(h.year).toBeLessThanOrEqual(1928)
    expect(h.stanza.length).toBeGreaterThanOrEqual(100)
    expect(h.stanza.length).toBeLessThanOrEqual(500)
    expect(h.story.length).toBeGreaterThanOrEqual(80)
    expect(h.story.length).toBeLessThanOrEqual(400)
    expect(h.title.length).toBeGreaterThan(2)
    expect(h.author.length).toBeGreaterThan(2)
    expect(h.stanza.includes("'"), `${h.id} straight apostrophe in stanza`).toBe(false)
    expect(h.story.includes("'"), `${h.id} straight apostrophe in story`).toBe(false)
  }
})

function parseWhen(when: string): number {
  const bc = when.match(/^(?:c\. )?(\d+) BC$/)
  if (bc) return -Number(bc[1])
  const ad = when.match(/^(?:c\. )?AD (\d+)$/)
  if (ad) return Number(ad[1])
  throw new Error(`bad when: "${when}"`)
}

test('timeline: 25+, unique ids, parsable dates, positions chronological', () => {
  expect(TLP.length).toBeGreaterThanOrEqual(25)
  expect(new Set(TLP.map((t) => t.id)).size).toBe(TLP.length)
  for (const t of TLP) {
    expect(t.id).toMatch(/^tl\d{3}$/)
    expect(() => parseWhen(t.when), `${t.id}: "${t.when}"`).not.toThrow()
    expect(t.position).toBeGreaterThanOrEqual(2)
    expect(t.position).toBeLessThanOrEqual(98)
    expect(t.blurb.length).toBeGreaterThanOrEqual(60)
    expect(t.blurb.length).toBeLessThanOrEqual(300)
    expect(t.blurb.includes("'"), `${t.id} straight apostrophe`).toBe(false)
  }
  const byPos = [...TLP].sort((a, b) => a.position - b.position)
  for (let i = 1; i < byPos.length; i++) {
    expect(parseWhen(byPos[i].when), `${byPos[i].id} out of chronological order vs ${byPos[i - 1].id}`)
      .toBeGreaterThanOrEqual(parseWhen(byPos[i - 1].when))
  }
})
