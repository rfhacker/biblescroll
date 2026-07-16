# Menu, Feelings, Chapter Reader, Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A top-bar menu hosting three new destinations — "How are you feeling?" (curated verses per emotional state), offline Search, and a chapter reader that opens from any verse reference.

**Architecture:** Pure helpers first (chapter slicing + ref-label parsing in `verseStore`, ranking in `lib/search.ts`), then a `ChapterContext` provided by App so any nested verse surface can open the chapter sheet, then the three panels (Feelings, Search, Menu) wired into App's existing panel-state pattern. One new content pack (`feelings.json`) with the established validation-test discipline.

**Tech Stack:** Existing Vite/React/TS PWA; no new dependencies.

## Global Constraints

- Fully offline; no external requests; no tracking — the app must NOT record which feelings a user selects (no localStorage writes for feelings; transient component state only).
- Warm, never guilt-based copy. Exact strings from the spec are binding: picker prompt "Whatever you're carrying, the Word meets you there."; closing card "May these stay with you — come back whenever you need them."; search empty state "No verses match yet — try fewer or simpler words".
- 16 feelings exactly: anxious, overwhelmed, sad, depressed, lonely, tired, angry, afraid, panicked, guilty, doubting, grieving, hopeful, grateful, joyful, tempted. 12–15 refs each; ranges span ≤ 9; no refs using/spanning the five omitted variant verses (LUK 17:36, ACT 8:37, ACT 15:34, ACT 24:7, ROM 16:25); no duplicate refs within a feeling.
- Cards/panels keep the pinned dark palette; new surfaces use existing tokens; tap targets ≥ 44px.
- Test command `npm test`; do NOT push until the final task; commits end with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (`[co-author trailer]` below).

---

### Task 1: Chapter helpers + ref-label parsing (`verseStore`)

**Files:**
- Modify: `src/content/verseStore.ts`
- Test: `src/content/verseStore.test.ts` (extend)

**Interfaces:**
- Consumes: existing `VerseStore { list, byKey }`, `BOOKS`.
- Produces (later tasks rely on these exact names):
  - `VerseStore` gains `chapters: Map<string, [number, number]>` (key `"JHN 3"` → [startIdx, endIdx] inclusive) and `chapterOrder: string[]` (canonical order).
  - `chapterOf(store, b: string, c: number): { v: number; text: string }[]` (empty array if unknown).
  - `prevChapter(store, b, c): { b: string; c: number } | null`, `nextChapter(store, b, c): { b: string; c: number } | null` (null at canon edges).
  - `parseRefLabel(label: string): { b: string; c: number; v: number } | null` — inverse of `refLabel` for single refs AND ranges ("Psalms 23:1–6" → v=1); handles numbered books ("1 John 3:16"); null on garbage.

- [ ] **Step 1: Write the failing tests** (append to `src/content/verseStore.test.ts`)

```ts
import { chapterOf, prevChapter, nextChapter, parseRefLabel } from './verseStore'

test('chapterOf returns a full chapter in verse order', () => {
  const ch = chapterOf(store, 'PSA', 117)
  expect(ch).toHaveLength(2)
  expect(ch[0].v).toBe(1)
  expect(ch[1].text).toMatch(/faithfulness/i)
  expect(chapterOf(store, 'ZZZ', 1)).toEqual([])
  expect(chapterOf(store, 'GEN', 999)).toEqual([])
})

test('chapterOf skips omitted variant verses without error', () => {
  const acts8 = chapterOf(store, 'ACT', 8)
  const nums = acts8.map((x) => x.v)
  expect(nums).toContain(36)
  expect(nums).toContain(38)
  expect(nums).not.toContain(37)
})

test('prev/next chapter walk within and across books and clamp at canon edges', () => {
  expect(nextChapter(store, 'GEN', 1)).toEqual({ b: 'GEN', c: 2 })
  expect(nextChapter(store, 'GEN', 50)).toEqual({ b: 'EXO', c: 1 })
  expect(prevChapter(store, 'EXO', 1)).toEqual({ b: 'GEN', c: 50 })
  expect(prevChapter(store, 'GEN', 1)).toBeNull()
  expect(nextChapter(store, 'REV', 22)).toBeNull()
})

test('parseRefLabel inverts refLabel for singles, ranges, and numbered books', () => {
  expect(parseRefLabel('John 3:16')).toEqual({ b: 'JHN', c: 3, v: 16 })
  expect(parseRefLabel('Psalms 23:1–6')).toEqual({ b: 'PSA', c: 23, v: 1 })
  expect(parseRefLabel('1 John 3:16')).toEqual({ b: '1JN', c: 3, v: 16 })
  expect(parseRefLabel('Song of Solomon 2:1')).toEqual({ b: 'SNG', c: 2, v: 1 })
  expect(parseRefLabel('Nonsense')).toBeNull()
  expect(parseRefLabel('Atlantis 3:16')).toBeNull()
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/content/verseStore.test.ts` → FAIL (not exported)

- [ ] **Step 3: Implement** (modify `src/content/verseStore.ts`)

Extend the interface and `buildStore` (single pass, contiguous chapters):

