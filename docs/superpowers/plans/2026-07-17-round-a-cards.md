# Round A Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four new feed card kinds — whosaid, continue, prayer, names — with bundled validated content packs and a shared quiz component.

**Architecture:** Content packs validated against the WEB corpus at build time; TriviaCard's mechanics extracted into a shared QuizCard with thin adapters; two devotional cards; feed cycle 12 → 20.

**Tech Stack:** Existing app; no new dependencies.

## Global Constraints

- Cycle EXACTLY: `verse, fact, verse, trivia, verse, map, verse, whosaid, verse, fact, verse, trivia, verse, memory, verse, continue, verse, prayer, verse, names`; PER_CYCLE verse:10, fact:2, trivia:2, map:1, memory:1, whosaid:1, continue:1, prayer:1, names:1. Curated/corpus 7-of-10 verse split untouched.
- All scripture text VERBATIM from `public/content/verses.json` (WEB), byte-for-byte including curly punctuation U+2019/U+201C/U+201D — copy programmatically, never retype.
- Quiz scoring: getAnsweredPick/setAnsweredPick + addScore(1), correct-only persistence (wrong locks the mount only), once ever per id. Ids: ws001…, cv001…, pr001…, ng001… (zero-padded, unique).
- Kickers exactly: `Who said it?`, `Continue the verse`, `A moment of prayer`, `Names of God`.
- CardKind/FAVORITE_KINDS gain `whosaid`, `continue`, `names` — NOT `prayer`.
- New kinds are NOT VerseSlide-wrapped. No tracking. Dark-pinned styling via existing tokens.
- TriviaCard's existing test file must pass UNMODIFIED after the QuizCard extraction.
- Do NOT push until the final task. Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Suite currently 215/215.

---

### Task 1: whosaid.json + continue.json + validation tests

**Files:**
- Create: `src/content/whosaid.json`, `src/content/continue.json`, `src/content/quizpacks.test.ts`
- Modify: `src/content/pack-refs.test.ts` (add both packs to the ref sweep)

**Interfaces (later tasks consume exactly):**
```ts
// whosaid.json: WhoSaidItem[]
{ id: 'ws001', quote: string, choices: [string, string, string, string],
  answer: number, why: string, ref: string }
// continue.json: ContinueItem[]
{ id: 'cv001', stem: string, endings: [string, string, string],
  sources: [string, string, string], answer: number, why: string, ref: string }
// sources[i] = display ref the ending was lifted from; sources[answer] === ref.
```

- [ ] **Step 1: Write the failing validation tests**

```ts
// src/content/quizpacks.test.ts
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
    used.add(c.answer)
  }
  expect(used.size).toBe(3)
})

test('continue: stem + true ending reconstructs the ref text exactly', () => {
  for (const c of CVP) {
    const text = norm(refText(store, toTuple(c.ref)))
    expect(norm(`${c.stem} ${c.endings[c.answer]}`), `${c.id}: does not reconstruct ${c.ref}`).toBe(text)
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
```

- [ ] **Step 2: Run tests, verify they fail** (`npx vitest run src/content/quizpacks.test.ts` — fails: packs missing)

- [ ] **Step 3: Author the packs**

Author 60 whosaid + 50 continue entries. NON-NEGOTIABLE method: extract all
scripture strings PROGRAMMATICALLY from `public/content/verses.json`
(node/python scratch script — find the verse, slice the quote/stem/ending
from the actual text), then assemble the JSON. Never retype scripture.
Content bar:
- whosaid: `quote` is the INNER speech only — exclude any enclosing curly
  quote marks from the text (the card renders its own “ ” around it).
- whosaid: only direct speech with a clear, textually attributable speaker
  (e.g. "I am the way, the truth, and the life." → Jesus, John 14:6).
  Distractor speakers plausible for the era/genre (other prophets,
  apostles, kings — no anachronisms). Spread across OT and NT, easy and
  hard. `why` gives the scene in one sentence.
