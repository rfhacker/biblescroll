# Round B Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three contemplative feed kinds — prophecy, hymn, timeline — with validated packs, three cards, feed cycle 20 → 26.

**Architecture:** Corpus-rendered prophecy pairs via new range-aware verseStore helpers; typed hymn/timeline packs with editorial audit; CardShell cards; full favorites wiring in one task.

**Tech Stack:** Existing app; no new dependencies.

## Global Constraints

- Cycle EXACTLY: `verse, fact, verse, trivia, verse, map, verse, whosaid, verse, prophecy, verse, fact, verse, trivia, verse, memory, verse, continue, verse, hymn, verse, prayer, verse, names, verse, timeline` (26 slots); PER_CYCLE verse:13, fact:2, trivia:2, others 1 each. Curated/corpus split untouched.
- Kickers exactly: `Prophecy · Fulfilled`, `Hymn Story`, `Biblical Timeline`.
- Ids pf001…/hy001…/tl001… zero-padded, unique. No scoring for any Round B kind.
- CardKind, FAVORITE_KINDS, AND Favorites.tsx GROUPS all gain `prophecy`, `hymn`, `timeline` (all three in Task 3 — missing either wipes or hides favorites; extend both regression tests).
- Authored copy uses curly punctuation (U+2019 etc.). Display refs parse via parseLooseRef ("Psalms 22:18" style; ranges "Isaiah 53:5-6" with a hyphen).
- Not VerseSlide-wrapped. No tracking. Do NOT push until the final task. Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Suite currently 239/239.

---

### Task 1: Content packs + validation tests

**Files:**
- Create: `src/content/prophecy.json`, `src/content/hymns.json`, `src/content/timeline.json`, `src/content/roundb.test.ts`
- Modify: `src/content/pack-refs.test.ts`

**Interfaces (later tasks consume exactly):**
```ts
// prophecy.json: ProphecyItem[]
{ id: 'pf001', prophecyRef: string, fulfillmentRef: string, note: string }
// hymns.json: HymnItem[]
{ id: 'hy001', title: string, author: string, year: number, stanza: string, story: string, ref: string }
// timeline.json: TimelineItem[]
{ id: 'tl001', title: string, when: string, position: number, blurb: string, ref: string }
```

- [ ] **Step 1: Write the failing validation tests**

```ts
// src/content/roundb.test.ts
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
```

- [ ] **Step 2: Verify failure** (`npx vitest run src/content/roundb.test.ts` — packs missing)

- [ ] **Step 3: Author the packs**

