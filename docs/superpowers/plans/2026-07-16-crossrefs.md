# Cross-References Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swiping the opposite direction from commentary on any verse card opens the verse's Treasury of Scripture Knowledge cross-references, each with its WEB text inline and one tap from its chapter.

**Architecture:** Same pipeline discipline as the commentaries (vendor → generate per-book → validate), a `lib/crossrefs.ts` mirroring `lib/commentary.ts`, a `CrossRefsPane`, and `VerseSlide` growing to three panes centered on the card. Ref texts come from the in-memory verse store — the dataset ships links only.

**Tech Stack:** Existing app; plain-Node scripts; no new dependencies.

## Global Constraints

- `CrossRefEntry = [c: number, v: number, refs: Ref[]]`, `Ref = [b: string, c: number, v: number, end?: number]`; per-book files at `public/crossrefs/{USFM}.json`, sorted by (c, v); refs preserve TSK order.
- Every anchor and target resolves in the WEB corpus; the five omitted variant verses (LUK 17:36, ACT 8:37, ACT 15:34, ACT 24:7, ROM 16:25) never appear as targets or anchors (drop/remap, log counts). Coverage floor: ≥85% of canon verses have an entry.
- Tier decision by measured size: whole set ≤ 4,718,592B raw → PRECACHE; else runtime-cache (join the `ondemand-commentary`-style route). The generation task prints `TIER: precache|runtime`; the tiering task implements that branch.
- UI copy: kicker "Cross References"; heading `Scripture on {Book C:V}`; empty "No cross-references recorded for this verse."; failure "References for this book aren’t downloaded yet." + Try again; cap 15 + `Show all (N)`.
- Feed perf contract intact: side panes lazy, prefetch-on-mount only, no vertical-path JS.
- Do NOT push until the final task. Trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (`[co-author trailer]`). Suite currently 172/172.

---

### Task 1: Vendor TSK

**Files:**
- Create: `scripts/fetch-crossrefs-data.mjs`, `data/crossrefs-raw.json` (generated, committed)

**Interfaces:**
- Produces: `data/crossrefs-raw.json` = `Array<{ book: string, c: number, v: number, refs: [string, number, number, number?][] }>` — anchors sorted canonically; refs in TSK order; all books USFM-coded.

- [ ] **Step 1: Decision tree.** (a) Probe well-known machine-readable TSK conversions on GitHub (search the raw hosts for `tsk` cross-reference JSON/CSV/SQLite datasets; several public-domain conversions exist — e.g. repositories packaging TSK per-verse reference lists; verify PROVENANCE is TSK/public domain, not a copyrighted product). (b) Fallback: CrossWire's SWORD TSK module (zipped conf + data; parse the module format with a one-off script — the TSK module's data is plain-text reference lists). (c) BLOCKED protocol with attempt specifics.
- [ ] **Step 2: Normalization requirements:** source references arrive as strings ("Ps 34:8; Ro 5:8") or OSIS — map book names/abbrevs → USFM via an internal table incl. TSK's abbreviation quirks; parse ranges; DROP targets that don't resolve in the WEB corpus (log per-reason counts: apocryphal refs, KJV-only verses like the five omitted variants, malformed) — never invent.
- [ ] **Step 3: Assertions before writing:** ≥55 books have anchors; total anchors ≥ 20,000; total refs ≥ 300,000; no empty ref lists; all anchors resolve; canonical sort. Print per-book anchor counts + total dropped-target stats.
- [ ] **Step 4:** `npm test` untouched-green; commit (script + raw) — `"feat: vendor Treasury of Scripture Knowledge cross-references"` + trailer.

---

### Task 2: Generate per-book files + validation

**Files:**
- Create: `scripts/make-crossrefs.mjs`, `public/crossrefs/*.json` (generated, committed), `src/content/crossrefs.test.ts`
- Modify: `package.json` (`"crossrefs": "node scripts/make-crossrefs.mjs"`)

**Interfaces:**
- Produces: `public/crossrefs/{USFM}.json` = `CrossRefEntry[]` per the Global Constraints; the script prints `TIER: precache` or `TIER: runtime` from the measured total.

- [ ] **Step 1: Write scripts/make-crossrefs.mjs**