- continue: split famous verses at a natural clause boundary (stem must
  read as an obvious set-up; ending 3+ words). Distractor endings: real
  verse tails with compatible grammar. `why` must name where the false
  endings come from (e.g. "The others end Proverbs 3:5 and Psalm 46:1.").
- Speaker labels and books in `why`/`sources` use full display names
  ("1 Samuel 17:40" style, as trivia.json does).

- [ ] **Step 4: Add both packs to pack-refs.test.ts**

In the `allRefs` array append (follow the existing lines exactly):
```ts
  ...(whosaid as { id: string; ref: string }[]).map((w) => ({ src: `whosaid ${w.id}`, ref: w.ref })),
  ...(cont as { id: string; ref: string }[]).map((c) => ({ src: `continue ${c.id}`, ref: c.ref })),
```
with `import whosaid from './whosaid.json'` and `import cont from './continue.json'`.
Also append every `sources[]` entry:
```ts
  ...(cont as { id: string; sources: string[] }[]).flatMap((c) =>
    c.sources.map((s, i) => ({ src: `continue ${c.id} source ${i}`, ref: s }))),
```

- [ ] **Step 5: Run the full suite** (`npx vitest run` — all green)

- [ ] **Step 6: Commit** (`git add src/content && git commit -m "feat: whosaid and continue content packs" -m "<trailer>"`)

---

### Task 2: prayer.json + names.json + validation tests

**Files:**
- Create: `src/content/prayer.json`, `src/content/names.json`, `src/content/devotional.test.ts`
- Modify: `src/content/pack-refs.test.ts`

**Interfaces (later tasks consume exactly):**
```ts
// prayer.json: PrayerItem[]
{ id: 'pr001', prompt: string, ref: string }
// names.json: NamesItem[]
{ id: 'ng001', name: string, original: string, language: 'Hebrew' | 'Greek',
  meaning: string, body: string, refs: string[] }
```

- [ ] **Step 1: Write the failing validation tests**

```ts
// src/content/devotional.test.ts
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
    expect(['Hebrew', 'Greek']).toContain(n.language)
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
    expect(n.language === 'Hebrew' ? hasHebrew : hasGreek, `${n.id}: script/language mismatch`).toBe(true)
  }
})
```

- [ ] **Step 2: Verify failure, author the packs**

- prayer: original pastoral copy — warm, brief, second-person, never
  preachy, ending naturally where the ref picks up ("Before you scroll
  on, hand today's worry to the One who holds tomorrow."). Cover a
  spread: gratitude, worry, forgiveness, rest, intercession, praise,
  confession, morning, night. Curly apostrophes (U+2019) throughout.
  Same pastoral bar as feelings.json.
- names: 25 names spanning both testaments (El Shaddai, El Elyon, El Roi,
  Elohim, Yahweh-Jireh, Yahweh-Rapha, Yahweh-Nissi, Yahweh-Shalom,
  Yahweh-Raah, Yahweh-Tsidkenu, Immanuel, Alpha and Omega, I Am, Lamb of
  God, Lion of Judah, Prince of Peace, Wonderful Counselor, Everlasting
  Father, Bread of Life, Light of the World, Good Shepherd, The Word,
  Ancient of Days, Rock of Ages / The Rock, King of Kings — adjust for
  attestation). `refs` must point at verses where the name/title actually
  appears; verify against the WEB corpus text (note: WEB renders the
  tetragrammaton as "Yahweh").

- [ ] **Step 3: Add both packs' refs to pack-refs.test.ts** (prayer `ref`; names via `flatMap` over `refs`, same style as Task 1's sources)

- [ ] **Step 4: Full suite green, commit** (`"feat: prayer and names content packs"` + trailer)

---

### Task 3: QuizCard extraction + WhoSaidCard + ContinueCard

**Files:**
- Create: `src/components/cards/QuizCard.tsx`, `WhoSaidCard.tsx`, `ContinueCard.tsx`, `QuizCard.test.tsx`
- Modify: `src/components/cards/TriviaCard.tsx` (becomes a thin adapter), `src/content/types.ts`