```ts
export interface VerseStore {
  list: VerseTuple[]
  byKey: Map<string, number>
  chapters: Map<string, [number, number]>
  chapterOrder: string[]
}

export function buildStore(list: VerseTuple[]): VerseStore {
  const byKey = new Map<string, number>()
  const chapters = new Map<string, [number, number]>()
  const chapterOrder: string[] = []
  list.forEach((t, i) => {
    byKey.set(refKey(t[0], t[1], t[2]), i)
    const ck = `${t[0]} ${t[1]}`
    const span = chapters.get(ck)
    if (!span) {
      chapters.set(ck, [i, i])
      chapterOrder.push(ck)
    } else {
      span[1] = i
    }
  })
  return { list, byKey, chapters, chapterOrder }
}

export function chapterOf(store: VerseStore, b: string, c: number): { v: number; text: string }[] {
  const span = store.chapters.get(`${b} ${c}`)
  if (!span) return []
  return store.list.slice(span[0], span[1] + 1).map((t) => ({ v: t[2], text: t[3] }))
}

function chapterAt(store: VerseStore, b: string, c: number, offset: number) {
  const pos = store.chapterOrder.indexOf(`${b} ${c}`)
  if (pos < 0) return null
  const ck = store.chapterOrder[pos + offset]
  if (!ck) return null
  const sp = ck.lastIndexOf(' ')
  return { b: ck.slice(0, sp), c: Number(ck.slice(sp + 1)) }
}
export const prevChapter = (s: VerseStore, b: string, c: number) => chapterAt(s, b, c, -1)
export const nextChapter = (s: VerseStore, b: string, c: number) => chapterAt(s, b, c, +1)

const NAME_TO_CODE = new Map(Object.entries(BOOKS).map(([code, name]) => [name, code]))

export function parseRefLabel(label: string): { b: string; c: number; v: number } | null {
  const m = label.match(/^(.+?) (\d+):(\d+)(?:–\d+)?$/)
  if (!m) return null
  const b = NAME_TO_CODE.get(m[1])
  if (!b) return null
  return { b, c: Number(m[2]), v: Number(m[3]) }
}
```

(`BOOKS` is already imported in this file.)

- [ ] **Step 4: Full suite** — `npm test` → PASS (existing consumers of `buildStore` are unaffected by the added fields); `npm run build` clean
- [ ] **Step 5: Commit** — `"feat: chapter slicing, canon navigation, ref-label parsing"` + trailer

---

### Task 2: ChapterContext + ChapterSheet + tappable verse refs

**Files:**
- Create: `src/components/ChapterSheet.tsx`, `src/components/ChapterContext.ts`
- Modify: `src/App.tsx`, `src/components/cards/VerseCard.tsx`, `src/index.css` (append)
- Test: `src/components/ChapterSheet.test.tsx` (new), `src/components/cards/cards.test.tsx` (extend)

**Interfaces:**
- Consumes: Task 1 helpers; existing `VerseStore`, `BOOKS`.
- Produces:
  - `ChapterContext = createContext<{ openChapter(b: string, c: number, v?: number): void }>` with a **no-op default** (`src/components/ChapterContext.ts`).
  - `ChapterSheet({ store, b, c, highlight, onClose, onOpen }: { store: VerseStore; b: string; c: number; highlight?: number; onClose: () => void; onOpen: (b: string, c: number) => void })`.
  - App holds `chapter: { b: string; c: number; highlight?: number } | null` and provides the context; the provider wraps the whole app tree.
  - `VerseCard`'s reference line becomes a button labeled `` `${label} — WEB ›` `` that calls `openChapter` via `parseRefLabel(label)` (no-ops when parse fails or no provider).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/ChapterSheet.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { ChapterSheet } from './ChapterSheet'
import { buildStore } from '../content/verseStore'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

test('renders the chapter with heading, verse numbers, and highlight', () => {
  const { container } = render(
    <ChapterSheet store={store} b="JHN" c={3} highlight={16} onClose={() => {}} onOpen={() => {}} />,
  )
  expect(screen.getByText('John 3')).toBeInTheDocument()
  expect(screen.getByText(/God so loved the world/)).toBeInTheDocument()
  const hl = container.querySelector('.ch-highlight')
  expect(hl).not.toBeNull()
  expect(hl!.textContent).toMatch(/God so loved/)
})

test('prev/next navigate and clamp at canon edges', async () => {
  const onOpen = vi.fn()
  const { rerender } = render(
    <ChapterSheet store={store} b="GEN" c={50} onClose={() => {}} onOpen={onOpen} />,
  )
  await userEvent.click(screen.getByRole('button', { name: /next chapter/i }))
  expect(onOpen).toHaveBeenCalledWith('EXO', 1)
  rerender(<ChapterSheet store={store} b="GEN" c={1} onClose={() => {}} onOpen={onOpen} />)
  expect(screen.queryByRole('button', { name: /previous chapter/i })).toBeNull()
  rerender(<ChapterSheet store={store} b="REV" c={22} onClose={() => {}} onOpen={onOpen} />)
  expect(screen.queryByRole('button', { name: /next chapter/i })).toBeNull()
})
```

```tsx
// append to src/components/cards/cards.test.tsx
import { ChapterContext } from '../ChapterContext'

test('tapping the reference opens the chapter via context', async () => {
  const openChapter = vi.fn()
  render(
    <ChapterContext.Provider value={{ openChapter }}>
      <VerseCard text="For God so loved…" label="John 3:16" theme={0} />
    </ChapterContext.Provider>,
  )
  await userEvent.click(screen.getByRole('button', { name: /John 3:16/ }))
  expect(openChapter).toHaveBeenCalledWith('JHN', 3, 16)
})

