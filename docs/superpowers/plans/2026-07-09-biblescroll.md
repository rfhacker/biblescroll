# BibleScroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-first installable PWA presenting an endless full-screen snap-scroll feed of Bible verses, trivia, biblical maps, and did-you-know facts, with on-device favorites, daily streak, and trivia score.

**Architecture:** Single-page Vite + React + TypeScript app, no router, no backend. Pure, unit-tested libs (`lib/`) drive a deterministic infinite feed over bundled JSON content packs (`content/`). Verses load via fetch from `public/content/verses.json` (generated from the public-domain WEB XML); small packs import directly. User state lives in localStorage with graceful fallback. Deployed to GitHub Pages via GitHub Actions.

**Tech Stack:** Vite 6, React 18, TypeScript, vite-plugin-pwa (Workbox), Vitest + jsdom + @testing-library/react, @resvg/resvg-js (icon generation only), gh CLI + GitHub Pages.

## Global Constraints

- App name: **BibleScroll**. Bible translation: **World English Bible (WEB)** — public domain; credit it in About and on verse cards ("— WEB").
- Source XML: `/Users/rfhacker/rp_apps/biblos/data/engwebp_vpl.xml`, copied into this repo at `data/engwebp_vpl.xml` (Task 3). 31,103 verses, 66 books, format `<v b="GEN" c="1" v="1">text </v>`.
- Dark-first visual design; muted rich gradients; serif for scripture; no pure-white backgrounds; subtle motion only. Comfortable for 15-minute night sessions.
- Tone: encouraging, never guilt-based. No ads, no analytics, no accounts, no leaderboards.
- All content must be verifiable against scripture; every trivia/fact/map item carries a scripture reference.
- localStorage keys are prefixed `bs:`. App must not crash when localStorage is unavailable.
- Vite `base` is `/biblescroll/` (GitHub Pages project site).
- Node 22. Test command: `npm test` (= `vitest run`). Frequent commits; every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (shown as `[co-author trailer]` below to keep the plan readable — write it out for real).
- Git identity for this repo: `git config user.name "Richard Peters" && git config user.email richard.peters@checkyoursix.com` (done in Task 1).

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test-setup.ts`

**Interfaces:**
- Produces: a running Vite dev server, a passing (empty) Vitest suite, base CSS custom properties used by all later components.

- [ ] **Step 1: Set git identity**

```bash
cd /Users/rfhacker/rp_apps/biblescroll
git config user.name "Richard Peters"
git config user.email richard.peters@checkyoursix.com
```

- [ ] **Step 2: Write package.json**

```json
{
  "name": "biblescroll",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "convert": "node scripts/convert-web-xml.mjs",
    "icons": "node scripts/make-icons.mjs"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@resvg/resvg-js": "^2.6.2",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^26.0.0",
    "typescript": "^5.7.3",
    "vite": "^6.1.0",
    "vite-plugin-pwa": "^0.21.1",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Step 3: Write vite.config.ts** (PWA plugin added in Task 17 — keep this minimal now)

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/biblescroll/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 4: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "scripts"]
}
```

Note: `"types"` includes `vitest/globals` — also set `test.globals: true` in vite.config.ts test block:

```ts
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
```

- [ ] **Step 5: Write index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#12151c" />
    <title>BibleScroll</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Write src/main.tsx, src/App.tsx, src/test-setup.ts**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

```tsx
// src/App.tsx
export default function App() {
  return <div className="app">BibleScroll</div>
}
```

```ts
// src/test-setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Write src/index.css** — the design foundation (dark-first, comfortable)

```css
:root {
  --bg: #12151c;
  --surface: #1b2029;
  --text: #e8e4da;
  --text-dim: #a49e90;
  --accent: #d4a95a;      /* warm gold */
  --accent-soft: #8a744a;
  --good: #6fae7b;
  --bad: #c2706b;
  --serif: 'Iowan Old Style', 'Palatino Nova', Palatino, Georgia, serif;
  --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #f3efe6;
    --surface: #fbf8f1;
    --text: #2b2822;
    --text-dim: #6f6a5e;
  }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #root, .app { height: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}
/* Card background themes — muted, rich, easy on night eyes */
.theme-0 { background: linear-gradient(160deg, #1c2333 0%, #12151c 100%); }
.theme-1 { background: linear-gradient(160deg, #26202f 0%, #14121a 100%); }
.theme-2 { background: linear-gradient(160deg, #1e2b28 0%, #101715 100%); }
.theme-3 { background: linear-gradient(160deg, #2e2420 0%, #171210 100%); }
.theme-4 { background: linear-gradient(160deg, #232b1e 0%, #131710 100%); }
```

- [ ] **Step 8: Write .gitignore**

```
node_modules
dist
dev-dist
*.local
.DS_Store
```

- [ ] **Step 9: Install and verify**

```bash
npm install
npm test        # Expected: "No test files found" exit 0? — vitest exits 1 with no tests; use: npx vitest run --passWithNoTests
npm run build   # Expected: builds dist/ successfully
```

Set `"test": "vitest run --passWithNoTests"` in package.json so CI passes before tests exist; leave it that way.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: scaffold Vite + React + TS app with dark-first base styles

[co-author trailer]"
```

---

### Task 2: Seeded RNG (`lib/rng.ts`)

**Files:**
- Create: `src/lib/rng.ts`
- Test: `src/lib/rng.test.ts`

**Interfaces:**
- Produces: `hashString(s: string): number` (uint32), `mulberry32(seed: number): () => number` (0..1), `seededShuffle<T>(items: readonly T[], seed: string): T[]`, `shuffledRange(n: number, seed: string): number[]` (memoized).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rng.test.ts
import { hashString, mulberry32, seededShuffle, shuffledRange } from './rng'

test('hashString is deterministic and differs across inputs', () => {
  expect(hashString('a')).toBe(hashString('a'))
  expect(hashString('a')).not.toBe(hashString('b'))
})

test('mulberry32 yields deterministic sequence in [0,1)', () => {
  const a = mulberry32(42), b = mulberry32(42)
  for (let i = 0; i < 100; i++) {
    const x = a()
    expect(x).toBe(b())
    expect(x).toBeGreaterThanOrEqual(0)
    expect(x).toBeLessThan(1)
  }
})

test('seededShuffle is a deterministic permutation', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8]
  const s1 = seededShuffle(items, 'seed1')
  expect(seededShuffle(items, 'seed1')).toEqual(s1)
  expect([...s1].sort((a, b) => a - b)).toEqual(items)
  expect(seededShuffle(items, 'seed2')).not.toEqual(s1)
  expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]) // input untouched
})

test('shuffledRange returns permutation of 0..n-1', () => {
  const r = shuffledRange(50, 's')
  expect([...r].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i))
  expect(shuffledRange(50, 's')).toBe(r) // memoized: same array instance
})
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL (module not found)

- [ ] **Step 3: Implement**

```ts
// src/lib/rng.ts
export function hashString(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items]
  const rand = mulberry32(hashString(seed))
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const rangeCache = new Map<string, number[]>()
export function shuffledRange(n: number, seed: string): number[] {
  const key = `${n}:${seed}`
  let r = rangeCache.get(key)
  if (!r) {
    r = seededShuffle(Array.from({ length: n }, (_, i) => i), seed)
    rangeCache.set(key, r)
    if (rangeCache.size > 40) rangeCache.delete(rangeCache.keys().next().value!)
  }
  return r
}
```

- [ ] **Step 4: Run to verify pass** — `npm test` → PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: seeded RNG, shuffle, memoized shuffled ranges` + trailer

---

### Task 3: Verse data — books map, conversion script, verses.json

**Files:**
- Create: `data/engwebp_vpl.xml` (copied), `src/content/books.ts`, `scripts/convert-web-xml.mjs`, `public/content/verses.json` (generated, committed)
- Test: `src/content/verses.test.ts`

**Interfaces:**
- Produces: `BOOKS: Record<string, string>` (66 USFM codes → display names); `public/content/verses.json` = `Array<[b: string, c: number, v: number, text: string]>` in canonical order (31,103 tuples).

- [ ] **Step 1: Copy source XML into repo**

```bash
mkdir -p data public/content
cp /Users/rfhacker/rp_apps/biblos/data/engwebp_vpl.xml data/engwebp_vpl.xml
```

- [ ] **Step 2: Write src/content/books.ts** (complete 66-book map, canonical order)

```ts
export const BOOKS: Record<string, string> = {
  GEN: 'Genesis', EXO: 'Exodus', LEV: 'Leviticus', NUM: 'Numbers', DEU: 'Deuteronomy',
  JOS: 'Joshua', JDG: 'Judges', RUT: 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles',
  EZR: 'Ezra', NEH: 'Nehemiah', EST: 'Esther', JOB: 'Job', PSA: 'Psalms', PRO: 'Proverbs',
  ECC: 'Ecclesiastes', SNG: 'Song of Solomon', ISA: 'Isaiah', JER: 'Jeremiah',
  LAM: 'Lamentations', EZK: 'Ezekiel', DAN: 'Daniel', HOS: 'Hosea', JOL: 'Joel',
  AMO: 'Amos', OBA: 'Obadiah', JON: 'Jonah', MIC: 'Micah', NAM: 'Nahum', HAB: 'Habakkuk',
  ZEP: 'Zephaniah', HAG: 'Haggai', ZEC: 'Zechariah', MAL: 'Malachi',
  MAT: 'Matthew', MRK: 'Mark', LUK: 'Luke', JHN: 'John', ACT: 'Acts', ROM: 'Romans',
  '1CO': '1 Corinthians', '2CO': '2 Corinthians', GAL: 'Galatians', EPH: 'Ephesians',
  PHP: 'Philippians', COL: 'Colossians', '1TH': '1 Thessalonians', '2TH': '2 Thessalonians',
  '1TI': '1 Timothy', '2TI': '2 Timothy', TIT: 'Titus', PHM: 'Philemon', HEB: 'Hebrews',
  JAS: 'James', '1PE': '1 Peter', '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John',
  '3JN': '3 John', JUD: 'Jude', REV: 'Revelation',
}
```