```js
// data/crossrefs-raw.json -> public/crossrefs/{BOOK}.json ; prints tier decision
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const raw = JSON.parse(readFileSync('data/crossrefs-raw.json', 'utf8'))
const byBook = new Map()
for (const a of raw) {
  if (!byBook.has(a.book)) byBook.set(a.book, [])
  byBook.get(a.book).push([a.c, a.v, a.refs])
}
mkdirSync('public/crossrefs', { recursive: true })
let total = 0
for (const [book, entries] of byBook) {
  entries.sort((x, y) => x[0] - y[0] || x[1] - y[1])
  const out = JSON.stringify(entries)
  writeFileSync(`public/crossrefs/${book}.json`, out)
  total += out.length
}
console.log(`crossrefs: ${byBook.size} books, ${total}B`)
console.log(total <= 4718592 ? 'TIER: precache' : 'TIER: runtime')
```

- [ ] **Step 2:** Run; record total + tier.
- [ ] **Step 3: Write src/content/crossrefs.test.ts**

```ts
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
})

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
```

- [ ] **Step 4:** Iterate to green (data problems → fix Task 1 parsing, re-vendor; never weaken). Full suite + build. Commit — `"feat: per-book cross-reference files with validation"` + trailer.

---

### Task 3: `lib/crossrefs.ts`

**Files:**
- Create: `src/lib/crossrefs.ts`
- Test: `src/lib/crossrefs.test.ts`

**Interfaces:**
- Produces (Tasks 4–5 consume exactly):
  ```ts
  export type Ref = [b: string, c: number, v: number, end?: number]
  export type CrossRefEntry = [c: number, v: number, refs: Ref[]]
  export function crossRefsFor(entries: CrossRefEntry[], c: number, v: number): Ref[] | null
  export function loadCrossRefs(book: string): Promise<CrossRefEntry[]>   // result + in-flight caching, failures never cached
  export function prefetchCrossRefs(book: string): void
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/crossrefs.test.ts
import { crossRefsFor, loadCrossRefs, type CrossRefEntry } from './crossrefs'

const ENTRIES: CrossRefEntry[] = [
  [3, 16, [['ROM', 5, 8], ['1JN', 4, 9, 10]]],
  [3, 17, [['JHN', 12, 47]]],
]

test('crossRefsFor exact-verse lookup', () => {
  expect(crossRefsFor(ENTRIES, 3, 16)).toEqual([['ROM', 5, 8], ['1JN', 4, 9, 10]])
  expect(crossRefsFor(ENTRIES, 3, 18)).toBeNull()
  expect(crossRefsFor(ENTRIES, 4, 16)).toBeNull()
})

test('loadCrossRefs caches results and dedups in-flight calls', async () => {
  let resolveFetch!: (r: Response) => void
  const spy = vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolveFetch = res }) as Promise<Response>)
  const p1 = loadCrossRefs('GEN')
  const p2 = loadCrossRefs('GEN')
  resolveFetch(new Response(JSON.stringify(ENTRIES), { status: 200 }))
  const [a, b] = await Promise.all([p1, p2])
  expect(a).toBe(b)
  expect(spy).toHaveBeenCalledTimes(1)
  expect(await loadCrossRefs('GEN')).toBe(a)
  expect(spy).toHaveBeenCalledTimes(1)
  spy.mockRestore()
})

test('failures are not cached', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(ENTRIES), { status: 200 }))
  await expect(loadCrossRefs('EXO')).rejects.toThrow()
  await expect(loadCrossRefs('EXO')).resolves.toEqual(ENTRIES)
  vi.restoreAllMocks()
})
```

- [ ] **Step 2: Implement** (mirror `lib/commentary.ts` — result Map + inflight Map with `.then(ok, err)` cleanup; URL `${import.meta.env.BASE_URL}crossrefs/${book}.json`; Array.isArray guard; `crossRefsFor` linear scan for exact (c, v); prefetch swallows).
- [ ] **Step 3:** Full suite; commit — `"feat: cross-reference lookup and cached loading"` + trailer.

---

### Task 4: CrossRefsPane

**Files:**
- Create: `src/components/cards/CrossRefsPane.tsx`
- Modify: `src/index.css` (append)
- Test: `src/components/cards/CrossRefsPane.test.tsx`

**Interfaces:**
- Consumes: Task 3 lib; `ChapterContext`; `refText`/`refLabel` + `BOOKS` from content; `VerseStore`.
- Produces: `CrossRefsPane({ book, c, v, verses, active }: { book: string; c: number; v: number; verses: VerseStore; active: boolean })` — renders nothing until active.

- [ ] **Step 1: Write the failing tests** (distinct books per test — module cache)