test('reference tap without a provider is a safe no-op', async () => {
  render(<VerseCard text="abc" label="Genesis 1:1" theme={0} />)
  await userEvent.click(screen.getByRole('button', { name: /Genesis 1:1/ }))
  expect(screen.getByText(/Genesis 1:1/)).toBeInTheDocument() // still alive
})
```

- [ ] **Step 2: Verify failure, implement**

```ts
// src/components/ChapterContext.ts
import { createContext } from 'react'

export const ChapterContext = createContext<{
  openChapter: (b: string, c: number, v?: number) => void
}>({ openChapter: () => {} })
```

```tsx
// src/components/ChapterSheet.tsx
import { useEffect, useRef } from 'react'
import { BOOKS } from '../content/books'
import {
  chapterOf, prevChapter, nextChapter, type VerseStore,
} from '../content/verseStore'

export function ChapterSheet({ store, b, c, highlight, onClose, onOpen }: {
  store: VerseStore; b: string; c: number; highlight?: number
  onClose: () => void; onOpen: (b: string, c: number) => void
}) {
  const verses = chapterOf(store, b, c)
  const prev = prevChapter(store, b, c)
  const next = nextChapter(store, b, c)
  const hlRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    hlRef.current?.scrollIntoView({ block: 'center' })
  }, [b, c, highlight])

  return (
    <div className="chapter-scrim" onClick={onClose}>
      <section className="chapter-sheet" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-label={`${BOOKS[b] ?? b} chapter ${c}`}>
        <header className="chapter-head">
          <h2>{BOOKS[b] ?? b} {c}</h2>
          <button aria-label="Close" onClick={onClose}>✕</button>
        </header>
        <div className="chapter-body">
          <p className="chapter-text">
            {verses.map(({ v, text }) => (
              <span key={v} ref={v === highlight ? hlRef : undefined}
                className={v === highlight ? 'ch-verse ch-highlight' : 'ch-verse'}>
                <sup className="ch-num">{v}</sup> {text}{' '}
              </span>
            ))}
          </p>
        </div>
        <footer className="chapter-nav">
          {prev ? (
            <button aria-label="Previous chapter" onClick={() => onOpen(prev.b, prev.c)}>
              ‹ {BOOKS[prev.b] ?? prev.b} {prev.c}
            </button>
          ) : <span />}
          {next ? (
            <button aria-label="Next chapter" onClick={() => onOpen(next.b, next.c)}>
              {BOOKS[next.b] ?? next.b} {next.c} ›
            </button>
          ) : <span />}
        </footer>
      </section>
    </div>
  )
}
```

`VerseCard.tsx` — replace the ref paragraph:

```tsx
// add imports:
import { useContext } from 'react'
import { ChapterContext } from '../ChapterContext'
import { parseRefLabel } from '../../content/verseStore'
// replace <p className="verse-ref">{label} — WEB</p> with:
      <button className="verse-ref verse-ref-btn" onClick={() => {
        const r = parseRefLabel(label)
        if (r) openChapter(r.b, r.c, r.v)
      }}>{label} — WEB ›</button>
