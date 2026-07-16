# Henry Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the unabridged Matthew Henry as a third commentary source (`mhc`, runtime-cached like JFB), and label the Concise source accurately everywhere.

**Architecture:** Extend the shipped commentary pipeline and UI: vendor CCEL's multi-volume complete Henry into `mhc-raw.json`, generate per-book files, widen the source union + labels + copy, add `mhc` to the runtime-cache tier. No new components.

**Tech Stack:** Existing app; no new dependencies.

## Global Constraints

- `CommentarySource = 'mhcc' | 'mhc' | 'jfb'`; SOURCE_NAMES exactly: mhcc "Matthew Henry (Concise)", mhc "Matthew Henry (Complete)", jfb "Jamieson-Fausset-Brown"; default stays 'mhcc'.
- Copy strings parameterized: offline-uncached non-mhcc → `«SOURCE_NAME» for this book isn't downloaded yet — Matthew Henry (Concise) is always available offline.`; gap → `«SOURCE_NAME» doesn't comment on this verse —` + switch-to-Concise. mhcc transient failure copy unchanged ("Commentary couldn’t load." + Try again).
- Precache stays exactly 66 mhcc files + app shell; `mhc` and `jfb` runtime-cached (CacheFirst, maxEntries 160).
- mhc budgets: per-book ≤ 8,388,608B, whole-set ≤ 50,331,648B raw (tune + record); coverage 100%; the five omitted variant verses never endpoints.
- Do NOT push until the final task. Trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (`[co-author trailer]`). Suite currently 160/160.

---

### Task 1: Vendor the complete Henry

**Files:**
- Modify: `scripts/fetch-commentary-data.mjs`
- Create: `data/commentary/mhc-raw.json` (generated, committed)

**Interfaces:**
- Produces: `data/commentary/mhc-raw.json` — same shape as the existing raws (`{book, c, vStart, vEnd, text}[]`, canonical sort).

- [ ] **Step 1:** Extend the fetch script with an `mhc` source entry. CCEL hosts the complete Henry as volume works — probe in order: single-file `https://www.ccel.org/ccel/henry/mhc.xml`; else volume files `mhc1.xml` … `mhc6.xml` (work pages `ccel.org/ccel/henry/mhc1.html` etc. link the XML); ingest ALL volumes into one entry stream. Reuse the existing ThML machinery (scripCom `parsed=` attrs, chapter-div tracking, whole-chapter fallback, variant-endpoint clamping, narrow-override patterns). Volume boundaries must not reset book/chapter context incorrectly — each volume covers a contiguous canon span.
- [ ] **Step 2:** Assertions for mhc (mirroring mhcc): 66 books, ZERO missing chapters, entry floor ≥ 2,500, hygiene (≥40 chars, no `<`), sane sort. The unabridged text is huge — expect 20–40MB raw JSON; that is fine for a committed vendored artifact (it compresses well in git).
- [ ] **Step 3:** Run; record per-volume URLs, sizes, per-book counts, oddities (expect the same class of source quirks as mhcc — handle narrowly, document each).
- [ ] **Step 4:** `npm test` still green (nothing consumes mhc yet). Commit (script + mhc-raw.json) — `"feat: vendor unabridged Matthew Henry from CCEL volumes"` + trailer. BLOCKED protocol if no volume set parses to zero-missing-chapters.

---

### Task 2: Generate mhc per-book files + validation

**Files:**
- Modify: `scripts/make-commentary.mjs` (add 'mhc' to the source loop with its budgets), `src/content/commentary.test.ts`
- Create: `public/commentary/mhc/*.json` (generated, committed)

- [ ] **Step 1:** Add `mhc` to the generator's source list; budgets per Global Constraints; the gap-fill policy applies identically.
- [ ] **Step 2:** `npm run commentary` → 66 mhc files; record sizes (expect Psalms largest, possibly 5–8MB).
- [ ] **Step 3:** Extend `commentary.test.ts`: iterate `['mhcc', 'mhc', 'jfb']`; mhc coverage `toBe(1)`; mhc budgets per constraints; 66-book span for mhc too.
- [ ] **Step 4:** Full suite + build; verify dist contains `commentary/mhc/` (present in dist, NOT in precache — precache assertions come in Task 3). Commit — `"feat: per-book unabridged Henry with full-coverage validation"` + trailer.

---

### Task 3: Source union, labels, copy, tiering

**Files:**
- Modify: `src/lib/commentary.ts`, `src/lib/store.ts`, `src/components/cards/CommentaryPane.tsx`, `src/components/About.tsx`, `vite.config.ts`
- Test: extend `src/lib/commentary.test.ts`, `src/lib/store.test.ts`, `src/components/cards/CommentaryPane.test.tsx`

- [ ] **Step 1 (TDD):** failing tests first:
  - store: `setCommentarySource('mhc')` round-trips; garbage still → 'mhcc'.
  - commentary lib: `SOURCE_NAMES.mhc === 'Matthew Henry (Complete)'`; `SOURCE_NAMES.mhcc === 'Matthew Henry (Concise)'`; loadCommentary('mhc', …) URL hits `/commentary/mhc/`.
  - pane: three toggle chips `Concise`/`Full`/`JFB` (aria-pressed reflects selection); selecting Full loads mhc and header shows "Matthew Henry (Complete) · …"; offline-uncached copy for mhc reads `Matthew Henry (Complete) for this book isn't downloaded yet — Matthew Henry (Concise) is always available offline.` with the switch button; existing jfb copy test updated to the parameterized form (source name in front); mhcc header test updated to "(Concise)". Distinct books per test (module cache).
- [ ] **Step 2:** Implement: widen the union + SOURCE_NAMES; store validator accepts 'mhc' (quoted+raw); pane: `TOGGLE_LABELS = { mhcc: 'Concise', mhc: 'Full', jfb: 'JFB' }`, chips map over the three sources; failure/gap copy built from `SOURCE_NAMES[source]` per the Global Constraints strings (mhcc failure branch unchanged); About: "Commentary: Matthew Henry's Concise and Complete commentaries, and Jamieson-Fausset-Brown (public domain)."
- [ ] **Step 3:** vite.config: `globIgnores: ['**/commentary/jfb/**', '**/commentary/mhc/**']`; runtimeCaching urlPattern `/\/commentary\/(jfb|mhc)\/[A-Z0-9]+\.json$/`, cacheName 'ondemand-commentary', maxEntries 160. (The old 'jfb-commentary' cache name is retired; stale caches are harmless and expire naturally.)
- [ ] **Step 4:** Full suite + build; verify tiering: precache manifest = 66 mhcc, 0 jfb, 0 mhc; runtime route present. Commit — `"feat: Henry Complete source with accurate Concise labeling"` + trailer.

---

### Task 4: Final review + deploy

- [ ] **Step 1:** `npm test` + `npm run build`; controller runs a focused final review (this is an extension round — focus: tiering exactness, pane 3-way UX, mhc data spot-read incl. the reporting user's case Matthew 11:25–30 in FULL Henry, copy strings).
- [ ] **Step 2:** Push; watch Actions; live-verify: `curl -s https://jesusfeed.com/commentary/mhc/MAT.json | head -c 200` shows unabridged Henry ("In these verses we have Christ looking up to heaven…" for ch11 §25–30 when probed); precache check 66/0/0; bundle hash new.

---

## Verification (after all tasks)

Suite green; build clean; live: pick a Matthew 11:28–30 card → swipe → Concise renders; toggle Full → the complete exposition the user expected; offline behavior honest for both on-demand sources.