**Interfaces:**
- Consumes: Task 1 pack shapes; store `getAnsweredPick/setAnsweredPick/addScore`.
- Produces (Task 5 consumes): `WhoSaidCard({ item: WhoSaidItem, theme: number, onScore: () => void })`, `ContinueCard({ item: ContinueItem, theme: number, onScore: () => void })`.

- [ ] **Step 1: types.ts additions**

```ts
export interface WhoSaidItem {
  id: string; quote: string; choices: string[]; answer: number; why: string; ref: string
}
export interface ContinueItem {
  id: string; stem: string; endings: string[]; sources: string[]; answer: number; why: string; ref: string
}
```
And extend: `export type CardKind = 'verse' | 'trivia' | 'fact' | 'map' | 'whosaid' | 'continue' | 'names'`

- [ ] **Step 2: Write failing tests**

```tsx
// src/components/cards/QuizCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import whosaid from '../../content/whosaid.json'
import cont from '../../content/continue.json'
import type { WhoSaidItem, ContinueItem } from '../../content/types'

const ws = (whosaid as WhoSaidItem[])[0]
const cv = (cont as ContinueItem[])[0]

beforeEach(() => { localStorage.clear(); vi.resetModules() })

test('WhoSaidCard: correct pick scores once ever; kicker and quote render', async () => {
  const { WhoSaidCard } = await import('./WhoSaidCard')
  const store = await import('../../lib/store')
  const onScore = vi.fn()
  render(<WhoSaidCard item={ws} theme={0} onScore={onScore} />)
  expect(screen.getByText('Who said it?')).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(ws.quote.slice(0, 20)))).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: ws.choices[ws.answer] }))
  expect(store.getScore()).toBe(1)
  expect(onScore).toHaveBeenCalledTimes(1)
  // remount: answered state persists, no re-award
  const { cleanup } = await import('@testing-library/react')
  cleanup()
  const { WhoSaidCard: W2 } = await import('./WhoSaidCard')
  render(<W2 item={ws} theme={0} onScore={onScore} />)
  expect(screen.getByText((c) => c.includes(ws.why.slice(0, 15)))).toBeInTheDocument()
  expect(store.getScore()).toBe(1)
})

test('WhoSaidCard: wrong pick locks the mount without persisting', async () => {
  const { WhoSaidCard } = await import('./WhoSaidCard')
  const store = await import('../../lib/store')
  const wrongIdx = ws.answer === 0 ? 1 : 0
  render(<WhoSaidCard item={ws} theme={0} onScore={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: ws.choices[wrongIdx] }))
  expect(store.getScore()).toBe(0)
  expect(store.getAnsweredPick(ws.id)).toBeNull()
  // locked: clicking the right answer now does nothing
  await userEvent.click(screen.getByRole('button', { name: `✓ ${ws.choices[ws.answer]}` }))
  expect(store.getScore()).toBe(0)
})

test('ContinueCard: renders stem with ellipsis and real endings; correct scores', async () => {
  const { ContinueCard } = await import('./ContinueCard')
  const store = await import('../../lib/store')
  render(<ContinueCard item={cv} theme={0} onScore={() => {}} />)
  expect(screen.getByText('Continue the verse')).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(cv.stem.slice(0, 20)))).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: cv.endings[cv.answer] }))
  expect(store.getScore()).toBe(1)
  expect(screen.getByText((c) => c.includes(cv.why.slice(0, 15)))).toBeInTheDocument()
})
```

- [ ] **Step 3: Verify failure, implement**