// inside the component: const { openChapter } = useContext(ChapterContext)
```

`App.tsx` — add chapter state + provider + sheet:

```tsx
// add imports: ChapterContext, ChapterSheet
const [chapter, setChapter] = useState<{ b: string; c: number; highlight?: number } | null>(null)
const openChapter = (b: string, c: number, v?: number) => setChapter({ b, c, highlight: v })
// wrap the returned tree:
return (
  <ChapterContext.Provider value={{ openChapter }}>
    <div className="app">
      …existing content…
      {chapter && verses && (
        <ChapterSheet store={verses} b={chapter.b} c={chapter.c} highlight={chapter.highlight}
          onClose={() => setChapter(null)} onOpen={(b, c) => setChapter({ b, c })} />
      )}
    </div>
  </ChapterContext.Provider>
)
```

Append to `src/index.css`:

```css
.chapter-scrim { position: fixed; inset: 0; z-index: 30; background: rgba(0,0,0,0.45); }
.chapter-sheet {
  --text: #e8e4da; --text-dim: #a49e90; --bg: #12151c; --surface: #1b2029;
  position: absolute; left: 0; right: 0; bottom: 0; max-height: 85dvh;
  display: flex; flex-direction: column;
  background: var(--bg); color: var(--text);
  border-radius: 1.1rem 1.1rem 0 0; animation: sheetup 0.25s ease;
  padding-bottom: env(safe-area-inset-bottom);
}
@keyframes sheetup { from { transform: translateY(6%); opacity: 0.6; } }
.chapter-head { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.2rem 0.5rem; }
.chapter-head h2 { font-family: var(--serif); font-size: 1.3rem; }
.chapter-head button { background: none; border: none; color: var(--text-dim); font-size: 1.25rem; cursor: pointer; min-width: 2.75rem; min-height: 2.75rem; }
.chapter-body { overflow-y: auto; padding: 0.4rem 1.3rem 1rem; }
.chapter-text { font-family: var(--serif); font-size: 1.12rem; line-height: 1.75; }
.ch-num { color: var(--accent); font-family: var(--sans); font-size: 0.7em; margin-right: 0.15em; }
.ch-highlight { background: color-mix(in srgb, var(--accent) 22%, transparent); border-radius: 0.25rem; padding: 0.05rem 0.15rem; }
.chapter-nav { display: flex; justify-content: space-between; padding: 0.6rem 1rem calc(0.8rem + env(safe-area-inset-bottom)); border-top: 1px solid color-mix(in srgb, var(--text-dim) 18%, transparent); }
.chapter-nav button { background: none; border: none; color: var(--accent); font-size: 1rem; cursor: pointer; min-height: 2.75rem; padding: 0 0.8rem; }
.verse-ref-btn { background: none; border: none; cursor: pointer; padding: 0.4rem 0; display: inline-block; text-align: left; }
```

Note: `jsdom` lacks `scrollIntoView` — add to `src/test-setup.ts`:
`Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {})`

- [ ] **Step 3: Full suite + build** — `npm test`, `npm run build` → PASS/clean
- [ ] **Step 4: Commit** — `"feat: chapter reader sheet, tappable verse references"` + trailer

---

### Task 3: Search library (`src/lib/search.ts`)

**Files:**
- Create: `src/lib/search.ts`
- Test: `src/lib/search.test.ts`

**Interfaces:**
- Consumes: `VerseStore` (only `.list`).
- Produces: `searchVerses(store: VerseStore, query: string, limit = 50): { index: number; score: number }[]` — all terms must match a word prefix; exact word beats prefix; tighter (shorter) verses rank higher; ties in canonical order; terms shorter than 2 chars ignored; no terms → `[]`. Also `normalize(s: string): string` exported for the component's highlighter.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/search.test.ts
import { readFileSync } from 'node:fs'
import { searchVerses, normalize } from './search'
import { buildStore, refKey } from '../content/verseStore'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const key = (i: number) => refKey(store.list[i][0], store.list[i][1], store.list[i][2])

test('finds the classic verse by two-word prefix query', () => {
  const r = searchVerses(store, 'eagle wing')
  expect(r.length).toBeGreaterThan(0)
  expect(r.map((x) => key(x.index))).toContain('ISA 40:31')
})

test('all terms must match — adding a bogus term empties results', () => {
  expect(searchVerses(store, 'shepherd xyzzy')).toEqual([])
})

test('exact word outranks prefix-only match', () => {
  const r = searchVerses(store, 'shepherd')
  const first = store.list[r[0].index][3].toLowerCase()
  expect(first).toContain('shepherd')
  // a verse containing the exact word must not rank below one matching only by prefix elsewhere
  expect(r[0].score).toBeGreaterThanOrEqual(r[r.length - 1].score)
})

test('caps results and respects the limit param', () => {
  expect(searchVerses(store, 'the').length).toBeLessThanOrEqual(50)
  expect(searchVerses(store, 'the', 5)).toHaveLength(5)
})

test('punctuation and case are ignored; sub-2-char terms dropped', () => {
  const a = searchVerses(store, 'GOD SO LOVED')
  const b = searchVerses(store, 'god, so? loved!')
  expect(a).toEqual(b)
  expect(searchVerses(store, 'a I')).toEqual([])
})

test('normalize strips punctuation and lowercases', () => {
  expect(normalize("Don't—Fear!")).toBe('don t fear')
})
```

- [ ] **Step 2: Verify failure, implement**

```ts
// src/lib/search.ts
import type { VerseStore } from '../content/verseStore'

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function searchVerses(
  store: VerseStore, query: string, limit = 50,
): { index: number; score: number }[] {
  const terms = normalize(query).split(' ').filter((t) => t.length >= 2)
  if (terms.length === 0) return []
  const out: { index: number; score: number }[] = []
  for (let i = 0; i < store.list.length; i++) {
    const words = normalize(store.list[i][3]).split(' ')
    let score = 0
    let ok = true
    for (const t of terms) {
      let best = 0
      for (const w of words) {
        if (w === t) { best = 2; break }
        if (best < 1 && w.startsWith(t)) best = 1
      }
      if (best === 0) { ok = false; break }
      score += best
    }
    if (ok) out.push({ index: i, score: score * 1000 - words.length })
  }
  out.sort((a, b) => b.score - a.score) // stable → canonical order within ties
  return out.slice(0, limit)
}
```

- [ ] **Step 3: Verify pass, commit** — `"feat: offline verse search with prefix ranking"` + trailer

---

### Task 4: Search panel

**Files:**
- Create: `src/components/Search.tsx`
- Modify: `src/index.css` (append)
- Test: `src/components/Search.test.tsx`

**Interfaces:**
- Consumes: `searchVerses`/`normalize` (Task 3), `ChapterContext` (Task 2), `VerseStore`, `BOOKS`, `refKey`.
- Produces: `Search({ verses, onClose }: { verses: VerseStore; onClose: () => void })` — full-screen panel; Task 7's menu opens it via App panel state `'search'`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Search.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { Search } from './Search'
import { ChapterContext } from './ChapterContext'
import { buildStore } from '../content/verseStore'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