- [ ] **Step 3: Write scripts/convert-web-xml.mjs**

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const xml = readFileSync('data/engwebp_vpl.xml', 'utf8')
const re = /<v b="([A-Z0-9]+)" c="(\d+)" v="(\d+)">([\s\S]*?)<\/v>/g
const decode = (s) => s
  .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"').replaceAll('&apos;', "'")
const verses = []
for (const m of xml.matchAll(re)) {
  verses.push([m[1], Number(m[2]), Number(m[3]), decode(m[4]).trim()])
}
if (verses.length !== 31103) throw new Error(`expected 31103 verses, got ${verses.length}`)
mkdirSync('public/content', { recursive: true })
writeFileSync('public/content/verses.json', JSON.stringify(verses))
console.log(`wrote ${verses.length} verses`)
```

- [ ] **Step 4: Run it** — `npm run convert` → Expected: `wrote 31103 verses`

- [ ] **Step 5: Write validation test**

```ts
// src/content/verses.test.ts
import { readFileSync } from 'node:fs'
import { BOOKS } from './books'

type Tuple = [string, number, number, string]
const verses: Tuple[] = JSON.parse(readFileSync('public/content/verses.json', 'utf8'))

test('has 31103 verses across exactly the 66 books', () => {
  expect(verses.length).toBe(31103)
  const codes = new Set(verses.map((t) => t[0]))
  expect(codes.size).toBe(66)
  for (const c of codes) expect(BOOKS[c]).toBeTruthy()
})

test('spot checks', () => {
  const key = (t: Tuple) => `${t[0]} ${t[1]}:${t[2]}`
  const map = new Map(verses.map((t) => [key(t), t[3]]))
  expect(map.get('GEN 1:1')).toMatch(/In the beginning, God created/)
  expect(map.get('JHN 3:16')).toMatch(/God so loved the world/)
  expect(map.get('PSA 23:1')).toMatch(/shepherd/i)
  for (const t of verses) expect(t[3].length).toBeGreaterThan(0)
})
```

- [ ] **Step 6: Run to verify pass** — `npm test` → PASS
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: WEB Bible conversion script, books map, verses.json (31,103 verses)"` + trailer

---

### Task 4: Content types, verse store, curated refs pack

**Files:**
- Create: `src/content/types.ts`, `src/content/verseStore.ts`, `src/content/curated.json`
- Test: `src/content/curated.test.ts`, `src/content/verseStore.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `VerseTuple = [string, number, number, string]`; `CuratedRef = [b: string, c: number, v: number, end?: number]`; `TriviaItem { id: string; q: string; choices: string[]; answer: number; why: string; ref: string; difficulty: 'easy'|'medium'|'hard' }`; `FactItem { id: string; title: string; body: string; ref: string }`; `Place { name: string; lat: number; lon: number }`; `MapStory { id: string; title: string; body: string; ref: string; places: Place[]; route: boolean }`; `CardKind = 'verse'|'trivia'|'fact'|'map'`; `Favorite { kind: CardKind; id: string; title: string; body: string }`
  - `verseStore.ts`: `buildStore(list: VerseTuple[]): VerseStore` where `VerseStore { list: VerseTuple[]; byKey: Map<string, number> }`; `refKey(b: string, c: number, v: number): string` → `"JHN 3:16"`; `refLabel(ref: CuratedRef): string` → `"John 3:16–18"`; `refText(store: VerseStore, ref: CuratedRef): string` (joins ranges); `loadVerses(baseUrl: string): Promise<VerseStore>` (fetches `${baseUrl}content/verses.json`)
  - `curated.json`: array of `CuratedRef`, **at least 250 entries** (~300 target).

- [ ] **Step 1: Write types.ts** (exact interfaces above, verbatim)

- [ ] **Step 2: Write failing verseStore test**

```ts
// src/content/verseStore.test.ts
import { readFileSync } from 'node:fs'
import { buildStore, refKey, refLabel, refText } from './verseStore'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

test('refKey and byKey lookup', () => {
  const i = store.byKey.get(refKey('JHN', 3, 16))!
  expect(store.list[i][3]).toMatch(/God so loved/)
})

test('refLabel formats single verses and ranges', () => {
  expect(refLabel(['JHN', 3, 16])).toBe('John 3:16')
  expect(refLabel(['PSA', 23, 1, 6])).toBe('Psalms 23:1–6')
})

test('refText joins a range', () => {
  const t = refText(store, ['PSA', 23, 1, 2])
  expect(t).toMatch(/shepherd/i)
  expect(t).toMatch(/green pastures/i)
})
```

- [ ] **Step 3: Run to verify failure**, then implement

```ts
// src/content/verseStore.ts
import type { VerseTuple, CuratedRef } from './types'
import { BOOKS } from './books'

export interface VerseStore { list: VerseTuple[]; byKey: Map<string, number> }

export const refKey = (b: string, c: number, v: number) => `${b} ${c}:${v}`

export function buildStore(list: VerseTuple[]): VerseStore {
  const byKey = new Map<string, number>()
  list.forEach((t, i) => byKey.set(refKey(t[0], t[1], t[2]), i))
  return { list, byKey }
}

export function refLabel([b, c, v, end]: CuratedRef): string {
  const name = BOOKS[b] ?? b
  return end && end !== v ? `${name} ${c}:${v}–${end}` : `${name} ${c}:${v}`
}

export function refText(store: VerseStore, [b, c, v, end]: CuratedRef): string {
  const parts: string[] = []
  for (let i = v; i <= (end ?? v); i++) {
    const idx = store.byKey.get(refKey(b, c, i))
    if (idx !== undefined) parts.push(store.list[idx][3])
  }
  return parts.join(' ')
}

export async function loadVerses(baseUrl: string): Promise<VerseStore> {
  const res = await fetch(`${baseUrl}content/verses.json`)
  if (!res.ok) throw new Error(`verses fetch failed: ${res.status}`)
  return buildStore(await res.json())
}
```

- [ ] **Step 4: Author src/content/curated.json** — ~300 hand-picked refs. Selection guidance: beloved promises (JER 29:11; ROM 8:28), Psalms (23 in ranges; 27:1; 46:1,10; 121 range), Proverbs (3:5–6; 4:23), Gospel core (JHN 3:16–17; 14:6; MAT 5:3–10 as ranges; 11:28–30), comfort (ISA 40:31; 41:10; PHP 4:6–7,13), love (1CO 13:4–7), faith (HEB 11:1; EPH 2:8–9), creation (GEN 1:1; PSA 19:1), wisdom (JAS 1:5), strength (2TI 1:7), and spread across both testaments. Prefer ranges (2–6 verses) where the thought needs context. Format examples:

```json
[
  ["JHN", 3, 16, 17],
  ["PSA", 23, 1, 6],
  ["PRO", 3, 5, 6],
  ["ISA", 40, 31],
  ["PHP", 4, 6, 7]
]
```

- [ ] **Step 5: Write failing curated validation test**

```ts
// src/content/curated.test.ts
import { readFileSync } from 'node:fs'
import { buildStore, refKey } from './verseStore'
import curated from './curated.json'
import type { CuratedRef } from './types'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const refs = curated as CuratedRef[]

test('at least 250 curated refs, no duplicates', () => {
  expect(refs.length).toBeGreaterThanOrEqual(250)
  const keys = refs.map((r) => r.join(':'))
  expect(new Set(keys).size).toBe(keys.length)
})

test('every ref (and range end) resolves to a real verse', () => {
  for (const [b, c, v, end] of refs) {
    expect(store.byKey.has(refKey(b, c, v)), `${b} ${c}:${v}`).toBe(true)
    if (end) {
      expect(end).toBeGreaterThan(v)
      expect(end - v).toBeLessThanOrEqual(9)
      expect(store.byKey.has(refKey(b, c, end)), `${b} ${c}:${end}`).toBe(true)
    }
  }
})
```

- [ ] **Step 6: Run until pass** (fix any refs the test rejects) — `npm test` → PASS
- [ ] **Step 7: Commit** — `"feat: content types, verse store, ~300 curated verse refs"` + trailer

---

### Task 5: Verse of the day (`lib/votd.ts`)

**Files:**
- Create: `src/lib/votd.ts`
- Test: `src/lib/votd.test.ts`

**Interfaces:**
- Produces: `dayKey(d?: Date): string` (local `YYYY-MM-DD`), `votdIndex(day: string, curatedCount: number): number`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/votd.test.ts
import { dayKey, votdIndex } from './votd'

test('dayKey formats local date', () => {
  expect(dayKey(new Date(2026, 6, 9))).toBe('2026-07-09')
  expect(dayKey(new Date(2026, 0, 1))).toBe('2026-01-01')
})

test('votdIndex is deterministic per day and in range', () => {
  const a = votdIndex('2026-07-09', 300)
  expect(votdIndex('2026-07-09', 300)).toBe(a)
  expect(a).toBeGreaterThanOrEqual(0)
  expect(a).toBeLessThan(300)
  const days = ['2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12']
  expect(new Set(days.map((d) => votdIndex(d, 300))).size).toBeGreaterThan(1)
})
```

- [ ] **Step 2: Verify failure, implement**

```ts
// src/lib/votd.ts
import { hashString } from './rng'

export function dayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function votdIndex(day: string, curatedCount: number): number {
  return hashString(`votd:${day}`) % curatedCount
}
```

- [ ] **Step 3: Verify pass, commit** — `"feat: deterministic verse-of-the-day selection"` + trailer

---

### Task 6: Feed generator (`lib/feed.ts`)

