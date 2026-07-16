# Tappable Pack References Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trivia, fact, and map cards' scripture references become tappable (like verse cards), opening the chapter sheet at the first cited verse; a pack-wide validation test guarantees every ref parses and resolves.

**Architecture:** A forgiving `parseLooseRef` in `verseStore.ts` (handles hyphen ranges, en dashes, multi-passage "A; B" citations, cross-chapter ranges, and book-name aliases) + one shared `RefButton` component consumed by all three cards. Multi-passage citations open the FIRST passage.

**Tech Stack:** Existing app; no new dependencies.

## Global Constraints

- Do NOT push until the final task. Commits end with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (`[co-author trailer]` below).
- Tap targets ≥ 44px; gold ref styling + `›` affordance matches verse cards; unparseable ref renders as a safe no-op button (never crashes).
- Test command `npm test`; suite currently 125/125.

---

### Task 1: `parseLooseRef` + pack-wide ref validation

**Files:**
- Modify: `src/content/verseStore.ts`
- Test: `src/content/verseStore.test.ts` (extend), `src/content/pack-refs.test.ts` (new)

**Interfaces:**
- Consumes: existing `NAME_TO_CODE`, `refKey`, `VerseStore.chapters`.
- Produces: `parseLooseRef(ref: string): { b: string; c: number; v: number } | null` — first book/chapter/verse of any prose citation. Task 2 consumes this exact name.

- [ ] **Step 1: Write the failing tests**

Append to `src/content/verseStore.test.ts`:

```ts
import { parseLooseRef } from './verseStore'

test('parseLooseRef reads prose citation shapes', () => {
  expect(parseLooseRef('1 Samuel 17:40')).toEqual({ b: '1SA', c: 17, v: 40 })
  expect(parseLooseRef('Acts 1:1-2')).toEqual({ b: 'ACT', c: 1, v: 1 })
  expect(parseLooseRef('Acts 10:44-48; 11:17-18')).toEqual({ b: 'ACT', c: 10, v: 44 })
  expect(parseLooseRef('Exodus 12:37-19:2; Numbers 33:36')).toEqual({ b: 'EXO', c: 12, v: 37 })
  expect(parseLooseRef('Psalms 23:1–6')).toEqual({ b: 'PSA', c: 23, v: 1 })
  expect(parseLooseRef('Psalm 117:1')).toEqual({ b: 'PSA', c: 117, v: 1 })   // alias
  expect(parseLooseRef('Song of Songs 2:1')).toEqual({ b: 'SNG', c: 2, v: 1 }) // alias
  expect(parseLooseRef('Atlantis 3:16')).toBeNull()
  expect(parseLooseRef('John')).toBeNull()
})
```

New `src/content/pack-refs.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { buildStore, parseLooseRef, refKey } from './verseStore'
import trivia from './trivia.json'
import facts from './facts.json'
import maps from './maps.json'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const allRefs: { src: string; ref: string }[] = [
  ...(trivia as { id: string; ref: string }[]).map((t) => ({ src: `trivia ${t.id}`, ref: t.ref })),
  ...(facts as { id: string; ref: string }[]).map((f) => ({ src: `facts ${f.id}`, ref: f.ref })),
  ...(maps as { id: string; ref: string }[]).map((m) => ({ src: `maps ${m.id}`, ref: m.ref })),
]

test('every pack ref parses and resolves to a real chapter and verse', () => {
  for (const { src, ref } of allRefs) {
    const r = parseLooseRef(ref)
    expect(r, `${src}: "${ref}" did not parse`).not.toBeNull()
    expect(store.chapters.has(`${r!.b} ${r!.c}`), `${src}: "${ref}" chapter missing`).toBe(true)
    expect(store.byKey.has(refKey(r!.b, r!.c, r!.v)), `${src}: "${ref}" verse missing`).toBe(true)
  }
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/content` → FAIL (parseLooseRef not exported)

- [ ] **Step 3: Implement** (append to `src/content/verseStore.ts`, near `parseRefLabel`)

```ts
// Common book-name variants found in prose citations (packs use display names,
// but singular/alternate forms are natural when authoring).
const BOOK_ALIASES: Record<string, string> = {
  Psalm: 'PSA',
  'Song of Songs': 'SNG',
  Canticles: 'SNG',
}

// Forgiving parser for prose citations: "1 Samuel 17:40", "Acts 1:1-2",
// "Acts 10:44-48; 11:17-18", "Exodus 12:37-19:2", "Psalms 23:1–6".
// Returns the FIRST cited book/chapter/verse; null when unrecognizable.
export function parseLooseRef(ref: string): { b: string; c: number; v: number } | null {
  const first = ref.split(';')[0].trim()
  const m = first.match(/^(.+?)\s+(\d+):(\d+)/)
  if (!m) return null
  const name = m[1].trim()
  const b = NAME_TO_CODE.get(name) ?? BOOK_ALIASES[name]
  if (!b) return null
  return { b, c: Number(m[2]), v: Number(m[3]) }
}
```