```tsx
// src/components/cards/CrossRefsPane.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { CrossRefsPane } from './CrossRefsPane'
import { ChapterContext } from '../ChapterContext'
import { buildStore } from '../../content/verseStore'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const REFS_16 = Array.from({ length: 20 }, (_, i) => ['PSA', 1, i + 1])
const ENTRIES = [[3, 16, [['ROM', 5, 8], ['1JN', 4, 9, 10], ...REFS_16]]]

beforeEach(() => { vi.restoreAllMocks() })
const mockOk = (payload: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))

test('inactive renders and fetches nothing', () => {
  const spy = mockOk(ENTRIES)
  render(<CrossRefsPane book="JHN" c={3} v={16} verses={store} active={false} />)
  expect(spy).not.toHaveBeenCalled()
  expect(screen.queryByText(/cross references/i)).toBeNull()
})

test('active shows heading, ref labels with WEB text, cap 15 + Show all', async () => {
  mockOk(ENTRIES)
  render(<CrossRefsPane book="GEN" c={3} v={16} verses={store} active={true} />)
  await waitFor(() => expect(screen.getByText('Scripture on Genesis 3:16')).toBeInTheDocument())
  expect(screen.getByText('Romans 5:8')).toBeInTheDocument()
  expect(screen.getByText(/God commends his own love/)).toBeInTheDocument() // WEB text of ROM 5:8
  expect(screen.getByText('1 John 4:9–10')).toBeInTheDocument()
  const items = document.querySelectorAll('.xref-item')
  expect(items).toHaveLength(15)
  await userEvent.click(screen.getByRole('button', { name: /show all \(22\)/i }))
  expect(document.querySelectorAll('.xref-item')).toHaveLength(22)
})

test('ref label tap opens the chapter', async () => {
  mockOk(ENTRIES)
  const openChapter = vi.fn()
  render(
    <ChapterContext.Provider value={{ openChapter }}>
      <CrossRefsPane book="PSA" c={3} v={16} verses={store} active={true} />
    </ChapterContext.Provider>,
  )
  await waitFor(() => screen.getByText('Romans 5:8'))
  await userEvent.click(screen.getByText('Romans 5:8'))
  expect(openChapter).toHaveBeenCalledWith('ROM', 5, 8)
})

test('verse without an entry shows the empty state', async () => {
  mockOk([[99, 1, [['GEN', 1, 1]]]])
  render(<CrossRefsPane book="EXO" c={3} v={16} verses={store} active={true} />)
  await waitFor(() =>
    expect(screen.getByText('No cross-references recorded for this verse.')).toBeInTheDocument())
})

test('fetch failure shows the offline message with Try again', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockRejectedValueOnce(new TypeError('failed'))
    .mockResolvedValueOnce(new Response(JSON.stringify([[3, 16, [['ROM', 5, 8]]]]), { status: 200 }))
  render(<CrossRefsPane book="ISA" c={3} v={16} verses={store} active={true} />)
  await waitFor(() =>
    expect(screen.getByText(/references for this book aren’t downloaded yet/i)).toBeInTheDocument())
  await userEvent.click(screen.getByRole('button', { name: /try again/i }))
  await screen.findByText('Romans 5:8')
})
```

- [ ] **Step 2: Implement**

```tsx
// src/components/cards/CrossRefsPane.tsx
import { useContext, useEffect, useState } from 'react'
import { ChapterContext } from '../ChapterContext'
import { BOOKS } from '../../content/books'
import { refText, refLabel, type VerseStore } from '../../content/verseStore'
import { loadCrossRefs, crossRefsFor, type CrossRefEntry, type Ref } from '../../lib/crossrefs'
import type { CuratedRef } from '../../content/types'

type Status = 'loading' | 'ready' | 'failed'
const CAP = 15

export function CrossRefsPane({ book, c, v, verses, active }: {
  book: string; c: number; v: number; verses: VerseStore; active: boolean
}) {
  const { openChapter } = useContext(ChapterContext)
  const [status, setStatus] = useState<Status>('loading')
  const [entries, setEntries] = useState<CrossRefEntry[] | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!active) return
    let dead = false
    setStatus('loading')
    loadCrossRefs(book).then(
      (es) => { if (!dead) { setEntries(es); setStatus('ready') } },
      () => { if (!dead) setStatus('failed') },
    )
    return () => { dead = true }
  }, [active, book, attempt])

  if (!active) return null
  const refs = status === 'ready' && entries ? crossRefsFor(entries, c, v) : null
  const shown = refs ? (showAll ? refs : refs.slice(0, CAP)) : []

  return (
    <div className="commentary-pane xref-pane">
      <div className="kicker">Cross References</div>
      <h3 className="commentary-head">Scripture on {BOOKS[book] ?? book} {c}:{v}</h3>
      {status === 'loading' && <p className="commentary-dim">Gathering the echoes…</p>}
      {status === 'failed' && (
        <p className="commentary-dim">
          References for this book aren’t downloaded yet.
          <button className="commentary-switch" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </p>
      )}
      {status === 'ready' && !refs && (
        <p className="commentary-dim">No cross-references recorded for this verse.</p>
      )}
      {shown.map((r: Ref, i) => (
        <div className="xref-item" key={i}>
          <button className="verse-ref verse-ref-btn"
            onClick={() => openChapter(r[0], r[1], r[2])}>{refLabel(r as CuratedRef)}</button>
          <p className="xref-text">{refText(verses, r as CuratedRef)}</p>
        </div>
      ))}
      {refs && refs.length > CAP && !showAll && (
        <button className="feel-go xref-more" onClick={() => setShowAll(true)}>
          Show all ({refs.length})
        </button>
      )}
    </div>
  )
}
```