```tsx
// src/components/cards/QuizCard.tsx
import { useState, type ReactNode } from 'react'
import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import { addScore, getAnsweredPick, setAnsweredPick } from '../../lib/store'
import type { Favorite } from '../../content/types'

export interface QuizSpec { id: string; choices: string[]; answer: number; why: string; ref: string }

export function QuizCard({ quiz, kicker, prompt, fav, shareText, theme, onScore }: {
  quiz: QuizSpec; kicker: string; prompt: ReactNode; fav: Favorite
  shareText: string; theme: number; onScore: () => void
}) {
  const [picked, setPicked] = useState<number | null>(() => getAnsweredPick(quiz.id))

  function pick(i: number) {
    if (picked !== null) return
    setPicked(i)
    // Only persist correct picks: a wrong answer locks this mount (so no
    // double-answering / farming right now) but the question comes back
    // fresh next time, keeping the lifetime score ceiling reachable.
    if (i === quiz.answer) {
      setAnsweredPick(quiz.id, i)
      addScore(1)
      onScore()
    }
  }

  return (
    <CardShell theme={theme} shareText={shareText} fav={fav}>
      <div className="kicker">{kicker}</div>
      {prompt}
      <div className="choices">
        {quiz.choices.map((c, i) => {
          let cls = 'choice'
          let label = c
          if (picked !== null) {
            if (i === quiz.answer) { cls += ' correct'; label = `✓ ${c}` }
            else if (i === picked) { cls += ' wrong'; label = `✗ ${c}` }
            else cls += ' dim'
          }
          return <button key={i} className={cls} onClick={() => pick(i)}>{label}</button>
        })}
      </div>
      {picked !== null && (
        <p className="trivia-why">
          {picked === quiz.answer ? '✓ ' : ''}{quiz.why} <RefButton refString={quiz.ref} />
        </p>
      )}
    </CardShell>
  )
}
```

```tsx
// src/components/cards/TriviaCard.tsx (entire new content — adapter, behavior identical)
import { QuizCard } from './QuizCard'
import type { TriviaItem } from '../../content/types'

export function TriviaCard({ item, theme, onScore }: {
  item: TriviaItem; theme: number; onScore: () => void
}) {
  return (
    <QuizCard quiz={item} kicker={`Trivia · ${item.difficulty}`}
      prompt={<h2 className="trivia-q">{item.q}</h2>}
      shareText={`${item.q} (${item.ref})`}
      fav={{ kind: 'trivia', id: item.id, title: item.q, body: `${item.why} (${item.ref})` }}
      theme={theme} onScore={onScore} />
  )
}
```

```tsx
// src/components/cards/WhoSaidCard.tsx
import { QuizCard } from './QuizCard'
import type { WhoSaidItem } from '../../content/types'

export function WhoSaidCard({ item, theme, onScore }: {
  item: WhoSaidItem; theme: number; onScore: () => void
}) {
  return (
    <QuizCard quiz={item} kicker="Who said it?"
      prompt={<blockquote className="quote-text">“{item.quote}”</blockquote>}
      shareText={`“${item.quote}” — who said it? (${item.ref})`}
      fav={{ kind: 'whosaid', id: item.id, title: `“${item.quote}”`, body: `${item.why} (${item.ref})` }}
      theme={theme} onScore={onScore} />
  )
}
```

```tsx
// src/components/cards/ContinueCard.tsx
import { QuizCard } from './QuizCard'
import type { ContinueItem } from '../../content/types'

export function ContinueCard({ item, theme, onScore }: {
  item: ContinueItem; theme: number; onScore: () => void
}) {
  return (
    <QuizCard quiz={{ id: item.id, choices: item.endings, answer: item.answer, why: item.why, ref: item.ref }}
      kicker="Continue the verse"
      prompt={<p className="verse-text">{item.stem} …</p>}
      shareText={`${item.stem} … (${item.ref})`}
      fav={{ kind: 'continue', id: item.id, title: `${item.stem} …`, body: `${item.endings[item.answer]} (${item.ref})` }}
      theme={theme} onScore={onScore} />
  )
}
```

CSS (src/index.css, next to .trivia-q):
```css
.quote-text { font-family: var(--serif); font-style: italic; font-size: 1.35rem; line-height: 1.5; margin-bottom: 1.2rem; }
```

- [ ] **Step 4: Run QuizCard tests AND the untouched TriviaCard test file — all green; full suite green; tsc clean**
- [ ] **Step 5: Commit** (`"feat: shared QuizCard with whosaid and continue cards"` + trailer)

---

### Task 4: PrayerCard + NamesCard + favorites wiring

