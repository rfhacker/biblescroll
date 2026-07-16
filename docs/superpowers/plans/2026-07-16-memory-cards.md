# Memory Verse Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill-in-the-blank memory-verse cards as a new feed kind — word-bank play over the curated verses, perfect fills scoring once ever, zero new content pipelines.

**Architecture:** Pure seeded helpers in `lib/memory.ts` (blank picking + word bank), a `MemoryCard` with in-order fill play persisted via `bs:memorized`, a `'memory'` kind in the 12-slot feed cycle, resolve wiring.

**Tech Stack:** Existing app; no new dependencies.

## Global Constraints

- Blanks: significant words only (≥4 letters post-punctuation-strip, not stopwords), no two adjacent, count 2/<15 words, 3/15–28, 4/>28, min 1; deterministic per (text, seed).
- Bank: answers + count+2 distractors from other curated verses, case-insensitive dedupe vs answers, seeded shuffle.
- Fill IN ORDER; wrong chip shakes (reduced-motion: static `.wrong` highlight, no animation) and stays; matching case-insensitive.
- Completion copy exactly: `Hidden in your heart ✓`; RefButton to chapter; perfect fill → `addScore(1)` once ever via `bs:memorized` (persist completion regardless of mistakes; score only if perfect at completion time).
- Cycle exactly: `verse, fact, verse, trivia, verse, map, verse, fact, verse, memory, verse, trivia`; PER_CYCLE verse 6, fact 2, trivia 2, map 1, memory 1; curated/corpus 7-of-10 verse split unchanged.
- TopBar score tooltip → `Score — ${scoreTitle(score)}`.
- Do NOT push until the final task. Trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (`[co-author trailer]`). Suite currently 192/192.

---

### Task 1: `lib/memory.ts`

**Files:**
- Create: `src/lib/memory.ts`
- Test: `src/lib/memory.test.ts`

**Interfaces:**
- Produces (Task 2 consumes exactly):
  ```ts
  export interface MemoryPuzzle {
    words: string[]          // verse tokenized on whitespace, original punctuation kept
    blankIndexes: number[]   // ascending indices into words
    answers: string[]        // the clean (punctuation-stripped) forms, in blank order
    bank: string[]           // answers + distractors, seeded-shuffled, clean forms
  }
  export function buildPuzzle(text: string, distractorSource: string[], seed: string): MemoryPuzzle
  export function cleanWord(w: string): string   // strip leading/trailing punctuation, keep inner apostrophes
  export const DISTRACTOR_TEXTS: string[]        // ~15 famous WEB verse texts (universal distractor vocabulary)
  ```
  `distractorSource` = array of other verses' TEXTS. `DISTRACTOR_TEXTS` is the
  card's default source: copy ~15 well-known verse texts VERBATIM from
  `public/content/verses.json` during implementation (JHN 3:16, PSA 23:1,
  PRO 3:5, ISA 40:31, ROM 8:28, PHP 4:6, HEB 11:1, MAT 11:28, PSA 46:1,
  JER 29:11, GAL 5:22, EPH 2:8, 2TI 1:7 is omitted-risk—skip, use PSA 119:105,
  1CO 13:4, JHN 14:6) and add a test: `DISTRACTOR_TEXTS.length >= 15` and every
  entry length > 20.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/memory.test.ts
import { buildPuzzle, cleanWord } from './memory'

const VERSE = 'The Lord is my shepherd: I shall lack nothing.'          // 9 words → 2 blanks
const LONG = Array.from({ length: 30 }, (_, i) => `wonderful${i}`).join(' ') // 30 words → 4 blanks
const OTHERS = ['For God so loved the world that he gave his only Son.',
  'Trust in the Lord with all your heart and lean not on your own understanding.']

test('cleanWord strips edge punctuation, keeps inner apostrophes', () => {
  expect(cleanWord('shepherd:')).toBe('shepherd')
  expect(cleanWord('“Come,')).toBe('Come')
  expect(cleanWord("don’t")).toBe("don’t")
})

test('puzzle is deterministic per seed and differs across seeds', () => {
  const a = buildPuzzle(VERSE, OTHERS, 's1')
  const b = buildPuzzle(VERSE, OTHERS, 's1')
  expect(b).toEqual(a)
  const c = buildPuzzle(VERSE, OTHERS, 's2')
  expect(JSON.stringify(c)).not.toBe(JSON.stringify(a))
})