- prophecy (40+): classic explicit-citation pairs first (Isaiah 7:14→Matthew 1:22-23, Micah 5:2→Matthew 2:5-6, Zechariah 9:9→Matthew 21:4-5, Psalms 22:18→John 19:24, Isaiah 53:5-6→1 Peter 2:24, Psalms 16:10→Acts 2:31, Isaiah 40:3→Matthew 3:3, Malachi 3:1→Mark 1:2, Hosea 11:1→Matthew 2:15, Jeremiah 31:15→Matthew 2:17-18, Zechariah 11:12-13→Matthew 27:9, Psalms 118:22→Acts 4:11, Isaiah 61:1→Luke 4:18, Joel 2:28→Acts 2:16-17, Psalms 110:1→Matthew 22:43-44, Isaiah 9:1-2→Matthew 4:14-16, Zechariah 12:10→John 19:37, Psalms 69:21→John 19:28-29, Exodus 12:46→John 19:36, Isaiah 6:9-10→Matthew 13:14 and more). CHECK LENGTHS against the corpus programmatically — the 480-char cap will force choosing the tightest verse spans; slice ranges accordingly. Notes: one sentence connecting the two, factual not preachy.
- hymns (20+): pre-1929 only. Strong candidates: Amazing Grace (Newton 1779), It Is Well with My Soul (Spafford 1873), Great Is Thy Faithfulness (Chisholm 1923), Be Thou My Vision (tr. Byrne 1905/1912), Holy Holy Holy (Heber 1826), How Firm a Foundation (1787), Rock of Ages (Toplady 1776), Blessed Assurance (Crosby 1873), What a Friend We Have in Jesus (Scriven 1855), A Mighty Fortress (Luther c. 1529, English tr. Hedge 1853), All Creatures of Our God and King (tr. Draper 1919), Come Thou Fount (Robinson 1758), When I Survey the Wondrous Cross (Watts 1707), Just As I Am (Elliott 1835), Abide with Me (Lyte 1847), I Surrender All (Van DeVenter 1896), Nearer My God to Thee (Adams 1841), Jesus Loves Me (Warner 1860), O for a Thousand Tongues (Wesley 1739), Take My Life and Let It Be (Havergal 1874), Turn Your Eyes upon Jesus (Lemmel 1922). Stanzas: first stanza (or most famous), typed accurately with `\n` line breaks, curly apostrophes. Stories: verified anecdotes (Spafford's daughters, Newton's slave-ship past, Scriven's fiancée) told in 2–3 warm factual sentences; where a popular story is legendary/disputed, either omit the hymn or state it carefully ("as the story is told…").
- timeline (25+): sweep from Abraham to Revelation. Traditional approximate dates with "c." on anything disputed (Exodus c. 1446 BC traditional). Positions on a 0–100 sweep consistent with the six era landmarks used by the card: Abraham≈10, Exodus≈24, David≈40, Exile≈56, Jesus≈78, Paul≈90. Events: call of Abraham, Joseph in Egypt, the Exodus, Sinai, Jericho, Ruth, Saul anointed, David king, temple built, kingdom divides, Elijah at Carmel, fall of Samaria, Hezekiah, fall of Jerusalem, exile in Babylon, return under Cyrus, temple rebuilt, Esther, Nehemiah's wall, birth of Jesus, baptism, crucifixion & resurrection, Pentecost, Paul's conversion, first missionary journey, council at Jerusalem, Rome imprisonment, Revelation on Patmos (pick 25+, each with the ref of its primary passage).

- [ ] **Step 4: pack-refs.test.ts additions** — prophecy contributes BOTH refs per pair (flatMap), hymns `ref`, timeline `ref`; follow the existing entry style.

- [ ] **Step 5: Full suite green, commit** (`"feat: prophecy, hymns, and timeline content packs"` + trailer)

---

### Task 2: verseStore helpers + three cards

**Files:**
- Create: `src/components/cards/ProphecyCard.tsx`, `HymnCard.tsx`, `TimelineCard.tsx`, `roundb-cards.test.tsx`
- Modify: `src/content/verseStore.ts`, `src/content/types.ts`, `src/index.css`

**Interfaces:**
- Consumes: Task 1 pack shapes; CardShell/RefButton; refText/parseLooseRef.
- Produces (Task 3 consumes): `ProphecyCard({ item: ProphecyItem, verses: VerseStore, theme: number })`, `HymnCard({ item: HymnItem, theme: number })`, `TimelineCard({ item: TimelineItem, theme: number })`; `looseRefText(store, ref)` in verseStore.

- [ ] **Step 1: types.ts additions**

```ts
export interface ProphecyItem { id: string; prophecyRef: string; fulfillmentRef: string; note: string }
export interface HymnItem { id: string; title: string; author: string; year: number; stanza: string; story: string; ref: string }
export interface TimelineItem { id: string; title: string; when: string; position: number; blurb: string; ref: string }
```
CardKind gains `'prophecy' | 'hymn' | 'timeline'`.

- [ ] **Step 2: verseStore helpers (with unit test in roundb-cards.test.tsx or verseStore.test.ts — follow the existing verseStore test file's style)**

```ts
// append to src/content/verseStore.ts
export function looseRefTuple(ref: string): CuratedRef | null {
  const r = parseLooseRef(ref)
  if (!r) return null
  const m = ref.match(/:(\d+)[–-](\d+)/)
  return m ? [r.b, r.c, r.v, Number(m[2])] : [r.b, r.c, r.v]
}

export function looseRefText(store: VerseStore, ref: string): string {
  const t = looseRefTuple(ref)
  return t ? refText(store, t) : ''
}
```
Tests: `looseRefTuple('John 3:16')` → `['JHN',3,16]`; `looseRefTuple('Isaiah 53:5-6')` → `['ISA',53,5,6]`; `looseRefText` joins the range text (assert it contains both verses' opening words); unparsable → ''.

- [ ] **Step 3: Failing card tests**

```tsx
// src/components/cards/roundb-cards.test.tsx
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { buildStore } from '../../content/verseStore'
import { ProphecyCard } from './ProphecyCard'
import { HymnCard } from './HymnCard'
import { TimelineCard } from './TimelineCard'
import prophecy from '../../content/prophecy.json'
import hymns from '../../content/hymns.json'
import timeline from '../../content/timeline.json'
import type { ProphecyItem, HymnItem, TimelineItem } from '../../content/types'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const pf = (prophecy as ProphecyItem[])[0]
const hy = (hymns as HymnItem[])[0]
const tl = (timeline as TimelineItem[])[0]

test('ProphecyCard renders both passages with labels and refs', () => {
  render(<ProphecyCard item={pf} verses={store} theme={0} />)
  expect(screen.getByText('Prophecy · Fulfilled')).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(`Foretold — ${pf.prophecyRef}`))).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(`Fulfilled — ${pf.fulfillmentRef}`))).toBeInTheDocument()
  expect(screen.getByText(pf.note)).toBeInTheDocument()
})

test('HymnCard renders title, byline, stanza with line breaks, story', () => {
  const { container } = render(<HymnCard item={hy} theme={0} />)
  expect(screen.getByText('Hymn Story')).toBeInTheDocument()
  expect(screen.getByText(hy.title)).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(hy.author) && c.includes(String(hy.year)))).toBeInTheDocument()
  const stanza = container.querySelector('.hymn-stanza')!
  expect(stanza.textContent).toBe(hy.stanza)
})

test('TimelineCard renders era labels and the gold marker', () => {
  const { container } = render(<TimelineCard item={tl} theme={0} />)
  expect(screen.getByText('Biblical Timeline')).toBeInTheDocument()
  for (const era of ['Abraham', 'Exodus', 'David', 'Exile', 'Jesus', 'Paul']) {
    expect(screen.getByText(era)).toBeInTheDocument()
  }
  expect(screen.getByText(tl.when)).toBeInTheDocument()
  expect(container.querySelectorAll('circle[fill="var(--accent)"]')).toHaveLength(1)
})
```

- [ ] **Step 4: Implement the cards**

```tsx
// src/components/cards/ProphecyCard.tsx
import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import { looseRefText, type VerseStore } from '../../content/verseStore'
import type { ProphecyItem } from '../../content/types'

export function ProphecyCard({ item, verses, theme }: {
  item: ProphecyItem; verses: VerseStore; theme: number
}) {
  return (
    <CardShell theme={theme}
      shareText={`Foretold (${item.prophecyRef}) and fulfilled (${item.fulfillmentRef}): ${item.note}`}
      fav={{ kind: 'prophecy', id: item.id, title: `${item.prophecyRef} → ${item.fulfillmentRef}`, body: item.note }}>
      <div className="kicker">Prophecy · Fulfilled</div>
      <div className="pf-block">
        <div className="pf-label">Foretold — {item.prophecyRef}</div>
        <p className="pf-text">{looseRefText(verses, item.prophecyRef)}</p>
      </div>
      <div className="pf-block">
        <div className="pf-label">Fulfilled — {item.fulfillmentRef}</div>
        <p className="pf-text">{looseRefText(verses, item.fulfillmentRef)}</p>
      </div>
      <p className="pf-note">{item.note}</p>
      <p className="names-refs">
        <RefButton refString={item.prophecyRef} />
        <RefButton refString={item.fulfillmentRef} />
      </p>
    </CardShell>
  )
}
```

```tsx
// src/components/cards/HymnCard.tsx
import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import type { HymnItem } from '../../content/types'

export function HymnCard({ item, theme }: { item: HymnItem; theme: number }) {
  return (
    <CardShell theme={theme}
      shareText={`${item.title} (${item.author}, ${item.year}): ${item.story} (${item.ref})`}
      fav={{ kind: 'hymn', id: item.id, title: item.title, body: `${item.story} (${item.ref})` }}>
      <div className="kicker">Hymn Story</div>
      <h2 className="fact-title">{item.title}</h2>
      <p className="hymn-byline">{item.author} · {item.year}</p>
      <blockquote className="quote-text hymn-stanza">{item.stanza}</blockquote>
      <p className="fact-body">{item.story}</p>
      <RefButton refString={item.ref} />
    </CardShell>
  )
}
```

```tsx
// src/components/cards/TimelineCard.tsx
import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import type { TimelineItem } from '../../content/types'

const ERAS = [
  { label: 'Abraham', pos: 10 },
  { label: 'Exodus', pos: 24 },
  { label: 'David', pos: 40 },
  { label: 'Exile', pos: 56 },
  { label: 'Jesus', pos: 78 },
  { label: 'Paul', pos: 90 },
]

export function TimelineCard({ item, theme }: { item: TimelineItem; theme: number }) {
  const x = 12 + (item.position / 100) * 376
  return (
    <CardShell theme={theme}
      shareText={`${item.title} (${item.when}): ${item.blurb} (${item.ref})`}
      fav={{ kind: 'timeline', id: item.id, title: `${item.title} — ${item.when}`, body: `${item.blurb} (${item.ref})` }}>
      <div className="kicker">Biblical Timeline</div>
      <h2 className="fact-title">{item.title}</h2>
      <svg viewBox="0 0 400 84" className="timeline-svg" role="img"
        aria-label={`Timeline position: ${item.when}`}>
        <line x1="12" y1="52" x2="388" y2="52" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" />
        {ERAS.map((e) => {
          const ex = 12 + (e.pos / 100) * 376
          return (
            <g key={e.label}>
              <circle cx={ex} cy={52} r={3.5} fill="var(--text-dim)" />
              <text x={ex} y={72} textAnchor="middle" className="timeline-era">{e.label}</text>
            </g>
          )
        })}
        <circle cx={x} cy={52} r={7} fill="var(--accent)" stroke="var(--bg)" strokeWidth="2.5" />
        <text x={Math.min(Math.max(x, 40), 360)} y={30} textAnchor="middle" className="timeline-when">{item.when}</text>
      </svg>
      <p className="fact-body">{item.blurb}</p>
      <RefButton refString={item.ref} />
    </CardShell>
  )
}
```

CSS (src/index.css, after the .names-* block):
```css
.pf-block { margin-bottom: 0.9rem; }
.pf-label { color: var(--accent); font-size: 0.85rem; letter-spacing: 0.06em; margin-bottom: 0.3rem; }
.pf-text { font-family: var(--serif); font-size: 1.1rem; line-height: 1.5; }
.pf-note { color: var(--text-dim); font-size: 0.98rem; line-height: 1.5; margin-top: 0.4rem; }
.hymn-byline { color: var(--text-dim); font-size: 0.95rem; margin-bottom: 0.8rem; }
.hymn-stanza { white-space: pre-line; }
.timeline-svg { width: 100%; margin: 0.6rem 0 0.9rem; }
.timeline-era { font-size: 11px; fill: var(--text-dim); font-family: var(--sans); }
.timeline-when { font-size: 13px; fill: var(--accent); font-family: var(--sans); letter-spacing: 0.04em; }
```

- [ ] **Step 5: Full suite green, tsc clean, commit** (`"feat: prophecy, hymn, and timeline cards"` + trailer)

---

### Task 3: Feed cycle 26 + resolve + favorites wiring

**Files:**
- Modify: `src/lib/feed.ts`, `src/lib/feed.test.ts`, `src/components/cards/resolve.tsx`, `src/components/cards/resolve.test.ts`, `src/lib/store.ts`, `src/components/Favorites.tsx`, `src/components/Favorites.test.tsx`, `src/components/cards/devotional-cards.test.tsx`

- [ ] **Step 1: feed.test.ts updates (failing first)** — SIZES gains `prophecy: 40, hymn: 20, timeline: 25`; cycle test asserts 1..26 against the Global Constraints cycle; add a prophecy no-repeat test; the themeFor test's loop bounds go 20 → 26 (slot < 26, offsets c * 26); verse-split test untouched.

- [ ] **Step 2: feed.ts** — CYCLE per Global Constraints; PER_CYCLE `{ verse: 13, fact: 2, trivia: 2, map: 1, memory: 1, whosaid: 1, continue: 1, prayer: 1, names: 1, prophecy: 1, hymn: 1, timeline: 1 }`; FeedItem kind/pool unions and PoolSizes gain the three keys. themeFor body unchanged (CYCLE.length adapts).

- [ ] **Step 3: resolve.tsx** — imports + POOL_SIZES entries (pack lengths) + cases:
```tsx
case 'prophecy':
  return <ProphecyCard item={(prophecy as ProphecyItem[])[item.poolIndex]} verses={verses} theme={theme} />
case 'hymn':
  return <HymnCard item={(hymns as HymnItem[])[item.poolIndex]} theme={theme} />
case 'timeline':
  return <TimelineCard item={(timeline as TimelineItem[])[item.poolIndex]} theme={theme} />
```
Add three kicker-render assertions to resolve.test.ts in its existing style.

- [ ] **Step 4: favorites** — store.ts FAVORITE_KINDS gains all three; Favorites.tsx GROUPS gains `['prophecy', 'Prophecy & Fulfillment'], ['hymn', 'Hymn Stories'], ['timeline', 'Timeline']`; extend the devotional-cards favorites round-trip test and the Favorites panel test to cover the three new kinds (same pattern as Round A's).

- [ ] **Step 5: Full suite green, tsc clean, `npm run build` succeeds, commit** (`"feat: round B kinds in the feed (26-slot cycle)"` + trailer)

---

### Task 4: Content audit + final review + deploy

- [ ] **Step 1: Fable-tier CONTENT audit** — every prophecy pair (is the fulfillment claim textually honest — NT explicitly citing or unmistakably corresponding? no interpretive stretch), every hymn (stanza wording accurate to the published hymn, story factual vs legend, author/year/PD status correct), every timeline entry (traditional dating defensible, "c." where disputed, position consistent with the era landmarks, blurb accurate). Fix loop for findings.
- [ ] **Step 2: Fable-tier whole-feature code review** (review-package over the round; READY required).
- [ ] **Step 3: Push, verify "Prophecy · Fulfilled", "Hymn Story", and "Biblical Timeline" in the live jesusfeed.com bundle.
