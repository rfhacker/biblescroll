import { readFileSync, readdirSync, statSync } from 'node:fs'
import { buildStore, refKey } from './verseStore'
import { BOOKS } from './books'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const OMITTED = new Set(['LUK 17:36', 'ACT 8:37', 'ACT 15:34', 'ACT 24:7', 'ROM 16:25'])
type Entry = [number, number, number, string]

function loadAll(source: string): Map<string, Entry[]> {
  const dir = `public/commentary/${source}`
  const out = new Map<string, Entry[]>()
  for (const f of readdirSync(dir)) out.set(f.replace('.json', ''), JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')))
  return out
}

// Per-book size budgets: raised from the Task 2 brief's 122880/409600 because
// after gap-fill (controller amendment) MHCC's largest book (PSA) is 362848B
// and JFB's largest (ISA) is 679404B — legitimate coverage growth from filling
// verse-range gaps left by Task 1's source-faithful vendoring. Total budgets
// (4MiB / 16MiB) are unchanged and still hold comfortably.
const PER_BOOK_BUDGET = { mhcc: 393216, jfb: 786432 } as const
const TOTAL_BUDGET = { mhcc: 4194304, jfb: 16777216 } as const

for (const source of ['mhcc', 'jfb'] as const) {
  const books = loadAll(source)

  test(`${source}: entries are well-formed, endpoints resolve, no variant endpoints, no HTML`, () => {
    for (const [book, entries] of books) {
      expect(BOOKS[book], `${source}/${book} unknown code`).toBeTruthy()
      for (const [c, vs, ve, text] of entries) {
        expect(ve).toBeGreaterThanOrEqual(vs)
        expect(store.byKey.has(refKey(book, c, vs)), `${source} ${book} ${c}:${vs}`).toBe(true)
        expect(store.byKey.has(refKey(book, c, ve)), `${source} ${book} ${c}:${ve}`).toBe(true)
        expect(OMITTED.has(refKey(book, c, vs))).toBe(false)
        expect(OMITTED.has(refKey(book, c, ve))).toBe(false)
        expect(text.length).toBeGreaterThanOrEqual(40)
        expect(text.includes('<'), `${source} ${book} ${c}:${vs} has HTML`).toBe(false)
      }
    }
  })

  test(`${source}: coverage`, () => {
    for (const [book, entries] of books) {
      const covered = new Set<string>()
      for (const [c, vs, ve] of entries) for (let v = vs; v <= ve; v++) covered.add(`${c}:${v}`)
      const all = store.list.filter((t) => t[0] === book)
      const pct = all.filter((t) => covered.has(`${t[1]}:${t[2]}`)).length / all.length
      if (source === 'mhcc') expect(pct, `${book} coverage ${(pct * 100).toFixed(1)}%`).toBe(1)
      else expect(pct, `${book} coverage ${(pct * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(0.8)
    }
  })

  test(`${source}: size budgets`, () => {
    let total = 0
    for (const f of readdirSync(`public/commentary/${source}`)) {
      const size = statSync(`public/commentary/${source}/${f}`).size
      expect(size).toBeLessThanOrEqual(PER_BOOK_BUDGET[source])
      total += size
    }
    expect(total).toBeLessThanOrEqual(TOTAL_BUDGET[source])
  })
}

test('mhcc spans all 66 books', () => {
  expect(loadAll('mhcc').size).toBe(66)
})