**Files:**
- Create: `src/components/cards/PrayerCard.tsx`, `NamesCard.tsx`, `devotional-cards.test.tsx`
- Modify: `src/content/types.ts` (PrayerItem/NamesItem), `src/lib/store.ts` (FAVORITE_KINDS), `src/index.css`

**Interfaces:**
- Produces (Task 5 consumes): `PrayerCard({ item: PrayerItem, theme: number })`, `NamesCard({ item: NamesItem, theme: number })`.

- [ ] **Step 1: types.ts additions**

```ts
export interface PrayerItem { id: string; prompt: string; ref: string }
export interface NamesItem {
  id: string; name: string; original: string; language: 'Hebrew' | 'Greek'
  meaning: string; body: string; refs: string[]
}
```

- [ ] **Step 2: Write failing tests**

```tsx
// src/components/cards/devotional-cards.test.tsx
import { render, screen } from '@testing-library/react'
import { PrayerCard } from './PrayerCard'
import { NamesCard } from './NamesCard'
import prayer from '../../content/prayer.json'
import names from '../../content/names.json'
import type { PrayerItem, NamesItem } from '../../content/types'

const pr = (prayer as PrayerItem[])[0]
const ng = (names as NamesItem[])[0]

test('PrayerCard: kicker, prompt, tappable ref — and NO save/share actions', () => {
  const { container } = render(<PrayerCard item={pr} theme={0} />)
  expect(screen.getByText('A moment of prayer')).toBeInTheDocument()
  expect(screen.getByText(pr.prompt)).toBeInTheDocument()
  expect(container.querySelector('.card-actions')).toBeNull()
})

test('NamesCard: name, original script, meaning, body, refs, favoritable', () => {
  const { container } = render(<NamesCard item={ng} theme={0} />)
  expect(screen.getByText('Names of God')).toBeInTheDocument()
  expect(screen.getByText(ng.name)).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(ng.meaning))).toBeInTheDocument()
  expect(container.querySelector('.card-actions')).not.toBeNull()
})

test('favorites accept whosaid/continue/names kinds', async () => {
  localStorage.clear()
  const { toggleFavorite, isFavorite } = await import('../../lib/store')
  for (const kind of ['whosaid', 'continue', 'names'] as const) {
    toggleFavorite({ kind, id: `x-${kind}`, title: 't', body: 'b' })
    expect(isFavorite(kind, `x-${kind}`)).toBe(true)
  }
})
```

- [ ] **Step 3: Verify failure, implement**

```tsx
// src/components/cards/PrayerCard.tsx
import { RefButton } from './RefButton'
import type { PrayerItem } from '../../content/types'

export function PrayerCard({ item, theme }: { item: PrayerItem; theme: number }) {
  return (
    <article className={`card theme-${theme}`}>
      <div className="card-body">
        <div className="kicker">A moment of prayer</div>
        <p className="prayer-text">{item.prompt}</p>
        <RefButton refString={item.ref} />
      </div>
    </article>
  )
}
```

```tsx
// src/components/cards/NamesCard.tsx
import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import type { NamesItem } from '../../content/types'

export function NamesCard({ item, theme }: { item: NamesItem; theme: number }) {
  return (
    <CardShell theme={theme}
      shareText={`${item.name} — ${item.meaning}. ${item.body} (${item.refs.join('; ')})`}
      fav={{ kind: 'names', id: item.id, title: `${item.name} — ${item.meaning}`, body: `${item.body} (${item.refs.join('; ')})` }}>
      <div className="kicker">Names of God</div>
      <h2 className="names-title">{item.name}</h2>
      <p className="names-original">{item.original} · {item.language}</p>
      <p className="names-meaning">{item.meaning}</p>
      <p className="fact-body">{item.body}</p>
      <p className="names-refs">{item.refs.map((r) => <RefButton key={r} refString={r} />)}</p>
    </CardShell>
  )
}
```

store.ts: `const FAVORITE_KINDS: CardKind[] = ['verse', 'trivia', 'fact', 'map', 'whosaid', 'continue', 'names']`

