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
// (4MiB / 16MiB) are unchanged and still hold comfortably. mhc's budgets
// (8MiB per book / 48MiB whole-set) come from the Henry Complete plan's
// Global Constraints — the unabridged Henry is much larger than either
// abridged source (largest book PSA at ~3MiB, whole set ~33MiB).
const PER_BOOK_BUDGET = { mhcc: 393216, jfb: 786432, mhc: 8388608 } as const
const TOTAL_BUDGET = { mhcc: 4194304, jfb: 16777216, mhc: 50331648 } as const

for (const source of ['mhcc', 'jfb', 'mhc'] as const) {
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
      if (source === 'mhcc' || source === 'mhc') expect(pct, `${book} coverage ${(pct * 100).toFixed(1)}%`).toBe(1)
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

test('mhc spans all 66 books', () => {
  expect(loadAll('mhc').size).toBe(66)
})

// Flagship case (controller amendment): the user reported that MAT 11:28-30
// under the old (mhcc-only) UI showed only a thin summary. The tightest-
// covering mhc entry for v28 must be the unabridged exposition, with its
// embedded KJV quote stripped so it opens on Henry's own words.
test('mhc: MAT 11 tightest-covering entry for v28 opens on Henry, not the KJV quote', () => {
  const entries = loadAll('mhc').get('MAT')!
  const covering = entries.filter(([c, vs, ve]) => c === 11 && vs <= 28 && ve >= 28)
  const tightest = covering.reduce((a, b) => (b[2] - b[1] < a[2] - a[1] ? b : a))
  expect(tightest[1]).toBe(25)
  expect(tightest[2]).toBe(30)
  expect(tightest[3].startsWith('In these verses we have Christ looking up to heaven')).toBe(true)
})
