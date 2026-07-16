# JesusFeed Commentary Swipe — Design Spec

**Date:** 2026-07-16
**Status:** Approved pending final review

## Purpose

Every verse card gains a sideways swipe into public-domain Protestant
commentary: **Matthew Henry's Concise Commentary** (default — warm,
devotional, passage-based) and **Jamieson-Fausset-Brown** (toggle — verse-by-
verse, scholarly). A verse card stops being a dead end: context is one swipe
away, at zero cost to the feed's speed.

## Constraints (unchanged app-wide)

Fully offline core promise; no external requests at runtime; no tracking
(the Henry/JFB preference is stored as `bs:commentary`, a setting, never
telemetry); dark-first pinned card palette; warm tone; validation tests for
all shipped content; the feed's current performance is not to regress —
commentary must be pay-only-when-used.

## 1. Data pipeline (pattern: Bible text / Natural Earth)

- One-time vendoring script `scripts/fetch-commentary-data.mjs` (dev-machine
  only, never CI): pulls digitized public-domain texts — primary source CCEL
  electronic editions (Henry Concise: ccel.org/ccel/henry/mhcc; JFB:
  ccel.org/j/jfb) — normalizes to a common shape, writes vendored
  intermediates to `data/commentary/` (committed). Fallback source if CCEL
  structure resists parsing: the TheologAI project's public-domain SQLite
  packaging (verify its data provenance at implementation time; the
  underlying texts are unambiguously public domain).
- Generator `scripts/make-commentary.mjs` (npm run commentary): vendored
  intermediates → per-book JSON at `public/commentary/mhcc/{USFM}.json` and
  `public/commentary/jfb/{USFM}.json`:
  ```ts
  type CommentaryEntry = [c: number, vStart: number, vEnd: number, text: string]
  // file = CommentaryEntry[], sorted by (c, vStart)
  ```
- Text normalization: strip HTML artifacts/footnote markers; preserve
  paragraph breaks as `\n\n`; scripture quotes stay inline. No editorializing
  — the text ships as the authors wrote it (modernized spelling only if the
  source edition already did so).
- Validation tests (`src/content/commentary.test.ts`):
  - every entry's `(c, vStart)` and `(c, vEnd)` resolve in the WEB corpus
    (the five omitted variant verses may fall INSIDE ranges but must not be
    endpoints — same rule as other packs);
  - Henry: every canon verse is covered by ≥1 entry (Henry is
    passage-complete; test asserts full coverage per book);
  - JFB: coverage gaps allowed (JFB skips some verses) but ≥80% of verses
    per book covered — a canary against a broken parse;
  - text non-empty, no `<` HTML remnants, per-file size budget (Henry ≤
    120KB/book, JFB ≤ 400KB/book raw) and whole-set budgets (Henry ≤ 4MB,
    JFB ≤ 16MB raw) — hard numbers tuned at generation, recorded in the
    plan's execution report if adjusted.

## 2. Offline tiering

- **Henry: precached.** The per-book mhcc files join the Workbox precache
  (globPatterns already include json) — the default commentary is always
  offline. Precache grows ~3–4MB raw (~1MB transfer).
- **JFB: runtime-cached.** Excluded from precache via glob ignore; a Workbox
  `runtimeCaching` route (CacheFirst, `/commentary/jfb/`) caches each book
  on first use. Offline + uncached book → the pane shows: "JFB for this book
  isn't downloaded yet — Matthew Henry is always available offline." and the
  Henry text remains one toggle away.

## 3. Runtime lookup

- `src/lib/commentary.ts` (pure, tested):
  - `commentaryFor(entries: CommentaryEntry[], c: number, v: number): CommentaryEntry | null`
    — the entry whose `[vStart, vEnd]` covers v in chapter c (first match by
    sort order).
  - `loadCommentary(source: 'mhcc' | 'jfb', book: string): Promise<CommentaryEntry[]>`
    — fetch + in-memory Map cache keyed `source:book`; rejects cleanly
    offline-uncached (the pane maps that to the friendly message).
- Preference: `getCommentarySource()/setCommentarySource()` in `lib/store.ts`
  (`bs:commentary`, values 'mhcc' | 'jfb', default 'mhcc', validated).