**Files:**
- Create: `src/lib/feed.ts`
- Test: `src/lib/feed.test.ts`

**Interfaces:**
- Consumes: `shuffledRange` from `./rng`.
- Produces:
  ```ts
  interface PoolSizes { curated: number; corpus: number; trivia: number; fact: number; map: number }
  interface FeedItem { kind: 'verse'|'trivia'|'fact'|'map'; pool: 'curated'|'corpus'|'trivia'|'fact'|'map'; poolIndex: number; votd?: boolean }
  function cardAt(i: number, seed: string, sizes: PoolSizes, votdIdx: number): FeedItem
  ```
  Card 0 is always the VOTD (curated pool, `poolIndex = votdIdx`, `votd: true`). From card 1 the 10-cycle pattern is `verse, fact, verse, trivia, verse, map, verse, fact, verse, trivia`. Of every 10 verse cards, the first 7 draw from curated, the last 3 from corpus. Within a pool, items don't repeat until the pool is exhausted (then it reshuffles under a new epoch seed).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/feed.test.ts
import { cardAt, type PoolSizes } from './feed'

const SIZES: PoolSizes = { curated: 280, corpus: 31103, trivia: 150, fact: 100, map: 14 }
const at = (i: number) => cardAt(i, 'test-seed', SIZES, 7)

test('card 0 is the verse of the day', () => {
  expect(at(0)).toEqual({ kind: 'verse', pool: 'curated', poolIndex: 7, votd: true })
})

test('cards 1..10 follow the interleave cycle', () => {
  const kinds = Array.from({ length: 10 }, (_, j) => at(j + 1).kind)
  expect(kinds).toEqual(['verse', 'fact', 'verse', 'trivia', 'verse', 'map', 'verse', 'fact', 'verse', 'trivia'])
})

test('deterministic for same seed, different for different seed', () => {
  expect(cardAt(5, 's1', SIZES, 0)).toEqual(cardAt(5, 's1', SIZES, 0))
  const many = Array.from({ length: 30 }, (_, i) => i + 1)
  const a = many.map((i) => JSON.stringify(cardAt(i, 's1', SIZES, 0)))
  const b = many.map((i) => JSON.stringify(cardAt(i, 's2', SIZES, 0)))
  expect(a).not.toEqual(b)
})

test('no fact repeats until the fact pool is exhausted', () => {
  const seen: number[] = []
  for (let i = 1; seen.length < SIZES.fact; i++) {
    const c = at(i)
    if (c.kind === 'fact') seen.push(c.poolIndex)
  }
  expect(new Set(seen).size).toBe(SIZES.fact)
})

test('map pool reshuffles each epoch (still covers all items)', () => {
  const first: number[] = [], second: number[] = []
  for (let i = 1; second.length < SIZES.map; i++) {
    const c = at(i)
    if (c.kind !== 'map') continue
    if (first.length < SIZES.map) first.push(c.poolIndex)
    else second.push(c.poolIndex)
  }
  expect(new Set(first).size).toBe(SIZES.map)
  expect(new Set(second).size).toBe(SIZES.map)
})

test('verse cards are ~70% curated', () => {
  let curated = 0, corpus = 0
  for (let i = 1; curated + corpus < 100; i++) {
    const c = at(i)
    if (c.kind !== 'verse') continue
    if (c.pool === 'curated') curated++
    else corpus++
  }
  expect(curated).toBe(70)
  expect(corpus).toBe(30)
})
```

- [ ] **Step 2: Verify failure, implement**

```ts
// src/lib/feed.ts
import { shuffledRange } from './rng'

export interface PoolSizes { curated: number; corpus: number; trivia: number; fact: number; map: number }
export interface FeedItem {
  kind: 'verse' | 'trivia' | 'fact' | 'map'
  pool: 'curated' | 'corpus' | 'trivia' | 'fact' | 'map'
  poolIndex: number
  votd?: boolean
}

const CYCLE = ['verse', 'fact', 'verse', 'trivia', 'verse', 'map', 'verse', 'fact', 'verse', 'trivia'] as const
const PER_CYCLE = { verse: 5, fact: 2, trivia: 2, map: 1 } as const

function poolIndexFor(pool: string, occ: number, size: number, seed: string): number {
  const epoch = Math.floor(occ / size)
  return shuffledRange(size, `${seed}:${pool}:${epoch}`)[occ % size]
}

export function cardAt(i: number, seed: string, sizes: PoolSizes, votdIdx: number): FeedItem {
  if (i === 0) return { kind: 'verse', pool: 'curated', poolIndex: votdIdx % sizes.curated, votd: true }
  const j = i - 1
  const pos = j % CYCLE.length
  const fullCycles = Math.floor(j / CYCLE.length)
  const kind = CYCLE[pos]
  let inPartial = 0
  for (let p = 0; p < pos; p++) if (CYCLE[p] === kind) inPartial++
  const k = fullCycles * PER_CYCLE[kind] + inPartial // 0-based occurrence of this kind

  if (kind === 'verse') {
    const slot = k % 10
    if (slot < 7) {
      const occ = Math.floor(k / 10) * 7 + slot
      return { kind, pool: 'curated', poolIndex: poolIndexFor('curated', occ, sizes.curated, seed) }
    }
    const occ = Math.floor(k / 10) * 3 + (slot - 7)
    return { kind, pool: 'corpus', poolIndex: poolIndexFor('corpus', occ, sizes.corpus, seed) }
  }
  return { kind, pool: kind, poolIndex: poolIndexFor(kind, k, sizes[kind], seed) }
}
```

- [ ] **Step 3: Verify pass, commit** — `"feat: deterministic infinite feed generator with variety pattern"` + trailer

---

### Task 7: Persistence (`lib/store.ts`)

**Files:**
- Create: `src/lib/store.ts`
- Test: `src/lib/store.test.ts`

**Interfaces:**
- Consumes: `Favorite`, `CardKind` from `../content/types`.
- Produces: `getFavorites(): Favorite[]`, `toggleFavorite(f: Favorite): boolean`, `isFavorite(kind: CardKind, id: string): boolean`, `getScore(): number`, `addScore(n: number): number`, `getStreakState(): { count: number; last: string } | null`, `setStreakState(s: { count: number; last: string }): void`, `getInstallSeed(): string`. All survive missing/corrupt localStorage (in-memory fallback, never throws).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/store.test.ts
import { getFavorites, toggleFavorite, isFavorite, getScore, addScore, getStreakState, setStreakState, getInstallSeed } from './store'

beforeEach(() => localStorage.clear())

test('favorites toggle on and off, deduped by kind+id', () => {
  const f = { kind: 'verse' as const, id: 'JHN 3:16', title: 'John 3:16', body: 'For God so loved…' }
  expect(getFavorites()).toEqual([])
  expect(toggleFavorite(f)).toBe(true)
  expect(toggleFavorite({ ...f })).toBe(false)
  expect(getFavorites()).toEqual([])
  toggleFavorite(f)
  expect(isFavorite('verse', 'JHN 3:16')).toBe(true)
  expect(isFavorite('verse', 'GEN 1:1')).toBe(false)
})

test('score accumulates and persists', () => {
  expect(getScore()).toBe(0)
  expect(addScore(1)).toBe(1)
  expect(addScore(1)).toBe(2)
  expect(getScore()).toBe(2)
})

test('streak state round-trips; corrupt data resets to null', () => {
  expect(getStreakState()).toBeNull()
  setStreakState({ count: 3, last: '2026-07-09' })
  expect(getStreakState()).toEqual({ count: 3, last: '2026-07-09' })
  localStorage.setItem('bs:streak', '{not json')
  expect(getStreakState()).toBeNull()
})

test('install seed is stable once created', () => {
  const s = getInstallSeed()
  expect(s).toMatch(/^[0-9a-f]{16}$/)
  expect(getInstallSeed()).toBe(s)
})
```

- [ ] **Step 2: Verify failure, implement**

```ts
// src/lib/store.ts
import type { Favorite, CardKind } from '../content/types'

const mem = new Map<string, string>()
function read(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return mem.get(key) ?? null }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { mem.set(key, value) }
}
function readJSON<T>(key: string, ok: (v: unknown) => boolean): T | null {
  const raw = read(key)
  if (raw == null) return null
  try {
    const v = JSON.parse(raw)
    return ok(v) ? (v as T) : null
  } catch { return null }
}

export function getFavorites(): Favorite[] {
  return readJSON<Favorite[]>('bs:favorites', (v) => Array.isArray(v)) ?? []
}
export function isFavorite(kind: CardKind, id: string): boolean {
  return getFavorites().some((f) => f.kind === kind && f.id === id)
}
export function toggleFavorite(f: Favorite): boolean {
  const favs = getFavorites()
  const idx = favs.findIndex((x) => x.kind === f.kind && x.id === f.id)
  if (idx >= 0) favs.splice(idx, 1)
  else favs.unshift(f)
  write('bs:favorites', JSON.stringify(favs))
  return idx < 0
}

export function getScore(): number {
  return readJSON<number>('bs:score', (v) => typeof v === 'number' && v >= 0) ?? 0
}
export function addScore(n: number): number {
  const s = getScore() + n
  write('bs:score', JSON.stringify(s))
  return s
}

export interface StreakState { count: number; last: string }
export function getStreakState(): StreakState | null {
  return readJSON<StreakState>('bs:streak', (v) =>
    typeof v === 'object' && v !== null &&
    typeof (v as StreakState).count === 'number' &&
    /^\d{4}-\d{2}-\d{2}$/.test((v as StreakState).last ?? ''))
}
export function setStreakState(s: StreakState): void {
  write('bs:streak', JSON.stringify(s))
}

export function getInstallSeed(): string {
  const existing = read('bs:seed')
  if (existing && /^[0-9a-f]{16}$/.test(existing)) return existing
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const seed = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  write('bs:seed', seed)
  return seed
}
```

