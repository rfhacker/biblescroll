import { readFileSync, readdirSync } from 'node:fs'
import { buildStore, refKey } from './verseStore'
import { BOOKS } from './books'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const OMITTED = new Set(['LUK 17:36', 'ACT 8:37', 'ACT 15:34', 'ACT 24:7', 'ROM 16:25'])
type Ref = [string, number, number, number?]
type Entry = [number, number, Ref[]]

const books = new Map<string, Entry[]>()
for (const f of readdirSync('public/crossrefs')) {
  books.set(f.replace('.json', ''), JSON.parse(readFileSync(`public/crossrefs/${f}`, 'utf8')))
}

test('anchors and targets all resolve; no variant verses; no empty lists', () => {
  for (const [book, entries] of books) {
    expect(BOOKS[book]).toBeTruthy()
    for (const [c, v, refs] of entries) {
      const anchor = refKey(book, c, v)
      expect(store.byKey.has(anchor), anchor).toBe(true)
      expect(OMITTED.has(anchor)).toBe(false)
      expect(refs.length).toBeGreaterThan(0)
      for (const [b, rc, rv, rend] of refs) {
        expect(store.byKey.has(refKey(b, rc, rv)), `${anchor} -> ${b} ${rc}:${rv}`).toBe(true)
        expect(OMITTED.has(refKey(b, rc, rv))).toBe(false)
        if (rend) {
          expect(rend).toBeGreaterThan(rv)
          expect(store.byKey.has(refKey(b, rc, rend)), `${anchor} -> ${b} ${rc}:${rend}`).toBe(true)
          expect(OMITTED.has(refKey(b, rc, rend))).toBe(false)
        }
      }
    }
  }
}, 30000)

test('coverage floor: ≥85% of canon verses have an entry', () => {
  const anchored = new Set<string>()
  for (const [book, entries] of books) for (const [c, v] of entries) anchored.add(refKey(book, c, v))
  const covered = store.list.filter((t) => anchored.has(refKey(t[0], t[1], t[2]))).length
  expect(covered / store.list.length).toBeGreaterThanOrEqual(0.85)
})

test('entries sorted by chapter then verse', () => {
  for (const [, entries] of books) {
    for (let i = 1; i < entries.length; i++) {
      const [pc, pv] = entries[i - 1]
      const [c, v] = entries[i]
      expect(c > pc || (c === pc && v > pv)).toBe(true)
    }
  }
})