CSS (src/index.css, after .fact-body):
```css
.prayer-text { font-family: var(--serif); font-size: 1.3rem; line-height: 1.7; margin-bottom: 1.1rem; }
.names-title { font-family: var(--serif); font-size: 1.9rem; margin-bottom: 0.4rem; }
.names-original { color: var(--text-dim); font-size: 1.05rem; margin-bottom: 0.8rem; }
.names-meaning { color: var(--accent); font-size: 1.1rem; margin-bottom: 0.8rem; }
.names-refs { margin-top: 0.9rem; display: flex; flex-wrap: wrap; gap: 0.6rem; }
```

- [ ] **Step 4: Full suite green, tsc clean, commit** (`"feat: prayer and names cards"` + trailer)

---

### Task 5: Feed cycle 20 + resolve wiring

**Files:**
- Modify: `src/lib/feed.ts`, `src/lib/feed.test.ts`, `src/components/cards/resolve.tsx`

- [ ] **Step 1: Update feed.test.ts (failing first)**

`SIZES` gains `whosaid: 60, continue: 50, prayer: 40, names: 25`. The cycle
test asserts positions 1..20 match the Global Constraints cycle exactly
(same structure as the current 12-slot test). Add a no-repeat test for one
new pool (mirror the memory-pool test with `whosaid`). The existing
70%-curated verse-split test stays untouched and must still pass.

- [ ] **Step 2: feed.ts**

```ts
const CYCLE = [
  'verse', 'fact', 'verse', 'trivia', 'verse', 'map', 'verse', 'whosaid',
  'verse', 'fact', 'verse', 'trivia', 'verse', 'memory', 'verse', 'continue',
  'verse', 'prayer', 'verse', 'names',
] as const
const PER_CYCLE = { verse: 10, fact: 2, trivia: 2, map: 1, memory: 1, whosaid: 1, continue: 1, prayer: 1, names: 1 }
```
FeedItem kind union and PoolSizes gain the four new keys. The
curated/corpus split logic is NOT touched.

- [ ] **Step 3: resolve.tsx**

Imports: the four packs + WhoSaidCard/ContinueCard/PrayerCard/NamesCard +
their types. POOL_SIZES gains `whosaid`, `continue`, `prayer`, `names`
(each pack's `.length`; memory stays dynamic via memoryPool). Cases:
```tsx
case 'whosaid':
  return <WhoSaidCard item={(whosaid as WhoSaidItem[])[item.poolIndex]} theme={theme} onScore={onScore} />
case 'continue':
  return <ContinueCard item={(cont as ContinueItem[])[item.poolIndex]} theme={theme} onScore={onScore} />
case 'prayer':
  return <PrayerCard item={(prayer as PrayerItem[])[item.poolIndex]} theme={theme} />
case 'names':
  return <NamesCard item={(names as NamesItem[])[item.poolIndex]} theme={theme} />
```
(Match the surrounding switch's exact style; NOT VerseSlide-wrapped.)
Add a resolve test (in the existing resolve.test.ts style) asserting each
new kind renders its distinct kicker.

- [ ] **Step 4: Full suite green, tsc clean, `npm run build` succeeds, commit** (`"feat: round A kinds in the feed (20-slot cycle)"` + trailer)

---

### Task 6: Content audit + final review + deploy

- [ ] **Step 1: Fable-tier CONTENT audit** — every entry of all four packs:
  whosaid attribution truly supported by the cited text; continue stems
  natural and distractors fair; prayer theology/tone pastoral and
  non-manipulative; names meanings/attestations accurate (WEB renders the
  divine name "Yahweh"). Automated checks already enforce verbatim-ness —
  this gate is for what tests can't judge. Fix findings via fix loop.
- [ ] **Step 2: Fable-tier whole-feature code review** (review-package over
  the full round; READY TO DEPLOY required).
- [ ] **Step 3: Push, watch jesusfeed.com for the new bundle, verify a
  round-A marker string ("A moment of prayer") in the live JS.