test('blanks are significant, non-adjacent, count follows length', () => {
  const p = buildPuzzle(VERSE, OTHERS, 's1')
  expect(p.blankIndexes).toHaveLength(2)
  for (let i = 1; i < p.blankIndexes.length; i++) {
    expect(p.blankIndexes[i] - p.blankIndexes[i - 1]).toBeGreaterThan(1)
  }
  for (const bi of p.blankIndexes) {
    const w = cleanWord(p.words[bi])
    expect(w.length).toBeGreaterThanOrEqual(4)
    expect(['the', 'that', 'with', 'your', 'shall']).not.toContain(w.toLowerCase())
  }
  expect(buildPuzzle(LONG, OTHERS, 's1').blankIndexes).toHaveLength(4)
})

test('bank contains all answers plus distractors, deduped case-insensitively', () => {
  const p = buildPuzzle(VERSE, OTHERS, 's1')
  // answers + up to (answers.length + 2) distractors, capped by available unique pool
  expect(p.bank.length).toBeGreaterThanOrEqual(p.answers.length + 2)
  expect(p.bank.length).toBeLessThanOrEqual(p.answers.length * 2 + 2)
  for (const a of p.answers) expect(p.bank).toContain(a)
  const lower = p.bank.map((w) => w.toLowerCase())
  expect(new Set(lower).size).toBe(lower.length)
  // distractors come from the other texts' significant words
  const sourceWords = new Set(OTHERS.join(' ').split(/\s+/).map((w) => cleanWord(w).toLowerCase()))
  for (const w of p.bank) {
    if (!p.answers.includes(w)) expect(sourceWords.has(w.toLowerCase())).toBe(true)
  }
})

test('verse with few significant words still yields at least one blank', () => {
  const p = buildPuzzle('And he said to me, it is done.', OTHERS, 's1')
  expect(p.blankIndexes.length).toBeGreaterThanOrEqual(1)
})
```

- [ ] **Step 2: Verify failure, implement**

```ts
// src/lib/memory.ts
import { seededShuffle, hashString, mulberry32 } from './rng'

const STOPWORDS = new Set([
  'the', 'and', 'that', 'with', 'your', 'shall', 'will', 'from', 'unto', 'them',
  'they', 'this', 'have', 'were', 'when', 'their', 'been', 'over', 'into', 'upon',
  'which', 'there', 'because', 'therefore', 'before', 'after', 'about', 'against',
])

export interface MemoryPuzzle {
  words: string[]
  blankIndexes: number[]
  answers: string[]
  bank: string[]
}

export function cleanWord(w: string): string {
  return w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}’']+$/gu, '')
}

function isSignificant(w: string): boolean {
  const c = cleanWord(w)
  return c.length >= 4 && !STOPWORDS.has(c.toLowerCase())
}

function blankCount(wordCount: number): number {
  if (wordCount < 15) return 2
  if (wordCount <= 28) return 3
  return 4
}

export function buildPuzzle(text: string, distractorSource: string[], seed: string): MemoryPuzzle {
  const words = text.split(/\s+/).filter(Boolean)
  const candidates = words.map((w, i) => ({ w, i })).filter(({ w }) => isSignificant(w))
  const want = Math.min(blankCount(words.length), candidates.length)

  // Seeded pick, enforcing non-adjacency greedily.
  const shuffled = seededShuffle(candidates, `${seed}:blanks`)
  const chosen: number[] = []
  for (const { i } of shuffled) {
    if (chosen.length >= want) break
    if (chosen.some((c) => Math.abs(c - i) <= 1)) continue
    chosen.push(i)
  }
  if (chosen.length === 0 && candidates.length > 0) chosen.push(candidates[0].i)
  chosen.sort((a, b) => a - b)

  const answers = chosen.map((i) => cleanWord(words[i]))
  const answerSet = new Set(answers.map((a) => a.toLowerCase()))

  const pool: string[] = []
  const poolSeen = new Set<string>()
  for (const t of distractorSource) {
    for (const w of t.split(/\s+/)) {
      if (!isSignificant(w)) continue
      const c = cleanWord(w)
      const lower = c.toLowerCase()
      if (answerSet.has(lower) || poolSeen.has(lower)) continue
      poolSeen.add(lower)
      pool.push(c)
    }
  }
  const distractors = seededShuffle(pool, `${seed}:bank`).slice(0, answers.length + 2)
  const bank = seededShuffle([...answers, ...distractors], `${seed}:mix`)
  return { words, blankIndexes: chosen, answers, bank }
}