test('short query shows guidance, real query shows ranked results with count', async () => {
  render(<Search verses={store} onClose={() => {}} />)
  expect(screen.getByText(/type a few letters/i)).toBeInTheDocument()
  await userEvent.type(screen.getByRole('searchbox'), 'eagles wings')
  await waitFor(() => expect(screen.getByText(/verses?$/i)).toBeInTheDocument(), { timeout: 2000 })
  expect(screen.getByText(/Isaiah 40:31/)).toBeInTheDocument()
})

test('no matches shows the warm empty state', async () => {
  render(<Search verses={store} onClose={() => {}} />)
  await userEvent.type(screen.getByRole('searchbox'), 'zxqvw')
  await waitFor(() => expect(screen.getByText(/no verses match yet/i)).toBeInTheDocument(), { timeout: 2000 })
})

test('tapping a result opens the chapter at that verse', async () => {
  const openChapter = vi.fn()
  render(
    <ChapterContext.Provider value={{ openChapter }}>
      <Search verses={store} onClose={() => {}} />
    </ChapterContext.Provider>,
  )
  await userEvent.type(screen.getByRole('searchbox'), 'eagles wings')
  await waitFor(() => screen.getByText(/Isaiah 40:31/), { timeout: 2000 })
  await userEvent.click(screen.getByText(/Isaiah 40:31/))
  expect(openChapter).toHaveBeenCalledWith('ISA', 40, 31)
})
```

- [ ] **Step 2: Verify failure, implement**

```tsx
// src/components/Search.tsx
import { useContext, useEffect, useState } from 'react'
import { searchVerses, normalize } from '../lib/search'
import { ChapterContext } from './ChapterContext'
import { BOOKS } from '../content/books'
import type { VerseStore } from '../content/verseStore'

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function Snippet({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>
  const re = new RegExp(`\\b(${terms.map(escapeRe).join('|')})`, 'ig')
  const parts = text.split(re)
  return (
    <>{parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p))}</>
  )
}