- [ ] **Step 3: Verify pass, commit** — `"feat: localStorage persistence with graceful fallback"` + trailer

---

### Task 8: Streak logic + score titles (`lib/streak.ts`)

**Files:**
- Create: `src/lib/streak.ts`
- Test: `src/lib/streak.test.ts`

**Interfaces:**
- Consumes: `StreakState` from `./store`.
- Produces: `updateStreak(prev: StreakState | null, today: string): StreakState`, `daysBetween(a: string, b: string): number`, `scoreTitle(n: number): string` (0+ "Seeker", 10+ "Student", 50+ "Scholar", 150+ "Berean").

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/streak.test.ts
import { updateStreak, daysBetween, scoreTitle } from './streak'

test('daysBetween handles month/year rollovers', () => {
  expect(daysBetween('2026-07-09', '2026-07-10')).toBe(1)
  expect(daysBetween('2026-07-31', '2026-08-01')).toBe(1)
  expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
  expect(daysBetween('2026-07-09', '2026-07-09')).toBe(0)
})

test('first visit starts streak at 1', () => {
  expect(updateStreak(null, '2026-07-09')).toEqual({ count: 1, last: '2026-07-09' })
})

test('same-day repeat visits do not change the streak', () => {
  expect(updateStreak({ count: 4, last: '2026-07-09' }, '2026-07-09')).toEqual({ count: 4, last: '2026-07-09' })
})

test('next-day visit increments', () => {
  expect(updateStreak({ count: 4, last: '2026-07-09' }, '2026-07-10')).toEqual({ count: 5, last: '2026-07-10' })
})

test('missed day resets to 1', () => {
  expect(updateStreak({ count: 9, last: '2026-07-07' }, '2026-07-09')).toEqual({ count: 1, last: '2026-07-09' })
})

test('score titles', () => {
  expect(scoreTitle(0)).toBe('Seeker')
  expect(scoreTitle(9)).toBe('Seeker')
  expect(scoreTitle(10)).toBe('Student')
  expect(scoreTitle(50)).toBe('Scholar')
  expect(scoreTitle(150)).toBe('Berean')
})
```

- [ ] **Step 2: Verify failure, implement**

```ts
// src/lib/streak.ts
import type { StreakState } from './store'

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
}

export function updateStreak(prev: StreakState | null, today: string): StreakState {
  if (!prev) return { count: 1, last: today }
  const gap = daysBetween(prev.last, today)
  if (gap === 0) return prev
  if (gap === 1) return { count: prev.count + 1, last: today }
  return { count: 1, last: today }
}

export function scoreTitle(n: number): string {
  if (n >= 150) return 'Berean'
  if (n >= 50) return 'Scholar'
  if (n >= 10) return 'Student'
  return 'Seeker'
}
```

- [ ] **Step 3: Verify pass, commit** — `"feat: streak logic and score milestone titles"` + trailer

---

### Task 9: Trivia content pack

**Files:**
- Create: `src/content/trivia.json`
- Test: `src/content/trivia.test.ts`

**Interfaces:**
- Produces: `trivia.json` = `TriviaItem[]`, **at least 150 items**, ids `t001`…

**Authoring rules (bind the author):** every question answerable directly from scripture; `ref` cites the proving passage (e.g. `"1 Samuel 17:49"`); `why` is 1–2 sentences that teach; choices are plausible (no joke answers); difficulty mix ≈ 60 easy / 60 medium / 30 hard; coverage across OT narrative, Psalms/wisdom, prophets, Gospels, Acts, epistles. Verify each answer against the WEB text in `public/content/verses.json` while authoring. Example items (match this shape exactly):

```json
[
  {
    "id": "t001",
    "q": "How many stones did David take from the brook to face Goliath?",
    "choices": ["Three", "Five", "Seven", "One"],
    "answer": 1,
    "why": "David chose five smooth stones from the brook, though he needed only one to bring Goliath down.",
    "ref": "1 Samuel 17:40",
    "difficulty": "easy"
  },
  {
    "id": "t002",
    "q": "Which book comes right after the Gospels?",
    "choices": ["Romans", "Hebrews", "Acts", "Revelation"],
    "answer": 2,
    "why": "Acts continues Luke's account, telling how the church spread from Jerusalem to Rome.",
    "ref": "Acts 1:1-2",
    "difficulty": "easy"
  },
  {
    "id": "t003",
    "q": "On which island was Paul shipwrecked on his voyage to Rome?",
    "choices": ["Cyprus", "Crete", "Malta", "Rhodes"],
    "answer": 2,
    "why": "After fourteen days of storm the ship ran aground on Malta, where the islanders showed unusual kindness.",
    "ref": "Acts 28:1",
    "difficulty": "medium"
  }
]
```

- [ ] **Step 1: Write failing validation test**

```ts
// src/content/trivia.test.ts
import trivia from './trivia.json'
import type { TriviaItem } from './types'

const items = trivia as TriviaItem[]

test('at least 150 valid trivia items', () => {
  expect(items.length).toBeGreaterThanOrEqual(150)
  const ids = new Set(items.map((t) => t.id))
  expect(ids.size).toBe(items.length)
  for (const t of items) {
    expect(t.q.length).toBeGreaterThan(10)
    expect(t.choices.length).toBeGreaterThanOrEqual(3)
    expect(t.choices.length).toBeLessThanOrEqual(4)
    expect(t.answer).toBeGreaterThanOrEqual(0)
    expect(t.answer).toBeLessThan(t.choices.length)
    expect(new Set(t.choices).size).toBe(t.choices.length)
    expect(t.why.length).toBeGreaterThan(20)
    expect(t.ref.length).toBeGreaterThan(3)
    expect(['easy', 'medium', 'hard']).toContain(t.difficulty)
  }
})

test('difficulty mix is reasonable', () => {
  const count = (d: string) => items.filter((t) => t.difficulty === d).length
  expect(count('easy')).toBeGreaterThanOrEqual(40)
  expect(count('medium')).toBeGreaterThanOrEqual(40)
  expect(count('hard')).toBeGreaterThanOrEqual(15)
})
```

- [ ] **Step 2: Author 150+ items** per the rules above; run `npm test` until PASS
- [ ] **Step 3: Commit** — `"feat: 150+ scripture-verified trivia questions"` + trailer

---

### Task 10: Did-you-know facts pack

**Files:**
- Create: `src/content/facts.json`
- Test: `src/content/facts.test.ts`

**Interfaces:**
- Produces: `facts.json` = `FactItem[]`, **at least 100 items**, ids `f001`…

**Authoring rules:** categories to cover — word origins ("Hallelujah" = Hebrew "praise Yah"), customs and culture (right hand of honor, sackcloth and ashes, city gates as courts), people profiles (Barnabas means "son of encouragement"), numbers and structure (shortest verse; Psalm 117 the shortest chapter), geography and daily life. `title` is a hook (≤ 60 chars); `body` 1–3 sentences, fascinating but strictly accurate; `ref` points where to look it up. Examples:

```json
[
  {
    "id": "f001",
    "title": "What does 'Hallelujah' actually mean?",
    "body": "It is Hebrew — 'halelu' (praise!) plus 'Yah' (a short form of Yahweh). It appears throughout the final Psalms, which open and close with it.",
    "ref": "Psalms 146:1"
  },
  {
    "id": "f002",
    "title": "The shortest verse in the Bible",
    "body": "'Jesus wept.' Just two words in English, spoken at the tomb of His friend Lazarus — a glimpse of God's own grief and compassion.",
    "ref": "John 11:35"
  },
  {
    "id": "f003",
    "title": "Barnabas was a nickname",
    "body": "His given name was Joseph; the apostles called him Barnabas, meaning 'son of encouragement' — and his story shows why he earned it.",
    "ref": "Acts 4:36"
  }
]
```

- [ ] **Step 1: Write failing validation test**

```ts
// src/content/facts.test.ts
import facts from './facts.json'
import type { FactItem } from './types'

const items = facts as FactItem[]

test('at least 100 valid facts', () => {
  expect(items.length).toBeGreaterThanOrEqual(100)
  expect(new Set(items.map((f) => f.id)).size).toBe(items.length)
  for (const f of items) {
    expect(f.title.length).toBeGreaterThan(5)
    expect(f.title.length).toBeLessThanOrEqual(70)
    expect(f.body.length).toBeGreaterThan(40)
    expect(f.ref.length).toBeGreaterThan(3)
  }
})
```

- [ ] **Step 2: Author 100+ facts**; run `npm test` until PASS
- [ ] **Step 3: Commit** — `"feat: 100+ did-you-know facts with scripture references"` + trailer

---

### Task 11: Map stories pack + projection

**Files:**
- Create: `src/content/maps.json`, `src/lib/geo.ts`
- Test: `src/lib/geo.test.ts`, `src/content/maps.test.ts`

**Interfaces:**
- Produces: `project(lat: number, lon: number): { x: number; y: number }` mapping lon 10–48°E / lat 27–42.5°N into a 400×300 viewBox; `maps.json` = `MapStory[]`, **at least 12 stories**, ids `m01`…; `places` listed in journey order when `route: true`.

- [ ] **Step 1: Write failing geo test**

```ts
// src/lib/geo.test.ts
import { project } from './geo'

test('projects known places inside the 400x300 viewBox', () => {
  const jerusalem = project(31.78, 35.22)
  expect(jerusalem.x).toBeGreaterThan(0); expect(jerusalem.x).toBeLessThan(400)
  expect(jerusalem.y).toBeGreaterThan(0); expect(jerusalem.y).toBeLessThan(300)
  const rome = project(41.9, 12.49)
  expect(rome.x).toBeLessThan(jerusalem.x)   // Rome is west
  expect(rome.y).toBeLessThan(jerusalem.y)   // Rome is north
})
```

- [ ] **Step 2: Implement**

```ts
// src/lib/geo.ts
export const VIEW = { w: 400, h: 300 }
const LON = { min: 10, max: 48 }
const LAT = { min: 27, max: 42.5 }