- [ ] **Step 4: Run the pack validation** — if any pack ref fails, fix it: add an alias when it's a legitimate book-name variant; correct the data in the pack JSON when the ref itself is malformed (record every data fix in the report; content meaning must not change — formatting only).
- [ ] **Step 5: Full suite** — `npm test` → PASS
- [ ] **Step 6: Commit** — `"feat: loose citation parser with pack-wide ref validation"` + trailer

---

### Task 2: `RefButton` + wire the three cards

**Files:**
- Create: `src/components/cards/RefButton.tsx`
- Modify: `src/components/cards/TriviaCard.tsx`, `src/components/cards/FactCard.tsx`, `src/components/cards/MapCard.tsx`
- Test: `src/components/cards/RefButton.test.tsx` (new); extend `TriviaCard.test.tsx` and `cards.test.tsx` minimally

**Interfaces:**
- Consumes: `parseLooseRef` (Task 1), `ChapterContext`.
- Produces: `RefButton({ refString }: { refString: string })` — gold ref button with `›`, opens chapter at first cited verse; safe no-op when unparseable.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/cards/RefButton.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RefButton } from './RefButton'
import { ChapterContext } from '../ChapterContext'

test('opens the chapter at the first cited verse', async () => {
  const openChapter = vi.fn()
  render(
    <ChapterContext.Provider value={{ openChapter }}>
      <RefButton refString="Acts 10:44-48; 11:17-18" />
    </ChapterContext.Provider>,
  )
  await userEvent.click(screen.getByRole('button', { name: /Acts 10:44-48/ }))
  expect(openChapter).toHaveBeenCalledWith('ACT', 10, 44)
})

test('unparseable ref renders but no-ops', async () => {
  const openChapter = vi.fn()
  render(
    <ChapterContext.Provider value={{ openChapter }}>
      <RefButton refString="Traditional saying" />
    </ChapterContext.Provider>,
  )
  await userEvent.click(screen.getByRole('button', { name: /Traditional saying/ }))
  expect(openChapter).not.toHaveBeenCalled()
})
```

Extend `TriviaCard.test.tsx` (uses the existing test item, ref "1 Samuel 17:40"): after answering, tap the ref button → `openChapter` called with `('1SA', 17, 40)` (wrap render in a ChapterContext provider). Extend `cards.test.tsx`: FactCard's ref ("John 11:35" in the existing fixture) tap → `('JHN', 11, 35)`.

- [ ] **Step 2: Verify failure, implement**

```tsx
// src/components/cards/RefButton.tsx
import { useContext } from 'react'
import { ChapterContext } from '../ChapterContext'
import { parseLooseRef } from '../../content/verseStore'

export function RefButton({ refString }: { refString: string }) {
  const { openChapter } = useContext(ChapterContext)
  const r = parseLooseRef(refString)
  return (
    <button className="verse-ref verse-ref-btn"
      onClick={() => { if (r) openChapter(r.b, r.c, r.v) }}>
      {refString} ›
    </button>
  )
}
```

Wiring (each card swaps its plain ref for the button):
- `FactCard.tsx`: `<p className="verse-ref">{fact.ref}</p>` → `<RefButton refString={fact.ref} />`
- `MapCard.tsx`: `<p className="verse-ref">{story.ref}</p>` → `<RefButton refString={story.ref} />`
- `TriviaCard.tsx`: in the answered explanation, `<span className="verse-ref">{item.ref}</span>` → `<RefButton refString={item.ref} />` (button inside `<p>` is valid HTML).

No new CSS needed — `.verse-ref.verse-ref-btn` already styles gold text, padding, and the ≥44px min-height.

- [ ] **Step 3: Full suite + build** — `npm test`, `npm run build` → PASS/clean
- [ ] **Step 4: Commit** — `"feat: tappable scripture references on trivia, fact, and map cards"` + trailer

---

### Task 3: Verify + deploy

- [ ] **Step 1:** `npm test` + `npm run build`; quick dev-server sanity (trivia ref opens sheet after answering; map ref opens sheet).
- [ ] **Step 2:** (Controller runs a focused final check.) Push; watch Actions to success; `curl -sI https://jesusfeed.com/ | head -1` → 200; confirm new bundle hash live.