export const DISTRACTOR_TEXTS: string[] = [
  // ~15 famous WEB verse texts, copied verbatim from public/content/verses.json
  // at implementation time (see the Interfaces note for the ref list).
]
```

(Only `seededShuffle` is imported from rng — no unused imports. Populate
DISTRACTOR_TEXTS with the actual WEB texts; the placeholder array above is the
one part of this block you must fill from the corpus.)

- [ ] **Step 3: Full suite** — `npm test` → PASS
- [ ] **Step 4: Commit** — `"feat: seeded memory-verse puzzle builder"` + trailer

---

### Task 2: `bs:memorized` + MemoryCard

**Files:**
- Create: `src/components/cards/MemoryCard.tsx`
- Modify: `src/lib/store.ts`, `src/index.css` (append)
- Test: `src/components/cards/MemoryCard.test.tsx`, `src/lib/store.test.ts` (extend)

**Interfaces:**
- store: `isMemorized(id: string): boolean`, `setMemorized(id: string): void` — key `bs:memorized`, `Record<string, 1>`, validated like `bs:answered`.
- `MemoryCard({ text, label, seed, theme, onScore }: { text: string; label: string; seed: string; theme: number; onScore: () => void })` — Task 3's resolve consumes exactly this.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/cards/MemoryCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildPuzzle } from '../../lib/memory'

const TEXT = 'The Lord is my shepherd: I shall lack nothing.'
const LABEL = 'Psalms 23:1'

// The card derives its puzzle from (text, seed); tests derive the same
// puzzle to know which chips are answers vs distractors.
function expectedPuzzle(seed: string) {
  return buildPuzzle(TEXT, [
    'For God so loved the world that he gave his only Son.',
    'Trust in the Lord with all your heart and lean not on your own understanding.',
  ], seed)
}

beforeEach(() => { localStorage.clear(); vi.resetModules() })

async function freshCard(seed = 'ms1') {
  const { MemoryCard } = await import('./MemoryCard')
  const storeLib = await import('../../lib/store')
  const onScore = vi.fn()
  render(<MemoryCard text={TEXT} label={LABEL} seed={seed} theme={0} onScore={onScore} />)
  return { onScore, storeLib }
}

test('renders blanks and a word bank; correct taps fill in order', async () => {
  const { storeLib } = await freshCard()
  const p = expectedPuzzle('ms1')
  expect(screen.getAllByText('______')).toHaveLength(p.blankIndexes.length)
  for (const a of p.answers) {
    await userEvent.click(screen.getByRole('button', { name: a }))
  }
  expect(screen.getByText(/hidden in your heart/i)).toBeInTheDocument()
  expect(storeLib.getScore()).toBe(1) // perfect fill
})

test('wrong chip stays, marks mistake, and prevents the perfect point', async () => {
  const { onScore, storeLib } = await freshCard()
  const p = expectedPuzzle('ms1')
  const wrong = p.bank.find((w) => !p.answers.includes(w))!
  await userEvent.click(screen.getByRole('button', { name: wrong }))
  expect(screen.getByRole('button', { name: wrong })).toBeInTheDocument() // stays
  for (const a of p.answers) await userEvent.click(screen.getByRole('button', { name: a }))
  expect(screen.getByText(/hidden in your heart/i)).toBeInTheDocument()
  expect(storeLib.getScore()).toBe(0)
  expect(onScore).not.toHaveBeenCalled()
})

test('completed card remounts completed and never re-awards', async () => {
  const { storeLib } = await freshCard()
  const p = expectedPuzzle('ms1')
  for (const a of p.answers) await userEvent.click(screen.getByRole('button', { name: a }))
  expect(storeLib.getScore()).toBe(1)
  const { cleanup } = await import('@testing-library/react')
  cleanup()
  const { MemoryCard } = await import('./MemoryCard')
  render(<MemoryCard text={TEXT} label={LABEL} seed="ms1" theme={0} onScore={() => {}} />)
  expect(screen.getByText(/hidden in your heart/i)).toBeInTheDocument()
  expect(screen.queryByText('______')).toBeNull()
  expect(storeLib.getScore()).toBe(1) // unchanged
})
```