export function project(lat: number, lon: number): { x: number; y: number } {
  return {
    x: ((lon - LON.min) / (LON.max - LON.min)) * VIEW.w,
    y: ((LAT.max - lat) / (LAT.max - LAT.min)) * VIEW.h,
  }
}
```

- [ ] **Step 3: Author maps.json** — 12–15 stories. Required coverage: Exodus route (Rameses→Sinai→Kadesh), Paul's 1st/2nd/3rd journeys and voyage to Rome, Jesus' Galilee ministry (Nazareth/Capernaum/Sea of Galilee), Abraham's journey (Ur→Haran→Canaan), David fleeing Saul, the Exile to Babylon, Jonah and Nineveh, Ruth (Moab→Bethlehem), the Philistine conflicts, Elijah (Carmel→Horeb). Use real lat/lon (they'll be projected). Example:

```json
[
  {
    "id": "m01",
    "title": "Jonah runs the wrong way",
    "body": "Called to Nineveh in the east, Jonah boarded a ship at Joppa bound for Tarshish — the far western edge of the known world. God, of course, had other plans.",
    "ref": "Jonah 1:1-3",
    "route": true,
    "places": [
      { "name": "Joppa", "lat": 32.05, "lon": 34.75 },
      { "name": "Nineveh", "lat": 36.36, "lon": 43.15 }
    ]
  },
  {
    "id": "m02",
    "title": "Jesus around the Sea of Galilee",
    "body": "Most of Jesus' recorded ministry happened within a day's walk of this small lake — Capernaum His base, Nazareth His hometown in the hills to the west.",
    "ref": "Matthew 4:12-17",
    "route": false,
    "places": [
      { "name": "Nazareth", "lat": 32.7, "lon": 35.3 },
      { "name": "Capernaum", "lat": 32.88, "lon": 35.57 },
      { "name": "Cana", "lat": 32.75, "lon": 35.34 }
    ]
  }
]
```

- [ ] **Step 4: Write failing maps validation test**

```ts
// src/content/maps.test.ts
import maps from './maps.json'
import { project, VIEW } from '../lib/geo'
import type { MapStory } from './types'

const items = maps as MapStory[]

test('at least 12 valid map stories, all places project on-screen', () => {
  expect(items.length).toBeGreaterThanOrEqual(12)
  expect(new Set(items.map((m) => m.id)).size).toBe(items.length)
  for (const m of items) {
    expect(m.title.length).toBeGreaterThan(5)
    expect(m.body.length).toBeGreaterThan(40)
    expect(m.ref.length).toBeGreaterThan(3)
    expect(m.places.length).toBeGreaterThanOrEqual(1)
    expect(typeof m.route).toBe('boolean')
    for (const p of m.places) {
      const { x, y } = project(p.lat, p.lon)
      expect(x, `${m.id}:${p.name}`).toBeGreaterThanOrEqual(8)
      expect(x, `${m.id}:${p.name}`).toBeLessThanOrEqual(VIEW.w - 8)
      expect(y, `${m.id}:${p.name}`).toBeGreaterThanOrEqual(8)
      expect(y, `${m.id}:${p.name}`).toBeLessThanOrEqual(VIEW.h - 8)
    }
  }
})
```

- [ ] **Step 5: Run until PASS, commit** — `"feat: map projection and 12+ biblical map stories"` + trailer

---

### Task 12: Card shell, verse card, fact card

**Files:**
- Create: `src/components/cards/CardShell.tsx`, `src/components/cards/VerseCard.tsx`, `src/components/cards/FactCard.tsx`, plus card styles appended to `src/index.css`
- Test: `src/components/cards/cards.test.tsx`

**Interfaces:**
- Consumes: `toggleFavorite`, `isFavorite` from `../../lib/store`; `Favorite` from `../../content/types`.
- Produces:
  ```tsx
  function CardShell(props: { fav: Favorite; shareText: string; theme: number; children: ReactNode }): JSX.Element
  function VerseCard(props: { text: string; label: string; votd?: boolean; theme: number }): JSX.Element
  function FactCard(props: { fact: FactItem; theme: number }): JSX.Element
  ```
  `CardShell` renders `<article class="card theme-N">` with children + footer (heart ♥ toggling favorite, share button). Share uses `navigator.share({ text, url })`, falling back to `navigator.clipboard.writeText` + a transient "Copied!" indicator.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/cards/cards.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VerseCard } from './VerseCard'
import { FactCard } from './FactCard'
import { getFavorites } from '../../lib/store'

beforeEach(() => localStorage.clear())

test('VerseCard shows text, reference, and WEB attribution', () => {
  render(<VerseCard text="For God so loved the world…" label="John 3:16" theme={0} />)
  expect(screen.getByText(/God so loved/)).toBeInTheDocument()
  expect(screen.getByText(/John 3:16/)).toBeInTheDocument()
  expect(screen.getByText(/WEB/)).toBeInTheDocument()
})

test('VerseCard shows VOTD badge only when votd', () => {
  const { rerender } = render(<VerseCard text="t" label="l" votd theme={0} />)
  expect(screen.getByText(/Verse of the Day/i)).toBeInTheDocument()
  rerender(<VerseCard text="t" label="l" theme={0} />)
  expect(screen.queryByText(/Verse of the Day/i)).toBeNull()
})

test('long verse text is collapsed behind Read more', async () => {
  render(<VerseCard text={'word '.repeat(120)} label="Psalms 119:1" theme={1} />)
  await userEvent.click(screen.getByRole('button', { name: /read more/i }))
  expect(screen.queryByRole('button', { name: /read more/i })).toBeNull()
})

test('heart button saves a favorite', async () => {
  render(<VerseCard text="abc" label="Genesis 1:1" theme={0} />)
  await userEvent.click(screen.getByRole('button', { name: /save/i }))
  expect(getFavorites()).toHaveLength(1)
  expect(getFavorites()[0]).toMatchObject({ kind: 'verse', id: 'Genesis 1:1' })
})

test('FactCard renders title, body, ref', () => {
  render(<FactCard theme={2} fact={{ id: 'f001', title: 'A title here', body: 'Body text long enough to be a fact body for sure.', ref: 'John 11:35' }} />)
  expect(screen.getByText('A title here')).toBeInTheDocument()
  expect(screen.getByText(/John 11:35/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Verify failure, implement**

```tsx
// src/components/cards/CardShell.tsx
import { useState, type ReactNode } from 'react'
import type { Favorite } from '../../content/types'
import { toggleFavorite, isFavorite } from '../../lib/store'