## 4. UX

- **Two-pane track.** Each verse card slot (main feed AND feelings feed)
  wraps VerseCard in a horizontal scroll-snap track: pane 1 = the existing
  card, pane 2 = CommentaryPane. Native CSS snap (`overflow-x`,
  `scroll-snap-type: x mandatory`), no JS in the scroll path, vertical feed
  behavior unchanged. Non-verse cards unchanged.
- **Lazy everything.** CommentaryPane's CONTENT renders only after the track
  first scrolls toward it (IntersectionObserver on pane 2, or first-scroll
  handler on the track — implementation's choice, tested either way). On
  verse-card mount, the book's Henry file is prefetched (cheap, SW-cached,
  once per book per session) so the swipe feels instant. JFB loads only when
  toggled.
- **Pane content:** header "Matthew Henry · John 3:16–18" (source name +
  covered range from the entry, NOT the card's label — ranges differ);
  comment text in `--serif` at chapter-reader sizing; `Henry | JFB` toggle
  chips (persisted); tappable ref (RefButton) to the chapter; long text
  scrolls inside the pane (`overscroll-behavior: contain`).
- **No entry found** (JFB gap): "JFB doesn't comment on this verse —" +
  one-tap switch to Henry.
- **Discoverability chip:** small dim "Commentary ›" bottom-left on verse
  cards (clear of heart/share bottom-right and the first-visit hint band);
  tapping it snaps the track to pane 2. Always present on verse cards —
  quiet enough not to clutter.
- **Dark-pinned** like all card surfaces; ≥44px touch targets; reduced-motion
  unaffected (snap is user-driven).

## 5. Performance guarantees (the "keep it quick" contract)

- Main JS bundle: no commentary text (network files only).
- Feed scroll path: no new JS handlers on vertical scroll; horizontal tracks
  are pure CSS until swiped.
- Mounted DOM bounded: panes render placeholder shells until first swiped;
  the ±3 card window semantics unchanged.
- Tests assert: no commentary fetch occurs before a verse card mounts
  (mock fetch in Feed tests stays clean of `/commentary/` until a card
  mounts, and pane content absent until track scroll).

## 6. About / credits

About panel adds: "Commentary: Matthew Henry's Concise Commentary and
Jamieson-Fausset-Brown (public domain)."

## Components & files

| Unit | Responsibility |
|---|---|
| `scripts/fetch-commentary-data.mjs` | Vendor CCEL texts → `data/commentary/` (committed) |
| `scripts/make-commentary.mjs` | → `public/commentary/{mhcc,jfb}/{USFM}.json` |
| `src/lib/commentary.ts` + test | `commentaryFor`, `loadCommentary` cache |
| `src/lib/store.ts` (mod) | `bs:commentary` preference |
| `src/components/cards/CommentaryPane.tsx` + test | Pane UI, toggle, offline/gap states |
| `src/components/cards/VerseSlide.tsx` + test | Two-pane track wrapper (card + lazy pane) |
| `src/components/Feed.tsx`, `Feelings.tsx` (mod) | Wrap verse cards in VerseSlide |
| `src/content/commentary.test.ts` | Pipeline validation |
| `vite.config.ts` (mod) | Precache mhcc; runtimeCaching for jfb |
| `src/components/About.tsx` (mod) | Credit line |

## Error handling

Fetch failure online (transient) → retry-on-next-swipe message; offline
uncached JFB → friendly tiered message (above); malformed cached JSON →
treated as fetch failure (cache entry discarded); missing entry → gap
message with Henry switch.

## Testing

Pipeline validation (coverage/integrity/budgets/endpoints); `commentaryFor`
ranges incl. chapter boundaries; `loadCommentary` cache + failure paths;
CommentaryPane states (loading, entry, gap, offline-JFB, toggle persistence);
VerseSlide lazy-render; Feed/Feelings integration (non-verse cards untouched;
no prefetch before mount); About credit.

## Out of scope (v1)

Commentary in the chapter sheet or search results (verse cards only);
additional commentaries (data model already allows more sources); commentary
search; per-verse JFB deep-linking from the pane.