export function Search({ verses, onClose }: { verses: VerseStore; onClose: () => void }) {
  const { openChapter } = useContext(ChapterContext)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ index: number; score: number }[]>([])

  useEffect(() => {
    if (normalize(query).length < 3) { setResults([]); return }
    const t = setTimeout(() => setResults(searchVerses(verses, query)), 250)
    return () => clearTimeout(t)
  }, [query, verses])

  const terms = normalize(query).split(' ').filter((t) => t.length >= 2)
  const short = normalize(query).length < 3

  return (
    <div className="panel">
      <header className="panel-head">
        <h1>Search</h1>
        <button aria-label="Close" onClick={onClose}>✕</button>
      </header>
      <input type="search" role="searchbox" className="search-field" autoFocus
        placeholder="eagles wings…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {short && <p className="empty">Type a few letters and the Word starts looking.</p>}
      {!short && results.length === 0 && (
        <p className="empty">No verses match yet — try fewer or simpler words.</p>
      )}
      {results.length > 0 && (
        <>
          <p className="search-count">{results.length === 50 ? '50+' : results.length} verse{results.length === 1 ? '' : 's'}</p>
          {results.map(({ index }) => {
            const [b, c, v, text] = verses.list[index]
            return (
              <button key={`${b}${c}:${v}`} className="search-row"
                onClick={() => openChapter(b, c, v)}>
                <span className="search-ref">{BOOKS[b] ?? b} {c}:{v}</span>
                <span className="search-snippet"><Snippet text={text} terms={terms} /></span>
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}
```

Append to `src/index.css`:

```css
.search-field {
  width: 100%; padding: 0.85rem 1rem; border-radius: 0.8rem; font-size: 1.05rem;
  background: var(--surface); color: var(--text);
  border: 1px solid color-mix(in srgb, var(--text-dim) 30%, transparent);
  margin-bottom: 0.6rem;
}
.search-count { color: var(--text-dim); font-size: 0.85rem; margin: 0.4rem 0 0.6rem; }
.search-row {
  display: block; width: 100%; text-align: left; background: none; border: none;
  color: var(--text); cursor: pointer; padding: 0.75rem 0; min-height: 2.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--text-dim) 15%, transparent);
}
.search-ref { color: var(--accent); display: block; font-size: 0.9rem; margin-bottom: 0.2rem; }
.search-snippet { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 0.98rem; line-height: 1.5; }
.search-snippet strong { color: var(--accent); font-weight: 600; }
```

- [ ] **Step 3: Verify pass, commit** — `"feat: search panel with chapter-opening results"` + trailer

---

### Task 5: Feelings content pack

**Files:**
- Create: `src/content/feelings.json`
- Test: `src/content/feelings.test.ts`

**Interfaces:**
- Produces: `feelings.json` = array of `{ id: string; label: string; intro: string; refs: CuratedRef[] }` — 16 feelings, ids exactly: `anxious, overwhelmed, sad, depressed, lonely, tired, angry, afraid, panicked, guilty, doubting, grieving, hopeful, grateful, joyful, tempted`.

**Authoring rules (binding):** 12–15 refs per feeling, verified against the WEB corpus; ranges 2–10 verses; no within-feeling duplicate refs; cross-feeling overlap welcome; NONE of the five omitted variant verses used or spanned (LUK 17:36, ACT 8:37, ACT 15:34, ACT 24:7, ROM 16:25). Selection bar: passages that give God's presence and comfort, chosen with pastoral care — for depressed/grieving/panicked/guilty NO trite fix-it verses; think PSA 34:18, PSA 42, ISA 43:1–3, MAT 11:28–30, 2CO 1:3–4, ROM 8:38–39, 1KI 19 (Elijah fed before counseled), PSA 88 (honest darkness belongs in scripture), LAM 3:19–24. Intros: one empathetic sentence, 40–140 chars, meets the person where they are, never chipper about pain. Example shape:

```json
{
  "id": "anxious",
  "label": "Anxious",
  "intro": "You're not the first to lie awake at night — and you're not alone in it.",
  "refs": [["PHP", 4, 6, 7], ["MAT", 6, 25, 27], ["PSA", 94, 19], ["1PE", 5, 7]]
}
```

- [ ] **Step 1: Write the failing validation test**

```ts
// src/content/feelings.test.ts
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
```

- [ ] **Step 2: Author the pack** (16 × 12–15 refs + intros per the rules; verify doubtful refs against `public/content/verses.json` while authoring), iterate until `npm test` green
- [ ] **Step 3: Commit** — `"feat: feelings content pack — 16 feelings, verified passages"` + trailer

---

### Task 6: Feelings picker + results feed

**Files:**
- Create: `src/components/Feelings.tsx`
- Modify: `src/index.css` (append)
- Test: `src/components/Feelings.test.tsx`

**Interfaces:**
- Consumes: `feelings.json` (Task 5), `VerseCard`, `refLabel`/`refText`, `seededShuffle` (lib/rng), `getInstallSeed` (lib/store), `VerseStore`. NO persistence of selections (privacy: transient state only).
- Produces: `Feelings({ verses, onClose }: { verses: VerseStore; onClose: () => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Feelings.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { Feelings } from './Feelings'
import { buildStore } from '../content/verseStore'
import feelings from '../content/feelings.json'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

beforeEach(() => localStorage.clear())

test('picker shows prompt and 16 chips; button disabled until a selection', async () => {
  render(<Feelings verses={store} onClose={() => {}} />)
  expect(screen.getByText(/whatever you're carrying/i)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(16)
  const go = screen.getByRole('button', { name: /show me verses/i })
  expect(go).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Anxious' }))
  expect(go).toBeEnabled()
})

test('selecting a feeling yields intro card, its verses, and the closing card', async () => {
  render(<Feelings verses={store} onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: 'Anxious' }))
  await userEvent.click(screen.getByRole('button', { name: /show me verses/i }))
  const anxious = (feelings as { id: string; intro: string; refs: unknown[] }[]).find((f) => f.id === 'anxious')!
  expect(screen.getByText(anxious.intro)).toBeInTheDocument()
  const cards = document.querySelectorAll('.card')
  expect(cards.length).toBe(anxious.refs.length + 2) // intro + verses + closing
  expect(screen.getByText(/may these stay with you/i)).toBeInTheDocument()
})

test('multi-select dedupes overlapping refs and Back returns to the picker', async () => {
  render(<Feelings verses={store} onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: 'Sad' }))
  await userEvent.click(screen.getByRole('button', { name: 'Grieving' }))
  await userEvent.click(screen.getByRole('button', { name: /show me verses/i }))
  const refs = document.querySelectorAll('.verse-ref-btn')
  const labels = [...refs].map((r) => r.textContent)
  expect(new Set(labels).size).toBe(labels.length) // deduped
  await userEvent.click(screen.getByRole('button', { name: /back to feelings/i }))
  expect(screen.getByText(/whatever you're carrying/i)).toBeInTheDocument()
})

test('feelings selections are never persisted', async () => {
  render(<Feelings verses={store} onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: 'Depressed' }))
  await userEvent.click(screen.getByRole('button', { name: /show me verses/i }))
  const keys = Object.keys(localStorage).filter((k) => k !== 'bs:seed')
  expect(keys.filter((k) => /feel/i.test(k))).toEqual([])
})
```

- [ ] **Step 2: Verify failure, implement**

```tsx
// src/components/Feelings.tsx
import { useState } from 'react'
import { VerseCard } from './cards/VerseCard'
import { seededShuffle } from '../lib/rng'
import { getInstallSeed } from '../lib/store'
import { refLabel, refText, type VerseStore } from '../content/verseStore'
import feelings from '../content/feelings.json'
import type { CuratedRef } from '../content/types'

interface Feeling { id: string; label: string; intro: string; refs: CuratedRef[] }
const FEELINGS = feelings as Feeling[]

export function Feelings({ verses, onClose }: { verses: VerseStore; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [showing, setShowing] = useState(false)

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  if (!showing) {
    return (
      <div className="panel">
        <header className="panel-head">
          <h1>How are you feeling?</h1>
          <button aria-label="Close" onClick={onClose}>✕</button>
        </header>
        <p className="feel-prompt">Whatever you're carrying, the Word meets you there.</p>
        <div className="feel-chips">
          {FEELINGS.map((f) => (
            <button key={f.id} aria-pressed={selected.includes(f.id)}
              className={selected.includes(f.id) ? 'chip chip-on' : 'chip'}
              onClick={() => toggle(f.id)}>{f.label}</button>
          ))}
        </div>
        <button className="feel-go" disabled={selected.length === 0}
          onClick={() => setShowing(true)}>Show me verses</button>
      </div>
    )
  }

  const chosen = FEELINGS.filter((f) => selected.includes(f.id))
  const seen = new Set<string>()
  const refs: CuratedRef[] = []
  for (const f of chosen) for (const r of f.refs) {
    const k = r.join(':')
    if (!seen.has(k)) { seen.add(k); refs.push(r) }
  }
  const ids = [...selected].sort().join('+')
  const ordered = seededShuffle(refs, `${getInstallSeed()}:feel:${ids}`)
  const introText = chosen.length === 1
    ? chosen[0].intro
    : `For what you're carrying — ${chosen.map((f) => f.label.toLowerCase()).join(', ')} — the Word has a word.`

  return (
    <div className="panel feel-results">
      <header className="panel-head feel-results-head">
        <button aria-label="Back to feelings" onClick={() => setShowing(false)}>‹ Feelings</button>
        <span className="feel-tags">{chosen.map((f) => f.label).join(' · ')}</span>
        <button aria-label="Close" onClick={onClose}>✕</button>
      </header>
      <div className="feed feel-feed">
        <section className="slot"><article className="card theme-0">
          <div className="card-body">
            <div className="kicker">For you, right now</div>
            <p className="verse-text">{introText}</p>
          </div>
        </article></section>
        {ordered.map((r, i) => (
          <section className="slot" key={r.join(':')}>
            <VerseCard text={refText(verses, r)} label={refLabel(r)} theme={(i + 1) % 5} />
          </section>
        ))}
        <section className="slot"><article className="card theme-2">
          <div className="card-body">
            <p className="verse-text">May these stay with you — come back whenever you need them.</p>
            <button className="feel-go" onClick={() => setShowing(false)}>Back to feelings</button>
          </div>
        </article></section>
      </div>
    </div>
  )
}
```

Append to `src/index.css`:

```css
.feel-prompt { color: var(--text-dim); margin-bottom: 1.2rem; line-height: 1.5; }
.feel-chips { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1.6rem; }
.chip {
  padding: 0.6rem 1rem; border-radius: 999px; font-size: 0.98rem; cursor: pointer;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-dim) 30%, transparent);
  color: var(--text); min-height: 2.75rem;
}
.chip-on { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--surface)); }
.feel-go {
  display: block; width: 100%; padding: 0.9rem; border-radius: 0.8rem; font-size: 1.05rem;
  background: color-mix(in srgb, var(--accent) 20%, var(--surface));
  border: 1px solid var(--accent-soft); color: var(--text); cursor: pointer; min-height: 2.75rem;
}
.feel-go:disabled { opacity: 0.45; cursor: default; }
.feel-results { padding: 0; overflow: hidden; }
.feel-results-head {
  position: absolute; top: 0; left: 0; right: 0; z-index: 2; margin: 0;
  padding: calc(env(safe-area-inset-top) + 0.6rem) 1rem 0.6rem;
  background: linear-gradient(to bottom, color-mix(in srgb, var(--bg) 85%, transparent), transparent);
}
.feel-results-head button { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 1rem; min-height: 2.75rem; }
.feel-tags { color: var(--accent); font-size: 0.9rem; align-self: center; }
.feel-feed { height: 100dvh; }
```

- [ ] **Step 3: Verify pass, commit** — `"feat: feelings picker and curated verse feed"` + trailer

---

### Task 7: Menu + App wiring + Favorites chapter entry

**Files:**
- Create: `src/components/Menu.tsx`
- Modify: `src/components/TopBar.tsx`, `src/App.tsx`, `src/components/Favorites.tsx`, `src/index.css` (append)
- Test: `src/components/Menu.test.tsx` (new), `src/components/Favorites.test.tsx` (extend)

**Interfaces:**
- Consumes: everything above. App `panel` union becomes `'favorites' | 'about' | 'feelings' | 'search' | null`.
- Produces: `Menu({ onNavigate, onClose }: { onNavigate: (p: 'feelings' | 'search' | 'favorites' | 'about') => void; onClose: () => void })`; `TopBar({ streak, score, onMenu })` (replaces `onFavorites`/`onAbout`).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/Menu.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Menu } from './Menu'

test('menu lists the four destinations and navigates', async () => {
  const onNavigate = vi.fn(); const onClose = vi.fn()
  render(<Menu onNavigate={onNavigate} onClose={onClose} />)
  for (const label of [/how are you feeling/i, /search/i, /saved/i, /about/i]) {
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
  }
  await userEvent.click(screen.getByRole('button', { name: /how are you feeling/i }))
  expect(onNavigate).toHaveBeenCalledWith('feelings')
})

test('tapping the scrim closes the menu', async () => {
  const onClose = vi.fn()
  const { container } = render(<Menu onNavigate={() => {}} onClose={onClose} />)
  await userEvent.click(container.querySelector('.menu-scrim')!)
  expect(onClose).toHaveBeenCalled()
})
```

```tsx
// append to src/components/Favorites.test.tsx
import { ChapterContext } from './ChapterContext'

test('tapping a saved verse opens its chapter', async () => {
  toggleFavorite({ kind: 'verse', id: 'John 3:16', title: 'John 3:16', body: 'For God so loved…' })
  const openChapter = vi.fn()
  render(
    <ChapterContext.Provider value={{ openChapter }}>
      <Favorites onClose={() => {}} />
    </ChapterContext.Provider>,
  )
  await userEvent.click(screen.getByText('John 3:16'))
  expect(openChapter).toHaveBeenCalledWith('JHN', 3, 16)
})
```

- [ ] **Step 2: Verify failure, implement**

```tsx
// src/components/Menu.tsx
export function Menu({ onNavigate, onClose }: {
  onNavigate: (p: 'feelings' | 'search' | 'favorites' | 'about') => void
  onClose: () => void
}) {
  const go = (p: 'feelings' | 'search' | 'favorites' | 'about') => { onNavigate(p); onClose() }
  return (
    <>
      <div className="menu-scrim" onClick={onClose} />
      <nav className="menu-sheet" aria-label="Menu">
        <button onClick={() => go('feelings')}>How are you feeling?</button>
        <button onClick={() => go('search')}>Search</button>
        <button onClick={() => go('favorites')}>Saved</button>
        <button onClick={() => go('about')}>About</button>
      </nav>
    </>
  )
}
```

`TopBar.tsx` — replace the two action buttons:

```tsx
export function TopBar({ streak, score, onMenu }: {
  streak: number; score: number; onMenu: () => void
}) {
  return (
    <header className="topbar">
      <span className="brand">BibleScroll</span>
      <span className="stats">
        <span title="Daily streak">🔥 {streak}</span>
        <span title={`Trivia score — ${scoreTitle(score)}`}>✓ {score}</span>
      </span>
      <span className="topbar-actions">
        <button aria-label="Menu" onClick={onMenu}>☰</button>
      </span>
    </header>
  )
}
```

`App.tsx`:

```tsx
const [panel, setPanel] = useState<'favorites' | 'about' | 'feelings' | 'search' | null>(null)
const [menuOpen, setMenuOpen] = useState(false)
// TopBar: <TopBar streak={streak} score={score} onMenu={() => setMenuOpen((o) => !o)} />
// after Feed, alongside existing panels:
{menuOpen && <Menu onNavigate={setPanel} onClose={() => setMenuOpen(false)} />}
{panel === 'feelings' && <Feelings verses={verses} onClose={() => setPanel(null)} />}
{panel === 'search' && <Search verses={verses} onClose={() => setPanel(null)} />}
```

`Favorites.tsx` — make verse rows open their chapter:

```tsx
// add imports: useContext, ChapterContext, parseRefLabel from '../content/verseStore'
// inside component: const { openChapter } = useContext(ChapterContext)
// wrap the row's text block in a button for verse-kind favorites:
{f.kind === 'verse' ? (
  <button className="fav-open" onClick={() => {
    const r = parseRefLabel(f.id)
    if (r) openChapter(r.b, r.c, r.v)
  }}>
    <div className="fav-title">{f.title}</div>
    <div className="fav-body">{f.body}</div>
  </button>
) : (
  <div>
    <div className="fav-title">{f.title}</div>
    <div className="fav-body">{f.body}</div>
  </div>
)}
```

Append to `src/index.css`:

```css
.menu-scrim { position: fixed; inset: 0; z-index: 15; }
.menu-sheet {
  --bg: #12151c; --text: #e8e4da; --text-dim: #a49e90;
  position: fixed; z-index: 16; right: 0.6rem;
  top: calc(env(safe-area-inset-top) + 3.4rem);
  display: flex; flex-direction: column; min-width: 15rem;
  background: color-mix(in srgb, var(--bg) 96%, white);
  border: 1px solid color-mix(in srgb, var(--text-dim) 25%, transparent);
  border-radius: 0.9rem; overflow: hidden; animation: fadein 0.18s ease;
  box-shadow: 0 8px 30px rgba(0,0,0,0.45);
}
.menu-sheet button {
  background: none; border: none; color: var(--text); font-size: 1.02rem;
  text-align: left; padding: 0.95rem 1.2rem; cursor: pointer; min-height: 2.75rem;
}
.menu-sheet button:not(:last-child) { border-bottom: 1px solid color-mix(in srgb, var(--text-dim) 14%, transparent); }
.fav-open { background: none; border: none; color: var(--text); text-align: left; padding: 0; cursor: pointer; flex: 1; }
```

- [ ] **Step 3: Full suite + build** — `npm test`, `npm run build`. Note: TopBar's old aria-labels ("Favorites", "About") disappear — if any existing test queried them, update it to open via the menu instead.
- [ ] **Step 4: Commit** — `"feat: top-bar menu, app wiring, favorites open chapters"` + trailer

---

### Task 8: README, verification, deploy

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Add three bullets to README's feature list: verses for how you're feeling (16 feelings, hand-curated); tap any reference to read the full chapter; offline search across all 31,098 verses.
- [ ] **Step 2:** `npm test` + `npm run build` — green/clean. Manual smoke via `npm run dev`: menu opens; feelings flow end-to-end; chapter sheet from feed card, search result, and saved verse; search debounce feels right.
- [ ] **Step 3:** (Controller runs the final whole-feature review before this step per SDD process.) `git push origin main`; watch the Actions run to success; `curl -sI https://rfhacker.github.io/biblescroll/ | head -1` → 200; confirm the new JS bundle hash is live.

---

## Verification (after all tasks)

- Full suite green; build clean; deploy verified live.
- On-device: pick "anxious" → verses arrive warm and relevant; tap a reference mid-feed at night — chapter opens without blinding; search "eagles wings" → Isaiah 40:31 two taps from the feed.
