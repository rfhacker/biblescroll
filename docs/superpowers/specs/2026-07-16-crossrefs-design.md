# Cross-References Swipe — Design Spec

**Date:** 2026-07-16
**Status:** Approved pending final review
**Amends:** the VerseSlide two-pane design (2026-07-16-commentary-swipe-design.md)

## Purpose

The opposite swipe from commentary: Scripture on Scripture. Swiping the
other way on any verse card opens the verse's cross-references from the
public-domain **Treasury of Scripture Knowledge (TSK)** — each related verse
shown with its WEB text inline, each one tap from its full chapter. One
gesture asks the commentators; the other lets the Bible echo itself.

## Constraints (unchanged app-wide)

Offline-first; no runtime external requests; no tracking; dark-pinned card
palette; warm tone; validation-tested data; feed performance untouched
(lazy panes, prefetch-on-mount only, no JS in the vertical scroll path).

## 1. Data

- **Source:** TSK (public domain). Vendoring decision tree (same discipline
  as commentary): (a) known machine-readable TSK conversions on GitHub
  (JSON/SQLite/CSV — probe the widely-mirrored `tsk` datasets); (b) the
  CrossWire SWORD TSK module (extract with a one-off parse); (c) BLOCKED
  protocol if neither meets assertions. Vendored intermediate committed to
  `data/crossrefs-raw.json`.
- **Normalized shape:** per-book files `public/crossrefs/{USFM}.json`:
  ```ts
  type CrossRefEntry = [c: number, v: number, refs: Ref[]]
  type Ref = [b: string, c: number, v: number, end?: number]
  ```
  sorted by (c, v); refs preserve TSK order (it is roughly
  relevance-ordered). Targets must resolve in the WEB corpus; the five
  omitted variant verses are dropped from targets and remapped as
  ANCHORS only if TSK keys them (log counts).
- **Validation tests:** every anchor and every target resolves; no empty
  ref lists; coverage sanity (TSK covers the vast majority of verses —
  floor ≥85% of canon verses have an entry, report actual); per-book and
  whole-set size budgets recorded at generation.
- **Tiering by measured size:** if the whole set ≤ 4.5MB raw, precache it
  (joins the always-offline core, like Henry Concise); if larger,
  runtime-cache (CacheFirst route alongside jfb/mhc) with
  prefetch-on-mount. The generation task measures and the plan's tiering
  task implements whichever branch reality picks — recorded explicitly.

## 2. Runtime

- `src/lib/crossrefs.ts` (pure, tested), mirroring `commentary.ts`:
  `crossRefsFor(entries, c, v): Ref[] | null`, `loadCrossRefs(book)`
  (result + in-flight caching), `prefetchCrossRefs(book)`.
- Ref TEXTS come from the already-loaded in-memory verse store — the
  dataset ships only the links, never duplicate scripture text.

## 3. UX

- **VerseSlide grows to three panes:** `[CrossRefsPane | VerseCard | CommentaryPane]`,
  initial position centered on the verse card (set instantly on mount via
  layout effect — no visible jump; re-centered only if never engaged).
  Swiping right (finger left→right) reveals cross-references; swiping left
  reveals commentary. Both side panes stay lazy: content renders only on
  first engagement toward that side; each side's data prefetches on mount
  (cheap, cached, once per book).
- **Affordance:** the single bottom-left chip becomes a two-part pill:
  `‹ References · Commentary ›` — each half tappable, snapping to its pane.
  Same geometry contract (clear of card-actions and the first-visit hint).
- **CrossRefsPane content:** kicker "Cross References"; heading
  "Scripture on {Book C:V}" (anchor = the card's verse; range cards use
  their start verse); then the list — each item: gold tappable ref label
  (opens the chapter reader at that verse) + its WEB text in serif
  (clamped to 4 lines with a per-item expand if longer). First 15 items
  render; a "Show all (N)" button reveals the rest (TSK lists can exceed
  50). Empty state (rare uncovered verse): "No cross-references recorded
  for this verse." Offline-uncached (only if runtime-cached tier):
  "References for this book aren't downloaded yet." Long lists scroll
  within the pane (`overscroll-behavior: contain`).
- Feelings feed verse cards get all of this automatically (same VerseSlide).

## 4. Components & files

| Unit | Responsibility |
|---|---|
| `scripts/fetch-crossrefs-data.mjs` | Vendor TSK → `data/crossrefs-raw.json` |
| `scripts/make-crossrefs.mjs` (npm run crossrefs) | → `public/crossrefs/{USFM}.json` |
| `src/lib/crossrefs.ts` + test | Lookup + cached loading |
| `src/components/cards/CrossRefsPane.tsx` + test | Pane UI, list, expand, states |
| `src/components/cards/VerseSlide.tsx` (mod) + test | Three panes, centering, two-part chip |
| `src/content/crossrefs.test.ts` | Pipeline validation |
| `vite.config.ts` (mod) | Tiering per the measured-size branch |
| `src/components/About.tsx` (mod) | credit "Cross-references: Treasury of Scripture Knowledge (public domain)." |

## 5. Testing

Pipeline validation (resolution, coverage floor, budgets); lib unit tests
(lookup incl. missing verse, cache semantics incl. in-flight dedup);
CrossRefsPane (lazy, list render with WEB texts, cap + Show all, tap →
chapter, empty/offline states); VerseSlide (initial centering — scrollLeft
equals one pane width after mount; both directions engage lazily; chip
halves navigate; commentary regression tests keep passing); feed
integration (no fetches beyond the two prefetches per book; vertical path
unchanged); tiering assertion per branch.

## Out of scope (parked, next round)

Fill-in-the-blank memorization cards as a new FEED CARD KIND (user-approved
follow-on): verses with progressively hidden words as scrollable feed items
alongside trivia/facts/maps.
