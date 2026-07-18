# Round C Word Study Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Word Study feed kind backed by vendored public-domain Strong's dictionaries with build-time validation.

**Architecture:** Fetch script → committed data/strongs JSON (build-side only) → words pack whose lemmas are byte-copied from the dictionary and test-enforced → WordCard → cycle 28.

**Tech Stack:** Existing app; no new dependencies.

## Global Constraints

- PROVENANCE GATE: the Strong's source must be verifiably public domain. If the license is CC-BY or unclear, STOP (report NEEDS_CONTEXT) — do not vendor it.
- Dictionaries are build-side only: `data/strongs/` + tests. Nothing new precached; client ships only `src/content/words.json`.
- Kicker exactly `Word Study`. Byline uses U+00B7 middle dots and U+2019: `{translit} · {language} · Strong’s {strongs}`.
- Cycle EXACTLY: the current 26-slot cycle with `verse, word` appended (28 slots; PER_CYCLE verse:14, fact:2, trivia:2, others 1 each incl. word:1). Verse split untouched; themeFor body untouched (its test bounds 26 → 28).
- `word` field byte-equals the vendored dictionary lemma (test-enforced). Ids wd001… zero-padded unique. No score.
- CardKind, FAVORITE_KINDS, AND Favorites GROUPS gain `word` (`Word Studies` heading) in the SAME task, both regression tests extended.
- Do NOT push until the final task. Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Suite currently 253/253.

---

### Task 1: Vendor Strong's dictionaries

**Files:**
- Create: `scripts/fetch-strongs.mjs`, `data/strongs/hebrew.json`, `data/strongs/greek.json`, `data/strongs/PROVENANCE.md`, `src/content/strongs-data.test.ts`

**Interfaces (Task 2 consumes):**
```ts
// data/strongs/hebrew.json and greek.json: Record<string, StrongsEntry>
// keys "H1".."H8674" / "G1".."G5624"
{ lemma: string, translit: string, definition: string }
```

- [ ] **Step 1: Source investigation + provenance verification**