CSS append:

```css
.xref-item { margin-bottom: 1rem; }
.xref-text {
  font-family: var(--serif); font-size: 1.02rem; line-height: 1.6;
  display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
}
.xref-more { margin-top: 0.5rem; }
```

(Note: `refLabel`/`refText` accept `CuratedRef` tuples — `Ref` has the identical shape; the cast is sound. `1 John 4:9–10` label comes from refLabel's en dash.)

- [ ] **Step 3:** Full suite; commit — `"feat: cross-references pane"` + trailer.

---

### Task 5: VerseSlide three panes

**Files:**
- Modify: `src/components/cards/VerseSlide.tsx`, `src/components/cards/resolve.tsx`, `src/components/Feelings.tsx`, `src/index.css`
- Test: `src/components/cards/VerseSlide.test.tsx` (extend/adjust)

**Interfaces:**
- Produces: `VerseSlide({ book, c, v, verses, children })` — NEW REQUIRED `verses: VerseStore` prop (threaded from resolve.tsx and Feelings.tsx, which both already hold the store). Pane order: [CrossRefsPane, card, CommentaryPane]; mount centered.

- [ ] **Step 1: Failing tests** (adjust existing + add):

```tsx
// jsdom clientWidth is 0; for centering/scroll tests, mock it on the prototype:
function withClientWidth(width: number, fn: () => void | Promise<void>) {
  const proto = HTMLDivElement.prototype
  Object.defineProperty(proto, 'clientWidth', { configurable: true, get: () => width })
  return Promise.resolve(fn()).finally(() => { delete (proto as any).clientWidth })
}

test('mounts centered on the verse card pane', async () => {
  await withClientWidth(300, () => {
    const { container } = render(
      <VerseSlide book="JHN" c={3} v={16} verses={store}><article className="card">v</article></VerseSlide>,
    )
    const track = container.querySelector('.vslide') as HTMLElement
    expect(track.scrollLeft).toBe(300) // one pane width = centered on pane 2 of 3
    expect(container.querySelectorAll('.vpane')).toHaveLength(3)
    expect(container.querySelector('.commentary-pane')).toBeNull() // both sides lazy
  })
})

test('scrolling left of center engages cross-references', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify([[3, 16, [['ROM', 5, 8]]]]), { status: 200 }))
  await withClientWidth(300, async () => {
    const { container } = render(
      <VerseSlide book="GEN" c={3} v={16} verses={store}><article className="card">v</article></VerseSlide>,
    )
    const track = container.querySelector('.vslide') as HTMLElement
    track.scrollLeft = 120 // left of the 300 center
    fireEvent.scroll(track)
    await screen.findByText(/cross references/i)
  })
})

test('chip halves navigate to each side', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }))
  render(<VerseSlide book="EXO" c={3} v={16} verses={store}><article className="card">v</article></VerseSlide>)
  await userEvent.click(screen.getByRole('button', { name: /references/i }))
  await screen.findByText(/cross references/i)
  await userEvent.click(screen.getByRole('button', { name: /commentary/i }))
  await screen.findByText(/bible commentary/i)
})
```

Adjust existing VerseSlide tests: right-scroll engagement now requires `scrollLeft > clientWidth` (use withClientWidth; scroll to 480 of 300-wide panes); prefetch assertion becomes TWO calls on mount (commentary + crossrefs — assert both URLs seen).

- [ ] **Step 2: Implement**

```tsx
// src/components/cards/VerseSlide.tsx (replace)
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { CommentaryPane } from './CommentaryPane'
import { CrossRefsPane } from './CrossRefsPane'
import { prefetchCommentary } from '../../lib/commentary'
import { prefetchCrossRefs } from '../../lib/crossrefs'
import { getCommentarySource } from '../../lib/store'
import type { VerseStore } from '../../content/verseStore'

export function VerseSlide({ book, c, v, verses, children }: {
  book: string; c: number; v: number; verses: VerseStore; children: ReactNode
}) {
  const [engagedLeft, setEngagedLeft] = useState(false)
  const [engagedRight, setEngagedRight] = useState(false)
  const track = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = track.current
    if (el) el.scrollLeft = el.clientWidth // start centered on the card pane
  }, [])

  useEffect(() => {
    prefetchCommentary(getCommentarySource(), book)
    prefetchCrossRefs(book)
  }, [book])

  function engage(side: 'left' | 'right') {
    if (side === 'left' && !engagedLeft) setEngagedLeft(true)
    if (side === 'right' && !engagedRight) setEngagedRight(true)
    window.dispatchEvent(new CustomEvent('bs:slide-engaged'))
  }

  function onScroll() {
    const el = track.current
    if (!el || el.clientWidth === 0) return
    const w = el.clientWidth
    if (!engagedLeft && el.scrollLeft < w - 2) engage('left')
    if (!engagedRight && el.scrollLeft > w + 2) engage('right')
  }

  function goTo(paneIndex: 0 | 2) {
    engage(paneIndex === 0 ? 'left' : 'right')
    const el = track.current
    if (el) el.scrollTo({ left: paneIndex * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="vslide" ref={track} onScroll={onScroll}>
      <div className="vpane">
        {engagedLeft ? <CrossRefsPane book={book} c={c} v={v} verses={verses} active={engagedLeft} /> : null}
      </div>
      <div className="vpane vpane-card">
        {children}
        <div className="slide-chips">
          <button className="commentary-chip" onClick={() => goTo(0)}>‹ References</button>
          <button className="commentary-chip" onClick={() => goTo(2)}>Commentary ›</button>
        </div>
      </div>
      <div className="vpane">
        {engagedRight ? <CommentaryPane book={book} c={c} v={v} active={engagedRight} /> : null}
      </div>
    </div>
  )
}
```

CSS: replace the single-chip positioning with a chips row (same band):

```css
.slide-chips {
  position: absolute; bottom: calc(2.2rem + env(safe-area-inset-bottom)); left: 1.6rem;
  display: flex; gap: 0.5rem;
}
.slide-chips .commentary-chip { position: static; }
```

(`.commentary-chip`'s absolute positioning rules move to `.slide-chips`; keep the visual pill styles on the chip itself.)

Call sites: `resolve.tsx` both verse branches and `Feelings.tsx` add `verses={verses}` to VerseSlide.

- [ ] **Step 3:** Note the `bs:slide-engaged` dispatch now fires from `engage()` for BOTH sides — Feed's hint listener keeps working (regression: Feed tests untouched-green).
- [ ] **Step 4:** Full suite + build; commit — `"feat: three-pane verse slide with cross-references"` + trailer.

---

### Task 6: Tiering + About + integration

**Files:**
- Modify: `vite.config.ts` (per Task 2's printed TIER), `src/components/About.tsx`, `src/components/Feed.test.tsx` (fetch-pattern extension)

- [ ] **Step 1:** Implement the measured tier: if `TIER: precache` — ensure crossrefs are NOT in globIgnores (default globPatterns json covers them) and assert precache includes them; if `TIER: runtime` — add `'**/crossrefs/**'` to globIgnores and widen the runtime route to `/\/(commentary\/(jfb|mhc)|crossrefs)\/[A-Z0-9]+\.json$/` (same cacheName, maxEntries 240).
- [ ] **Step 2:** About: add `<p>Cross-references: <strong>Treasury of Scripture Knowledge</strong> (public domain).</p>` after the commentary credit.
- [ ] **Step 3:** Feed test: the fetch-inspection regex becomes `/\/(commentary|crossrefs)\//`.
- [ ] **Step 4:** Full suite + build; verify the tier branch in dist/sw.js (precache counts per branch — mhcc 66 always; crossrefs 66 or 0 per tier; jfb/mhc 0). Commit — `"feat: cross-references tiering and credits"` + trailer.

---

### Task 7: Final review + deploy

- [ ] **Step 1:** Suite + build; controller runs the final whole-feature review (fable) before push — gesture model now 3-pane (hint interactions, axis edges), data quality spot-reads (JHN 3:16 refs sensible; PSA 23 refs), tier verification, ledger triage.
- [ ] **Step 2:** Push; watch; live-verify: crossrefs JSON serves, JHN 3:16 refs present, precache per tier, bundle hash new.

---

## Verification (after all tasks)

Suite green; build clean; live: swipe right on John 3:16 → Romans 5:8 with its WEB text one flick away; swipe left → commentary unchanged; feed speed unchanged.