export function CardShell({ fav, shareText, theme, children }: {
  fav: Favorite; shareText: string; theme: number; children: ReactNode
}) {
  const [saved, setSaved] = useState(() => isFavorite(fav.kind, fav.id))
  const [copied, setCopied] = useState(false)

  async function share() {
    const data = { text: shareText, url: new URL(import.meta.env.BASE_URL, location.origin).href }
    try {
      if (navigator.share) await navigator.share(data)
      else {
        await navigator.clipboard.writeText(`${shareText}\n${data.url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }
    } catch { /* user cancelled */ }
  }

  return (
    <article className={`card theme-${theme}`}>
      <div className="card-body">{children}</div>
      <footer className="card-actions">
        <button aria-label={saved ? 'Unsave' : 'Save'} className={saved ? 'act saved' : 'act'}
          onClick={() => setSaved(toggleFavorite(fav))}>
          {saved ? '♥' : '♡'}
        </button>
        <button aria-label="Share" className="act" onClick={share}>
          {copied ? 'Copied!' : '↗'}
        </button>
      </footer>
    </article>
  )
}
```

```tsx
// src/components/cards/VerseCard.tsx
import { useState } from 'react'
import { CardShell } from './CardShell'

export function VerseCard({ text, label, votd, theme }: {
  text: string; label: string; votd?: boolean; theme: number
}) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > 380
  const shown = long && !expanded ? `${text.slice(0, 340).trimEnd()}…` : text
  return (
    <CardShell theme={theme} shareText={`“${text}” — ${label} (WEB)`}
      fav={{ kind: 'verse', id: label, title: label, body: text }}>
      {votd && <div className="votd-badge">✦ Verse of the Day</div>}
      <p className="verse-text">{shown}</p>
      {long && !expanded && (
        <button className="read-more" onClick={() => setExpanded(true)}>Read more</button>
      )}
      <p className="verse-ref">{label} — WEB</p>
    </CardShell>
  )
}
```

```tsx
// src/components/cards/FactCard.tsx
import { CardShell } from './CardShell'
import type { FactItem } from '../../content/types'

export function FactCard({ fact, theme }: { fact: FactItem; theme: number }) {
  return (
    <CardShell theme={theme} shareText={`${fact.title} — ${fact.body} (${fact.ref})`}
      fav={{ kind: 'fact', id: fact.id, title: fact.title, body: fact.body }}>
      <div className="kicker">Did you know?</div>
      <h2 className="fact-title">{fact.title}</h2>
      <p className="fact-body">{fact.body}</p>
      <p className="verse-ref">{fact.ref}</p>
    </CardShell>
  )
}
```

Append to `src/index.css`:

```css
.card {
  height: 100dvh;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem 1.6rem 5.5rem;
  position: relative;
}
.card-body { max-width: 34rem; margin: 0 auto; width: 100%; }
.verse-text {
  font-family: var(--serif);
  font-size: clamp(1.35rem, 5.5vw, 1.7rem);
  line-height: 1.55;
  text-wrap: pretty;
}
.verse-ref { margin-top: 1.2rem; color: var(--accent); font-size: 0.95rem; letter-spacing: 0.04em; }
.votd-badge {
  color: var(--accent); font-size: 0.85rem; letter-spacing: 0.14em;
  text-transform: uppercase; margin-bottom: 1.1rem;
}
.kicker { color: var(--text-dim); font-size: 0.8rem; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 0.8rem; }
.fact-title { font-family: var(--serif); font-size: 1.5rem; margin-bottom: 0.8rem; line-height: 1.3; }
.fact-body { font-size: 1.08rem; line-height: 1.6; color: var(--text); }
.read-more { background: none; border: none; color: var(--accent); font-size: 1rem; margin-top: 0.6rem; cursor: pointer; }
.card-actions { position: absolute; bottom: 2.2rem; right: 1.6rem; display: flex; gap: 0.9rem; }
.act {
  background: color-mix(in srgb, var(--surface) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-dim) 30%, transparent);
  color: var(--text); border-radius: 999px; min-width: 2.9rem; height: 2.9rem;
  font-size: 1.25rem; cursor: pointer; padding: 0 0.8rem;
}
.act.saved { color: var(--accent); border-color: var(--accent-soft); }
```

- [ ] **Step 3: Verify pass, commit** — `"feat: card shell with save/share, verse and fact cards"` + trailer

---

### Task 13: Trivia card

**Files:**
- Create: `src/components/cards/TriviaCard.tsx`, styles appended to `src/index.css`
- Test: `src/components/cards/TriviaCard.test.tsx`

**Interfaces:**
- Consumes: `CardShell`, `TriviaItem`, `addScore` from `../../lib/store`.
- Produces: `function TriviaCard(props: { item: TriviaItem; theme: number; onScore: () => void }): JSX.Element` — `onScore` fires exactly once per card on a correct first answer (App uses it to refresh the TopBar).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/cards/TriviaCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TriviaCard } from './TriviaCard'
import { getScore } from '../../lib/store'

const item = {
  id: 't001', q: 'How many stones did David take?', choices: ['Three', 'Five', 'Seven'],
  answer: 1, why: 'He chose five smooth stones from the brook.', ref: '1 Samuel 17:40',
  difficulty: 'easy' as const,
}

beforeEach(() => localStorage.clear())

test('correct answer scores a point and reveals explanation', async () => {
  const onScore = vi.fn()
  render(<TriviaCard item={item} theme={0} onScore={onScore} />)
  expect(screen.queryByText(/smooth stones/)).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Five' }))
  expect(getScore()).toBe(1)
  expect(onScore).toHaveBeenCalledTimes(1)
  expect(screen.getByText(/smooth stones/)).toBeInTheDocument()
  expect(screen.getByText(/1 Samuel 17:40/)).toBeInTheDocument()
})

test('wrong answer reveals correct one, no point, no double answering', async () => {
  const onScore = vi.fn()
  render(<TriviaCard item={item} theme={0} onScore={onScore} />)
  await userEvent.click(screen.getByRole('button', { name: 'Three' }))
  expect(getScore()).toBe(0)
  expect(onScore).not.toHaveBeenCalled()
  expect(screen.getByText(/smooth stones/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Five' }))
  expect(getScore()).toBe(0) // locked after first answer
})
```

- [ ] **Step 2: Verify failure, implement**

```tsx
// src/components/cards/TriviaCard.tsx
import { useState } from 'react'
import { CardShell } from './CardShell'
import { addScore } from '../../lib/store'
import type { TriviaItem } from '../../content/types'

export function TriviaCard({ item, theme, onScore }: {
  item: TriviaItem; theme: number; onScore: () => void
}) {
  const [picked, setPicked] = useState<number | null>(null)

  function pick(i: number) {
    if (picked !== null) return
    setPicked(i)
    if (i === item.answer) {
      addScore(1)
      onScore()
    }
  }

  return (
    <CardShell theme={theme} shareText={`${item.q} (${item.ref})`}
      fav={{ kind: 'trivia', id: item.id, title: item.q, body: `${item.why} (${item.ref})` }}>
      <div className="kicker">Trivia · {item.difficulty}</div>
      <h2 className="trivia-q">{item.q}</h2>
      <div className="choices">
        {item.choices.map((c, i) => {
          let cls = 'choice'
          if (picked !== null) {
            if (i === item.answer) cls += ' correct'
            else if (i === picked) cls += ' wrong'
            else cls += ' dim'
          }
          return <button key={c} className={cls} onClick={() => pick(i)}>{c}</button>
        })}
      </div>
      {picked !== null && (
        <p className="trivia-why">
          {picked === item.answer ? '✓ ' : ''}{item.why} <span className="verse-ref">{item.ref}</span>
        </p>
      )}
    </CardShell>
  )
}
```

Append to `src/index.css`:

```css
.trivia-q { font-family: var(--serif); font-size: 1.4rem; line-height: 1.35; margin-bottom: 1.2rem; }
.choices { display: flex; flex-direction: column; gap: 0.7rem; }
.choice {
  text-align: left; padding: 0.9rem 1.1rem; border-radius: 0.8rem; font-size: 1.05rem;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-dim) 25%, transparent);
  color: var(--text); cursor: pointer; transition: background 0.25s, border-color 0.25s;
}
.choice.correct { border-color: var(--good); background: color-mix(in srgb, var(--good) 18%, var(--surface)); }
.choice.wrong { border-color: var(--bad); background: color-mix(in srgb, var(--bad) 16%, var(--surface)); }
.choice.dim { opacity: 0.55; }
.trivia-why { margin-top: 1rem; line-height: 1.55; color: var(--text); animation: fadein 0.4s ease; }
@keyframes fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }
```

- [ ] **Step 3: Verify pass, commit** — `"feat: interactive trivia card with scoring"` + trailer

---

### Task 14: Map card

**Files:**
- Create: `src/components/cards/MapCard.tsx`, `src/components/cards/BaseMap.tsx`, styles appended to `src/index.css`
- Test: `src/components/cards/MapCard.test.tsx`

**Interfaces:**
- Consumes: `project`, `VIEW` from `../../lib/geo`; `MapStory`; `CardShell`.
- Produces: `function MapCard(props: { story: MapStory; theme: number }): JSX.Element`; `function BaseMap(props: { children: ReactNode }): JSX.Element` (SVG with stylized land/sea, `viewBox="0 0 400 300"`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/cards/MapCard.test.tsx
import { render, screen } from '@testing-library/react'
import { MapCard } from './MapCard'

const story = {
  id: 'm01', title: 'Jonah runs the wrong way', route: true,
  body: 'Called east to Nineveh, Jonah sailed west from Joppa instead — toward the far edge of the known world.',
  ref: 'Jonah 1:1-3',
  places: [
    { name: 'Joppa', lat: 32.05, lon: 34.75 },
    { name: 'Nineveh', lat: 36.36, lon: 43.15 },
  ],
}

test('renders title, place labels, route line, and ref', () => {
  const { container } = render(<MapCard story={story} theme={0} />)
  expect(screen.getByText('Jonah runs the wrong way')).toBeInTheDocument()
  expect(screen.getByText('Joppa')).toBeInTheDocument()
  expect(screen.getByText('Nineveh')).toBeInTheDocument()
  expect(screen.getByText(/Jonah 1:1-3/)).toBeInTheDocument()
  expect(container.querySelectorAll('circle')).toHaveLength(2)
  expect(container.querySelector('polyline')).not.toBeNull()
})
```

- [ ] **Step 2: Verify failure, implement**

```tsx
// src/components/cards/BaseMap.tsx
import type { ReactNode } from 'react'
import { VIEW } from '../../lib/geo'

// Stylized eastern-Mediterranean world: sea background, simplified land masses.
// Not geographically precise — evocative, consistent with the app's aesthetic.
export function BaseMap({ children }: { children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="basemap" role="img" aria-label="Map of the biblical world">
      <rect width={VIEW.w} height={VIEW.h} fill="var(--map-sea)" />
      {/* Anatolia + Levant + Mesopotamia (north/east land mass) */}
      <path fill="var(--map-land)" d="M96,0 L400,0 L400,300 L285,300 C278,262 270,240 258,222 C250,208 246,196 250,182 C238,170 232,156 234,142 C222,132 214,120 210,106 L186,98 C170,92 154,90 138,84 C118,78 104,66 96,52 Z" />
      {/* Egypt / North Africa (south land mass) */}
      <path fill="var(--map-land)" d="M0,236 C40,228 90,224 140,230 C180,234 214,244 236,262 C244,274 248,288 250,300 L0,300 Z" />
      {/* Greece */}
      <path fill="var(--map-land)" d="M60,0 L88,0 C84,20 76,38 62,50 C52,58 44,52 48,40 C54,26 58,14 60,0 Z" />
      {/* Italy */}
      <path fill="var(--map-land)" d="M10,0 L34,0 C38,22 34,44 22,64 C14,74 6,70 8,56 C12,38 12,18 10,0 Z" />
      {/* Cyprus + Crete */}
      <ellipse cx="196" cy="130" rx="14" ry="6" fill="var(--map-land)" />
      <ellipse cx="102" cy="96" rx="20" ry="5" fill="var(--map-land)" />
      {children}
    </svg>
  )
}
```

```tsx
// src/components/cards/MapCard.tsx
import { CardShell } from './CardShell'
import { BaseMap } from './BaseMap'
import { project } from '../../lib/geo'
import type { MapStory } from '../../content/types'

export function MapCard({ story, theme }: { story: MapStory; theme: number }) {
  const pts = story.places.map((p) => ({ ...p, ...project(p.lat, p.lon) }))
  return (
    <CardShell theme={theme} shareText={`${story.title} — ${story.body} (${story.ref})`}
      fav={{ kind: 'map', id: story.id, title: story.title, body: `${story.body} (${story.ref})` }}>
      <div className="kicker">Biblical places</div>
      <h2 className="fact-title">{story.title}</h2>
      <BaseMap>
        {story.route && pts.length > 1 && (
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="var(--accent)" strokeWidth="2"
            strokeDasharray="5 4" strokeLinecap="round" />
        )}
        {pts.map((p) => (
          <g key={p.name}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="var(--accent)" stroke="var(--bg)" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 9} textAnchor="middle" className="map-label">{p.name}</text>
          </g>
        ))}
      </BaseMap>
      <p className="fact-body">{story.body}</p>
      <p className="verse-ref">{story.ref}</p>
    </CardShell>
  )
}
```

Append to `src/index.css`:

```css
:root { --map-sea: #1a2436; --map-land: #2c3245; }
@media (prefers-color-scheme: light) {
  :root { --map-sea: #cfd9e4; --map-land: #e6dfcf; }
}
.basemap { width: 100%; border-radius: 0.9rem; margin: 0.9rem 0 1rem; display: block; }
.map-label { font-size: 11px; fill: var(--text); font-family: var(--sans); paint-order: stroke; stroke: var(--map-sea); stroke-width: 3px; }
```

- [ ] **Step 3: Verify pass, commit** — `"feat: stylized SVG map card with routes and markers"` + trailer

---

### Task 15: Feed, top bar, app wiring

**Files:**
- Create: `src/components/Feed.tsx`, `src/components/TopBar.tsx`, `src/components/cards/resolve.tsx`
- Modify: `src/App.tsx`, `src/index.css` (append)
- Test: `src/components/Feed.test.tsx`

**Interfaces:**
- Consumes: everything above — `cardAt`, `dayKey`, `votdIndex`, `getInstallSeed`, `updateStreak`, `getStreakState`, `setStreakState`, `getScore`, `scoreTitle`, `VerseStore`, all card components, all content packs.
- Produces:
  ```tsx
  function resolveCard(item: FeedItem, verses: VerseStore, theme: number, onScore: () => void): ReactNode
  function Feed(props: { verses: VerseStore; onScore: () => void }): JSX.Element
  function TopBar(props: { streak: number; score: number; onFavorites: () => void; onAbout: () => void }): JSX.Element
  ```
  App shape: loads verses (loading state = pulsing "BibleScroll" wordmark), updates streak once on mount, holds `score`/`streak`/panel-visibility state.

- [ ] **Step 1: Write the failing test** (windowing + first card behavior)

```tsx
// src/components/Feed.test.tsx
import { render, screen } from '@testing-library/react'
import { Feed } from './Feed'
import { buildStore } from '../content/verseStore'
import { readFileSync } from 'node:fs'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

test('renders VOTD as the first card and placeholders beyond the window', () => {
  const { container } = render(<Feed verses={store} onScore={() => {}} />)
  expect(screen.getByText(/Verse of the Day/i)).toBeInTheDocument()
  const sections = container.querySelectorAll('.slot')
  expect(sections.length).toBeGreaterThanOrEqual(40)
  // slots beyond the ±3 window are empty placeholders
  expect(sections[10].querySelector('.card')).toBeNull()
  expect(sections[0].querySelector('.card')).not.toBeNull()
})
```

- [ ] **Step 2: Verify failure, implement**

```tsx
// src/components/cards/resolve.tsx
import type { ReactNode } from 'react'
import type { FeedItem } from '../../lib/feed'
import type { VerseStore } from '../../content/verseStore'
import { refLabel, refText, refKey } from '../../content/verseStore'
import { VerseCard } from './VerseCard'
import { FactCard } from './FactCard'
import { TriviaCard } from './TriviaCard'
import { MapCard } from './MapCard'
import { BOOKS } from '../../content/books'
import curated from '../../content/curated.json'
import trivia from '../../content/trivia.json'
import facts from '../../content/facts.json'
import maps from '../../content/maps.json'
import type { CuratedRef, TriviaItem, FactItem, MapStory } from '../../content/types'

export const POOL_SIZES = {
  curated: (curated as CuratedRef[]).length,
  corpus: 31103,
  trivia: (trivia as TriviaItem[]).length,
  fact: (facts as FactItem[]).length,
  map: (maps as MapStory[]).length,
}

export function resolveCard(item: FeedItem, verses: VerseStore, theme: number, onScore: () => void): ReactNode {
  switch (item.kind) {
    case 'verse': {
      if (item.pool === 'curated') {
        const ref = (curated as CuratedRef[])[item.poolIndex]
        return <VerseCard text={refText(verses, ref)} label={refLabel(ref)} votd={item.votd} theme={theme} />
      }
      const [b, c, v, text] = verses.list[item.poolIndex]
      return <VerseCard text={text} label={`${BOOKS[b] ?? b} ${c}:${v}`} theme={theme} />
    }
    case 'trivia':
      return <TriviaCard item={(trivia as TriviaItem[])[item.poolIndex]} theme={theme} onScore={onScore} />
    case 'fact':
      return <FactCard fact={(facts as FactItem[])[item.poolIndex]} theme={theme} />
    case 'map':
      return <MapCard story={(maps as MapStory[])[item.poolIndex]} theme={theme} />
  }
}
```

```tsx
// src/components/Feed.tsx
import { useRef, useState } from 'react'
import { cardAt } from '../lib/feed'
import { dayKey, votdIndex } from '../lib/votd'
import { getInstallSeed } from '../lib/store'
import type { VerseStore } from '../content/verseStore'
import { resolveCard, POOL_SIZES } from './cards/resolve'

const WINDOW = 3

export function Feed({ verses, onScore }: { verses: VerseStore; onScore: () => void }) {
  const [current, setCurrent] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const day = dayKey()
  const seed = `${getInstallSeed()}:${day}`
  const vi = votdIndex(day, POOL_SIZES.curated)
  const total = Math.max(current + 15, 40)

  function onScroll() {
    const el = ref.current
    if (!el || el.clientHeight === 0) return
    const i = Math.round(el.scrollTop / el.clientHeight)
    if (i !== current) setCurrent(i)
  }

  return (
    <div className="feed" ref={ref} onScroll={onScroll}>
      {Array.from({ length: total }, (_, i) => (
        <section className="slot" key={i}>
          {Math.abs(i - current) <= WINDOW
            ? resolveCard(cardAt(i, seed, POOL_SIZES, vi), verses, i % 5, onScore)
            : null}
        </section>
      ))}
    </div>
  )
}
```

```tsx
// src/components/TopBar.tsx
import { scoreTitle } from '../lib/streak'

export function TopBar({ streak, score, onFavorites, onAbout }: {
  streak: number; score: number; onFavorites: () => void; onAbout: () => void
}) {
  return (
    <header className="topbar">
      <span className="brand">BibleScroll</span>
      <span className="stats">
        <span title="Daily streak">🔥 {streak}</span>
        <span title={`Trivia score — ${scoreTitle(score)}`}>✓ {score}</span>
      </span>
      <span className="topbar-actions">
        <button aria-label="Favorites" onClick={onFavorites}>♥</button>
        <button aria-label="About" onClick={onAbout}>ⓘ</button>
      </span>
    </header>
  )
}
```

```tsx
// src/App.tsx (replace entirely)
import { useEffect, useState } from 'react'
import { Feed } from './components/Feed'
import { TopBar } from './components/TopBar'
import { loadVerses, type VerseStore } from './content/verseStore'
import { dayKey } from './lib/votd'
import { updateStreak } from './lib/streak'
import { getStreakState, setStreakState, getScore } from './lib/store'

export default function App() {
  const [verses, setVerses] = useState<VerseStore | null>(null)
  const [error, setError] = useState(false)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(getScore())
  const [panel, setPanel] = useState<'favorites' | 'about' | null>(null)

  useEffect(() => {
    const s = updateStreak(getStreakState(), dayKey())
    setStreakState(s)
    setStreak(s.count)
    loadVerses(import.meta.env.BASE_URL).then(setVerses).catch(() => setError(true))
  }, [])

  if (error) return <div className="splash">Couldn’t load — check your connection and refresh.</div>
  if (!verses) return <div className="splash pulse">BibleScroll</div>

  return (
    <div className="app">
      <TopBar streak={streak} score={score}
        onFavorites={() => setPanel('favorites')} onAbout={() => setPanel('about')} />
      <Feed verses={verses} onScore={() => setScore(getScore())} />
      {/* panels mount here in Task 16 */}
    </div>
  )
}
```

Append to `src/index.css`:

```css
.feed { height: 100dvh; overflow-y: auto; scroll-snap-type: y mandatory; overscroll-behavior: contain; }
.slot { height: 100dvh; scroll-snap-align: start; }
.topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 0.6rem) 1rem 0.6rem;
  background: linear-gradient(to bottom, color-mix(in srgb, var(--bg) 85%, transparent), transparent);
  pointer-events: none;
}
.topbar > * { pointer-events: auto; }
.brand { font-family: var(--serif); font-size: 1.05rem; color: var(--accent); }
.stats { display: flex; gap: 0.9rem; font-size: 0.95rem; color: var(--text-dim); }
.topbar-actions { display: flex; gap: 0.4rem; }
.topbar-actions button {
  background: none; border: none; color: var(--text-dim); font-size: 1.2rem;
  cursor: pointer; padding: 0.3rem 0.45rem;
}
.splash {
  height: 100dvh; display: grid; place-items: center;
  font-family: var(--serif); font-size: 1.6rem; color: var(--accent);
}
.pulse { animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.45; } }
```

- [ ] **Step 3: Verify pass** — `npm test` → PASS
- [ ] **Step 4: Manual smoke test** — `npm run dev`, open `http://localhost:5173/biblescroll/` in mobile emulation: VOTD first, snap scrolling, variety pattern, trivia answers work, score/streak show. Fix anything broken.
- [ ] **Step 5: Commit** — `"feat: infinite snap-scroll feed, top bar, app wiring"` + trailer

---

### Task 16: Favorites and About panels

**Files:**
- Create: `src/components/Favorites.tsx`, `src/components/About.tsx`, styles appended to `src/index.css`
- Modify: `src/App.tsx` (mount panels)
- Test: `src/components/Favorites.test.tsx`

**Interfaces:**
- Consumes: `getFavorites`, `toggleFavorite` from `../lib/store`.
- Produces: `function Favorites(props: { onClose: () => void }): JSX.Element`, `function About(props: { onClose: () => void }): JSX.Element` — slide-over panels covering the feed.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Favorites.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Favorites } from './Favorites'
import { toggleFavorite } from '../lib/store'

beforeEach(() => localStorage.clear())

test('empty state message', () => {
  render(<Favorites onClose={() => {}} />)
  expect(screen.getByText(/nothing saved yet/i)).toBeInTheDocument()
})

test('lists saved items grouped by kind and removes on unheart', async () => {
  toggleFavorite({ kind: 'verse', id: 'John 3:16', title: 'John 3:16', body: 'For God so loved…' })
  toggleFavorite({ kind: 'fact', id: 'f001', title: 'Shortest verse', body: 'Jesus wept.' })
  render(<Favorites onClose={() => {}} />)
  expect(screen.getByText('Verses')).toBeInTheDocument()
  expect(screen.getByText('Facts')).toBeInTheDocument()
  expect(screen.getByText('John 3:16')).toBeInTheDocument()
  await userEvent.click(screen.getAllByRole('button', { name: /remove/i })[0])
  expect(screen.queryByText('John 3:16')).toBeNull()
})

test('close button fires onClose', async () => {
  const onClose = vi.fn()
  render(<Favorites onClose={onClose} />)
  await userEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(onClose).toHaveBeenCalled()
})
```

- [ ] **Step 2: Verify failure, implement**

```tsx
// src/components/Favorites.tsx
import { useState } from 'react'
import { getFavorites, toggleFavorite } from '../lib/store'
import type { CardKind } from '../content/types'

const GROUPS: [CardKind, string][] = [
  ['verse', 'Verses'], ['trivia', 'Trivia'], ['fact', 'Facts'], ['map', 'Maps'],
]

export function Favorites({ onClose }: { onClose: () => void }) {
  const [favs, setFavs] = useState(getFavorites)
  return (
    <div className="panel">
      <header className="panel-head">
        <h1>Saved</h1>
        <button aria-label="Close" onClick={onClose}>✕</button>
      </header>
      {favs.length === 0 && <p className="empty">Nothing saved yet — tap ♡ on any card.</p>}
      {GROUPS.map(([kind, label]) => {
        const group = favs.filter((f) => f.kind === kind)
        if (group.length === 0) return null
        return (
          <section key={kind}>
            <h2>{label}</h2>
            {group.map((f) => (
              <div className="fav" key={`${f.kind}:${f.id}`}>
                <div>
                  <div className="fav-title">{f.title}</div>
                  <div className="fav-body">{f.body}</div>
                </div>
                <button aria-label={`Remove ${f.title}`}
                  onClick={() => { toggleFavorite(f); setFavs(getFavorites()) }}>♥</button>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
```

```tsx
// src/components/About.tsx
export function About({ onClose }: { onClose: () => void }) {
  return (
    <div className="panel">
      <header className="panel-head">
        <h1>About</h1>
        <button aria-label="Close" onClick={onClose}>✕</button>
      </header>
      <div className="about-body">
        <p>BibleScroll turns idle scrolling into time in the Word — verses, trivia, maps, and glimpses into the world of the Bible, one card at a time.</p>
        <p>Scripture quotations are from the <strong>World English Bible (WEB)</strong>, a public-domain modern English translation.</p>
        <p>Everything stays on your device. No account, no ads, no tracking — just Scripture.</p>
        <p className="verse-ref">“Your word is a lamp to my feet, and a light for my path.” — Psalm 119:105</p>
      </div>
    </div>
  )
}
```

In `src/App.tsx`, replace the panels comment with:

```tsx
      {panel === 'favorites' && <Favorites onClose={() => setPanel(null)} />}
      {panel === 'about' && <About onClose={() => setPanel(null)} />}
```

(add the imports for `Favorites` and `About` at the top).

Append to `src/index.css`:

```css
.panel {
  position: fixed; inset: 0; z-index: 20; background: var(--bg);
  overflow-y: auto; padding: calc(env(safe-area-inset-top) + 0.8rem) 1.2rem 2rem;
  animation: slidein 0.25s ease;
}
@keyframes slidein { from { transform: translateY(3%); opacity: 0; } }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; }
.panel-head h1 { font-family: var(--serif); font-size: 1.4rem; }
.panel-head button { background: none; border: none; color: var(--text-dim); font-size: 1.3rem; cursor: pointer; padding: 0.4rem; }
.panel h2 { font-size: 0.85rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-dim); margin: 1.4rem 0 0.6rem; }
.empty { color: var(--text-dim); margin-top: 2rem; text-align: center; }
.fav { display: flex; justify-content: space-between; gap: 0.8rem; padding: 0.9rem 0; border-bottom: 1px solid color-mix(in srgb, var(--text-dim) 18%, transparent); }
.fav-title { font-weight: 600; margin-bottom: 0.25rem; }
.fav-body { color: var(--text-dim); font-size: 0.95rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.fav button { background: none; border: none; color: var(--accent); font-size: 1.2rem; cursor: pointer; }
.about-body p { margin-bottom: 1rem; line-height: 1.6; }
```

- [ ] **Step 3: Verify pass, commit** — `"feat: favorites and about panels"` + trailer

---

### Task 17: PWA — icon, manifest, offline

**Files:**
- Create: `public/icon.svg`, `scripts/make-icons.mjs`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` (generated, committed)
- Modify: `vite.config.ts`, `index.html`

- [ ] **Step 1: Create public/icon.svg** — scroll-with-cross mark on the app's dark gradient

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1c2333"/><stop offset="1" stop-color="#12151c"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- open scroll -->
  <path d="M116 168 C116 148 136 136 156 136 L356 136 C376 136 396 148 396 168 L396 344 C396 364 376 376 356 376 L156 376 C136 376 116 364 116 344 Z"
        fill="none" stroke="#d4a95a" stroke-width="22"/>
  <line x1="116" y1="168" x2="116" y2="344" stroke="#d4a95a" stroke-width="22"/>
  <line x1="396" y1="168" x2="396" y2="344" stroke="#d4a95a" stroke-width="22"/>
  <!-- cross -->
  <line x1="256" y1="196" x2="256" y2="320" stroke="#e8e4da" stroke-width="26" stroke-linecap="round"/>
  <line x1="212" y1="236" x2="300" y2="236" stroke="#e8e4da" stroke-width="26" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: Write scripts/make-icons.mjs and run it**

```js
import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const svg = readFileSync('public/icon.svg', 'utf8')
for (const [size, name] of [[192, 'icon-192.png'], [512, 'icon-512.png'], [180, 'apple-touch-icon.png']]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(`public/${name}`, png)
  console.log(`wrote public/${name}`)
}
```

Run: `npm run icons` → Expected: three PNGs written.

- [ ] **Step 3: Configure vite-plugin-pwa** in `vite.config.ts`

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/biblescroll/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'BibleScroll',
        short_name: 'BibleScroll',
        description: 'An endless scroll of Scripture — verses, trivia, and the world of the Bible.',
        theme_color: '#12151c',
        background_color: '#12151c',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        maximumFileSizeToCacheInBytes: 8388608,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

The `maximumFileSizeToCacheInBytes` bump is required — `verses.json` (~4.6 MB) exceeds Workbox's 2 MB default and would silently be excluded from precache, breaking offline.

- [ ] **Step 4: Add apple-touch-icon to index.html** `<head>`

```html
    <link rel="apple-touch-icon" href="/biblescroll/apple-touch-icon.png" />
    <link rel="icon" href="/biblescroll/icon.svg" type="image/svg+xml" />
```

- [ ] **Step 5: Verify** — `npm run build && npm run preview`; open `http://localhost:4173/biblescroll/`; check devtools → Application: manifest valid, service worker active; Network → offline → reload → app still works.
- [ ] **Step 6: Commit** — `"feat: PWA manifest, icons, full offline precache"` + trailer

---

### Task 18: GitHub repo + Pages deploy

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: Write .github/workflows/deploy.yml**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
        with:
          enablement: true
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Write README.md** — name, one-paragraph description, screenshot placeholder omitted; sections: What it is, Tech (Vite/React/PWA, WEB translation credit), Develop (`npm install && npm run dev`), Test (`npm test`), Deploy (auto via Actions on push to main), and the live URL.

- [ ] **Step 3: Create the GitHub repo and push**

```bash
gh auth status   # confirm logged in; if not, STOP and ask the user to run: gh auth login
git add -A && git commit -m "feat: GitHub Pages deploy workflow and README

[co-author trailer]"
gh repo create biblescroll --public --source=. --push
```

- [ ] **Step 4: Watch the deploy and verify live**

```bash
gh run watch --exit-status   # Expected: workflow succeeds
gh api "repos/{owner}/biblescroll/pages" --jq .html_url
curl -sI <that URL> | head -1   # Expected: HTTP/2 200
```

Open the URL on a phone (or emulation) and verify: feed scrolls, VOTD first, installable, offline works after first load.

- [ ] **Step 5: Confirm the share URL** — verify `CardShell` builds its share URL from `new URL(import.meta.env.BASE_URL, location.origin)` (no hardcoded username). Fix if needed, commit, push.

---

## Verification (after all tasks)

- `npm test` — full suite green.
- `npm run build` — clean production build.
- Manual on-device pass: 15-minute scroll session comfort check (contrast, type size, snap feel), trivia scoring, streak increments next day, favorites persist across reload, share sheet works, install to home screen, airplane-mode reload works.