Append to `src/lib/store.test.ts` (fresh-module idiom):

```ts
test('memorized ids round-trip and reject corrupt data', async () => {
  vi.resetModules()
  localStorage.clear()
  const s = await import('./store')
  expect(s.isMemorized('Psalms 23:1')).toBe(false)
  s.setMemorized('Psalms 23:1')
  expect(s.isMemorized('Psalms 23:1')).toBe(true)
  localStorage.setItem('bs:memorized', '{broken')
  vi.resetModules()
  const s2 = await import('./store')
  expect(s2.isMemorized('Psalms 23:1')).toBe(false)
})
```

- [ ] **Step 2: Verify failure, implement**

store.ts additions (mirror the `bs:answered` pattern incl. validator):

```ts
export function isMemorized(id: string): boolean {
  const rec = readJSON<Record<string, number>>('bs:memorized', (v) =>
    typeof v === 'object' && v !== null && !Array.isArray(v) &&
    Object.values(v as Record<string, unknown>).every((x) => typeof x === 'number'))
  return !!rec?.[id]
}
export function setMemorized(id: string): void {
  const rec = readJSON<Record<string, number>>('bs:memorized', (v) =>
    typeof v === 'object' && v !== null && !Array.isArray(v)) ?? {}
  rec[id] = 1
  write('bs:memorized', JSON.stringify(rec))
}
```

```tsx
import { useMemo, useState } from 'react'
import { RefButton } from './RefButton'
import { buildPuzzle, DISTRACTOR_TEXTS, cleanWord } from '../../lib/memory'
import { addScore, isMemorized, setMemorized } from '../../lib/store'

export function MemoryCard({ text, label, seed, theme, onScore }: {
  text: string; label: string; seed: string; theme: number; onScore: () => void
}) {
  const puzzle = useMemo(() => buildPuzzle(text, DISTRACTOR_TEXTS, seed), [text, seed])
  const [done, setDone] = useState(() => isMemorized(label))
  const [filled, setFilled] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [used, setUsed] = useState<Set<number>>(new Set())
  const [shakeIdx, setShakeIdx] = useState<number | null>(null)

  function tap(chipIdx: number) {
    if (done) return
    const expected = puzzle.answers[filled]
    if (puzzle.bank[chipIdx].toLowerCase() === expected.toLowerCase()) {
      const next = filled + 1
      setUsed((u) => new Set(u).add(chipIdx))
      setFilled(next)
      setShakeIdx(null)
      if (next === puzzle.answers.length) {
        setDone(true)
        setMemorized(label)
        if (mistakes === 0) { addScore(1); onScore() }
      }
    } else {
      setMistakes((m) => m + 1)
      setShakeIdx(chipIdx)
    }
  }

  const blanksFilled = new Set(puzzle.blankIndexes.slice(0, filled))

  return (
    <article className={`card theme-${theme}`}>
      <div className="card-body">
        <div className="kicker">Memory Verse</div>
        {!done && <p className="memory-hint">Fill in the missing words</p>}
        <p className="verse-text">
          {puzzle.words.map((w, i) => {
            const bi = puzzle.blankIndexes.indexOf(i)
            if (done || bi === -1 || blanksFilled.has(i)) {
              const isBlankWord = bi !== -1
              return <span key={i} className={isBlankWord ? 'memory-filled' : undefined}>{w} </span>
            }
            const isNext = puzzle.blankIndexes[filled] === i
            return <span key={i} className={isNext ? 'memory-blank memory-next' : 'memory-blank'}>{'______'} </span>
          })}
        </p>
        {!done && (
          <div className="memory-bank">
            {puzzle.bank.map((w, i) => used.has(i) ? null : (
              <button key={i} className={shakeIdx === i ? 'chip memory-wrong' : 'chip'}
                onClick={() => tap(i)}>{w}</button>
            ))}
          </div>
        )}
        {done && <p className="memory-done">Hidden in your heart ✓</p>}
        <RefButton refString={label} />
      </div>
    </article>
  )
}
```

Note on the remount-completed state: `done` initialized from `isMemorized`
renders ALL words (including blanked ones) via the `done ||` branch — the
full verse shows, no bank, affirmation shown. Matching is case-insensitive
per the tap comparison. `filled` indexes `answers` in order; `blanksFilled`
derives from slice — blanks fill left-to-right by construction (answers are
in ascending blank order from the lib).