Candidate machine-readable sources (verify each's license file/README before use):
- github.com/openscriptures/strongs (Greek dictionary XML/JS)
- github.com/openscriptures/HebrewLexicon (Strong's Hebrew XML)
- Derived JSON ports of the above.
Strong's (1890) text is public domain; the DIGITIZATION's license must also permit use without attribution requirements. Record the evidence (exact license text/URL) in `data/strongs/PROVENANCE.md` with source commit/URL + fetch date. If no clean source: STOP, report NEEDS_CONTEXT with what you found.

- [ ] **Step 2: Write the failing data-shape test**

```ts
// src/content/strongs-data.test.ts
import { readFileSync } from 'node:fs'

interface StrongsEntry { lemma: string; translit: string; definition: string }
const hebrew = JSON.parse(readFileSync('data/strongs/hebrew.json', 'utf8')) as Record<string, StrongsEntry>
const greek = JSON.parse(readFileSync('data/strongs/greek.json', 'utf8')) as Record<string, StrongsEntry>

test('strongs hebrew: id format, count, non-empty lemmas in Hebrew script', () => {
  const keys = Object.keys(hebrew)
  expect(keys.length).toBeGreaterThan(8000)
  for (const k of keys) expect(k).toMatch(/^H\d{1,4}$/)
  expect(hebrew.H2617.lemma.length).toBeGreaterThan(0)
  expect(/[֐-׿]/.test(hebrew.H2617.lemma)).toBe(true) // chesed
  expect(hebrew.H7965.lemma.length).toBeGreaterThan(0)          // shalom
})

test('strongs greek: id format, count, non-empty lemmas in Greek script', () => {
  const keys = Object.keys(greek)
  expect(keys.length).toBeGreaterThan(5000)
  for (const k of keys) expect(k).toMatch(/^G\d{1,4}$/)
  expect(/[Ͱ-Ͽἀ-῿]/.test(greek.G26.lemma)).toBe(true)  // agape
  expect(/[Ͱ-Ͽἀ-῿]/.test(greek.G3056.lemma)).toBe(true) // logos
})

test('strongs entries carry translit and definition', () => {
  for (const e of [hebrew.H2617, hebrew.H7965, greek.G26, greek.G3056, greek.G5485]) {
    expect(e.translit.length).toBeGreaterThan(0)
    expect(e.definition.length).toBeGreaterThan(0)
  }
})
```

- [ ] **Step 3: Write scripts/fetch-strongs.mjs** — follow scripts/fetch-commentary-data.mjs's structure (node:https/fetch, hard assertions on counts before writing, notes in comments). Normalize to the interface above (strip XML/JS wrapper structures; definition = the dictionary's core definition text, whitespace-normalized). Run it; commit the generated JSON (committed data, script never runs in CI).

- [ ] **Step 4: Full suite green (253 + 3), commit** (`"feat: vendor Strong's dictionaries (public domain)"` + trailer)

---

### Task 2: words.json + validation

**Files:**
- Create: `src/content/words.json`, `src/content/words.test.ts`
- Modify: `src/content/pack-refs.test.ts`

**Interfaces (Task 3 consumes):**
```ts
// words.json: WordItem[]
{ id: 'wd001', strongs: string, word: string, translit: string,
  language: 'Hebrew' | 'Greek' | 'Aramaic', gloss: string, body: string, refs: string[] }
```

- [ ] **Step 1: Failing validation tests**

```ts
// src/content/words.test.ts
import { readFileSync } from 'node:fs'
import { buildStore, parseLooseRef, refKey } from './verseStore'
import words from './words.json'

interface StrongsEntry { lemma: string; translit: string; definition: string }
const hebrew = JSON.parse(readFileSync('data/strongs/hebrew.json', 'utf8')) as Record<string, StrongsEntry>
const greek = JSON.parse(readFileSync('data/strongs/greek.json', 'utf8')) as Record<string, StrongsEntry>
const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

interface WD { id: string; strongs: string; word: string; translit: string; language: string; gloss: string; body: string; refs: string[] }
const WDP = words as WD[]

test('words: 48+, unique ids, valid shapes', () => {
  expect(WDP.length).toBeGreaterThanOrEqual(48)
  expect(new Set(WDP.map((w) => w.id)).size).toBe(WDP.length)
  for (const w of WDP) {
    expect(w.id).toMatch(/^wd\d{3}$/)
    expect(['Hebrew', 'Greek', 'Aramaic']).toContain(w.language)
    expect(w.gloss.length).toBeGreaterThanOrEqual(10)
    expect(w.gloss.length).toBeLessThanOrEqual(60)
    expect(w.body.length).toBeGreaterThanOrEqual(80)
    expect(w.body.length).toBeLessThanOrEqual(400)
    expect(w.body.includes("'"), `${w.id} straight apostrophe`).toBe(false)
    expect(w.refs.length).toBeGreaterThanOrEqual(1)
    expect(w.refs.length).toBeLessThanOrEqual(3)
  }
})

test('words: every strongs number exists and word byte-equals the dictionary lemma', () => {
  for (const w of WDP) {
    const dict = w.strongs.startsWith('H') ? hebrew : greek
    const entry = dict[w.strongs]
    expect(entry, `${w.id}: ${w.strongs} not in dictionary`).toBeDefined()
    expect(w.word, `${w.id}: word differs from dictionary lemma`).toBe(entry.lemma)
    expect(w.strongs).toMatch(/^[HG]\d{1,4}$/)
    if (w.language === 'Greek') expect(w.strongs.startsWith('G')).toBe(true)
    else expect(w.strongs.startsWith('H')).toBe(true)
  }
})

test('words: original script matches language (Aramaic uses Hebrew script)', () => {
  for (const w of WDP) {
    const hasHebrew = /[֐-׿]/.test(w.word)
    const hasGreek = /[Ͱ-Ͽἀ-῿]/.test(w.word)
    expect(w.language === 'Greek' ? hasGreek : hasHebrew, `${w.id} script/language mismatch`).toBe(true)
  }
})

test('words: refs parse and resolve; language halves balanced', () => {
  for (const w of WDP) for (const ref of w.refs) {
    const r = parseLooseRef(ref)
    expect(r, `${w.id}: "${ref}" did not parse`).not.toBeNull()
    expect(store.byKey.has(refKey(r!.b, r!.c, r!.v)), `${w.id}: "${ref}" missing`).toBe(true)
  }
  const heb = WDP.filter((w) => w.language !== 'Greek').length
  expect(heb).toBeGreaterThanOrEqual(18)
  expect(WDP.length - heb).toBeGreaterThanOrEqual(18)
})
```

- [ ] **Step 2: Author ~50 entries** — word/strongs/lemma extracted PROGRAMMATICALLY from data/strongs (never retype script). Candidates: Hebrew — chesed H2617, shalom H7965, ruach H7307, nephesh H5315, kavod H3519, emet H571, torah H8451, tsedaqah H6666, shema H8085, selah H5542 (judgment call), hallel H1984, yeshuah H3444, berit H1285, rachamim/racham H7355 or H7356, qadosh H6918, olam H5769, davar H1697, lev H3820, avodah H5656, emunah H530, goel H1350, shabbat H7676, hokhmah H2451, mishpat H4941, tehillah H8416; Greek — agape G26, logos G3056, charis G5485, koinonia G2842, metanoia G3341, pistis G4102, elpis G1680, eirene G1515, zoe G2222, doxa G1391, ekklesia G1577, euangelion G2098, parakletos G3875, sozo G4982 or soteria G4991, kardia G2588, makarios G3107, diakonos G1249, apostolos G652, martys G3144, kenosis→kenoo G2758, agapao G25 (skip if agape kept), hamartia G266, dikaiosyne G1343, hypomone G5281, splanchnizomai G4697. Refs: verses where the WEB clearly renders the word (e.g. chesed → "loving kindness" Psalms 136:1; verify against the corpus text). Glosses tight; bodies 2–3 sentences, warm, accurate to the Strong's definition without overclaiming.
- [ ] **Step 3: pack-refs.test.ts** — words refs via flatMap (existing style).
- [ ] **Step 4: Full suite green, commit** (`"feat: word study content pack"` + trailer)

---

### Task 3: WordCard + feed 28 + wiring

**Files:**
- Create: `src/components/cards/WordCard.tsx`, `WordCard.test.tsx`
- Modify: `src/content/types.ts`, `src/lib/feed.ts`, `src/lib/feed.test.ts`, `src/components/cards/resolve.tsx`, `src/components/cards/resolve.test.ts`, `src/lib/store.ts`, `src/components/Favorites.tsx`, `src/components/Favorites.test.tsx`, `src/components/cards/devotional-cards.test.tsx`, `src/index.css`

- [ ] **Step 1: types** — `export interface WordItem { id: string; strongs: string; word: string; translit: string; language: 'Hebrew' | 'Greek' | 'Aramaic'; gloss: string; body: string; refs: string[] }`; CardKind gains `'word'`.

- [ ] **Step 2: Failing tests**

```tsx
// src/components/cards/WordCard.test.tsx
import { render, screen } from '@testing-library/react'
import { WordCard } from './WordCard'
import words from '../../content/words.json'
import type { WordItem } from '../../content/types'

const wd = (words as WordItem[])[0]

test('WordCard renders script, byline, gloss, body, refs', () => {
  const { container } = render(<WordCard item={wd} theme={0} />)
  expect(screen.getByText('Word Study')).toBeInTheDocument()
  expect(screen.getByText(wd.word)).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(wd.translit) && c.includes(wd.strongs))).toBeInTheDocument()
  expect(screen.getByText(wd.gloss)).toBeInTheDocument()
  expect(screen.getByText(wd.body)).toBeInTheDocument()
  expect(container.querySelectorAll('.verse-ref-btn').length).toBe(wd.refs.length)
})
```

- [ ] **Step 3: Implement**

```tsx
// src/components/cards/WordCard.tsx
import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import type { WordItem } from '../../content/types'

export function WordCard({ item, theme }: { item: WordItem; theme: number }) {
  return (
    <CardShell theme={theme}
      shareText={`${item.translit} (${item.word}) — ${item.gloss}. ${item.body} (${item.refs.join('; ')})`}
      fav={{ kind: 'word', id: item.id, title: `${item.translit} — ${item.gloss}`, body: `${item.body} (${item.refs.join('; ')})` }}>
      <div className="kicker">Word Study</div>
      <h2 className="word-original" lang={item.language === 'Greek' ? 'el' : 'he'}>{item.word}</h2>
      <p className="word-byline">{item.translit} · {item.language} · Strong’s {item.strongs}</p>
      <p className="word-gloss">{item.gloss}</p>
      <p className="fact-body">{item.body}</p>
      <p className="names-refs">{item.refs.map((r) => <RefButton key={r} refString={r} />)}</p>
    </CardShell>
  )
}
```

CSS (after the .timeline-* block):
```css
.word-original { font-family: var(--serif); font-size: 2.4rem; margin-bottom: 0.5rem; }
.word-byline { color: var(--text-dim); font-size: 0.95rem; margin-bottom: 0.7rem; }
.word-gloss { color: var(--accent); font-family: var(--serif); font-size: 1.15rem; margin-bottom: 0.8rem; }
```

- [ ] **Step 4: feed** — CYCLE = current 26 + `'verse', 'word'` appended (28 slots); PER_CYCLE verse:14 + word:1; unions/PoolSizes gain word. feed.test.ts: SIZES `word: 50`; cycle test 1..28; word no-repeat test; themeFor bounds 26 → 28; verse-split test untouched.

- [ ] **Step 5: resolve** — `case 'word': return <WordCard item={(words as WordItem[])[item.poolIndex]} theme={theme} />`; POOL_SIZES `word: (words as WordItem[]).length`; kicker assertion in resolve.test.ts.

- [ ] **Step 6: favorites** — FAVORITE_KINDS + GROUPS (`['word', 'Word Studies']`); extend both regression tests (round-trip + panel heading).

- [ ] **Step 7: Full suite green, tsc clean, `npm run build` succeeds, commit** (`"feat: word study cards in the feed (28-slot cycle)"` + trailer)

---

### Task 4: Content audit + final review + deploy

- [ ] **Step 1: Fable-tier CONTENT audit** — every entry: gloss/body faithful to the Strong's definition (read data/strongs) without over-claiming or pop-etymology (no "the Greek REALLY means…" fallacies — a Greek/Hebrew student must find nothing wrong); translit conventional; every cited verse's WEB text genuinely renders this word (check the corpus text against the word's standard WEB renderings); language tags right (any Aramaic entries genuinely Aramaic). PROVENANCE.md holds up. Fix loop.
- [ ] **Step 2: Fable-tier whole-feature code review** (package over the round; card-height measurement for WordCard included; READY required).
- [ ] **Step 3: Push; verify "Word Study" in the live jesusfeed.com bundle; confirm precache count unchanged.