CSS append:

```css
.memory-hint { color: var(--text-dim); font-size: 0.95rem; margin-bottom: 0.8rem; }
.memory-blank { color: var(--accent-soft); letter-spacing: 0.05em; }
.memory-next { color: var(--accent); animation: memorypulse 2.4s ease-in-out infinite; }
@keyframes memorypulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
.memory-filled { color: var(--accent); }
.memory-bank { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1.2rem; }
.memory-wrong { border-color: var(--bad); animation: memshake 0.3s ease; }
@keyframes memshake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
.memory-done { margin-top: 1.1rem; color: var(--good); font-size: 1.05rem; }
@media (prefers-reduced-motion: reduce) {
  .memory-next, .memory-wrong { animation: none; }
}
```

- [ ] **Step 3: Full suite** — `npm test` → PASS; no act() warnings
- [ ] **Step 4: Commit** — `"feat: memory verse card with word-bank play"` + trailer

---

### Task 3: Feed cycle + resolve + TopBar tooltip

**Files:**
- Modify: `src/lib/feed.ts`, `src/lib/feed.test.ts`, `src/components/cards/resolve.tsx`, `src/components/TopBar.tsx`
- Test: extend `src/lib/feed.test.ts`; `src/components/Feed.test.tsx` sanity

**Interfaces:**
- `FeedItem.kind` gains `'memory'`; pool `'memory'`; `PoolSizes` gains `memory: number` (= curated size, set in resolve's POOL_SIZES and Feed's sizes spread automatically).

- [ ] **Step 1: Update feed.ts**

```ts
const CYCLE = ['verse', 'fact', 'verse', 'trivia', 'verse', 'map', 'verse', 'fact', 'verse', 'memory', 'verse', 'trivia'] as const
const PER_CYCLE = { verse: 6, fact: 2, trivia: 2, map: 1, memory: 1 } as const
```

Widen the `FeedItem` kind/pool unions with `'memory'`; `PoolSizes` gains `memory`. The generic non-verse branch already handles any kind via `sizes[kind]`.

- [ ] **Step 2: Update feed.test.ts** — SIZES gains `memory: 280`; the cycle test becomes 1..12 with the new pattern; add: memory pool no-repeat until exhaustion (mirror the fact test); verse 70/30 split test unchanged (must still pass — the split is occurrence-based).
- [ ] **Step 3: resolve.tsx** — `POOL_SIZES` gains `memory: (curated as CuratedRef[]).length`; add:

```tsx
    case 'memory': {
      const ref = (curated as CuratedRef[])[item.poolIndex]
      return (
        <MemoryCard text={refText(verses, ref)} label={refLabel(ref)}
          seed={`mem:${item.poolIndex}`} theme={theme} onScore={onScore} />
      )
    }
```

(Seed uses the pool index — deterministic per card within a session; pool
order itself reshuffles per session seed, so blank patterns vary session to
session. resolve has no session seed — `mem:${item.poolIndex}` is stable per
verse, acceptable: the POOL ORDER varies; if reviewers judge stable blanks
per verse a defect, thread the feed seed through resolveCard's existing
`seed`... resolve does NOT receive the seed today. Decision: pass
`item.poolIndex`-based seed; blanks per verse are stable across sessions —
fine, memorization repetition is a feature.)

- [ ] **Step 4: TopBar** — tooltip `title={`Score — ${scoreTitle(score)}`}`.
- [ ] **Step 5: Full suite; fix Feed.test fallout** (slot-content assertions may shift with the new cycle — the day-remap and hint tests are content-agnostic; the two-pane-slides test queries `.vslide` presence which remains).
- [ ] **Step 6: Commit** — `"feat: memory cards in the feed rotation"` + trailer

---

### Task 4: Final review + deploy

- [ ] **Step 1:** Suite + build; controller runs the final review (fable) — play-mechanics trace, cycle math, score integrity (no re-farm paths), reduced-motion, ledger triage.
- [ ] **Step 2:** Push; watch; live-verify bundle hash + a memory-card string ("Hidden in your heart") in the live JS.

---

## Verification (after all tasks)

Suite green; build clean; live: scroll until a Memory Verse card appears (~every 12th), play it — wrong chip shakes and stays, perfect fill scores once, revisit shows it completed.
