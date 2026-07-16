# BibleScroll — Menu, Feelings, Chapter Reader, Search — Design Spec

**Date:** 2026-07-15
**Status:** Approved pending final review

## Purpose

Four features that turn the feed from a stream into a place you can *go
somewhere*: a top-bar menu to host destinations; "How are you feeling?" —
hand-curated verses for emotional states, two taps from anywhere; a chapter
reader so every verse card opens into its context; offline search over the
whole corpus. The feelings feature is the soul of the round: the person
scrolling at 11pm because they're anxious gets scripture that meets them
there, even offline.

## Constraints (unchanged app-wide)

Fully offline, no external requests, no tracking; dark-first card aesthetic
with pinned card palette; warm, never guilt-based tone; content verified
against the bundled WEB corpus (31,098 verses); no router; localStorage keys
prefixed `bs:`; every content pack ships with a validation test.

## 1. Menu

- Top bar: replace the ♥ and ⓘ buttons with one ☰ button (aria-label "Menu").
  Streak and score stay.
- Tapping ☰ opens a compact dropdown sheet anchored under the bar (not a
  full-screen panel): **How are you feeling?**, **Search**, **Saved**,
  **About**. Tap outside (scrim) or ☰ again to dismiss. Subtle slide/fade,
  safe-area aware, dark-pinned like the top bar.
- Menu items set the existing App `panel` state, which grows to
  `'favorites' | 'about' | 'feelings' | 'search' | null`.

## 2. How are you feeling?

### Content pack — `src/content/feelings.json`

```ts
interface Feeling {
  id: string            // 'anxious'
  label: string         // 'Anxious'
  intro: string         // one empathetic line, shown as the result feed's first card
  refs: CuratedRef[]    // [book, chapter, verse, endVerse?] — 12–15 per feeling
}
```

- **16 feelings:** anxious, overwhelmed, sad, depressed, lonely, tired,
  angry, afraid, panicked, guilty, doubting, grieving, hopeful, grateful,
  joyful, tempted.
- 12–15 verified passages per feeling; ranges allowed (2–10 verses); refs
  may overlap across feelings; no duplicate refs *within* a feeling; none
  of the five omitted variant verses as endpoints or spanned.
- Heavy feelings (depressed, grieving, panicked, guilty) demand real
  pastoral care in selection: presence-of-God and comfort passages, never
  trite fix-it verses. Intros are empathetic, not chipper (anxious: "You're
  not the first to lie awake at night — and you're not alone in it.").
- Validation test: 16 feelings, unique ids/labels, intro length bounds,
  12 ≤ refs ≤ 15, all refs resolve, ranges ≤ 9 span, no within-feeling
  duplicates, no variant-verse conflicts.

### UX

- Full-screen panel (Favorites-style chrome): prompt line ("Whatever you're
  carrying, the Word meets you there."), 16 feeling chips (multi-select,
  accent border when selected), **Show me verses** button (disabled until
  ≥1 selected).
- Results: full-screen snap-scroll feed reusing the existing `VerseCard`
  (heart/share/chapter-tap all functional), card themes rotating as in the
  main feed. Card 0 = intro card (single feeling: its intro; multiple: a
  combined gentle line naming the feelings). Then the union of selected
  feelings' refs, deduped, shuffled with a seeded shuffle (seed =
  installSeed + sorted feeling ids so a session's order is stable but
  different users differ). After the last verse: a closing card — "May
  these stay with you — come back whenever you need them." with a Back
  button. A small header chip names the selected feelings; back arrow
  returns to the picker.
- This feed is finite (pool-sized), not infinite — by design.

## 3. Chapter reader

- The reference line on `VerseCard` becomes a button: `John 3:16 — WEB ›`.
  Tapping opens a bottom sheet over the current screen (feed, feelings
  results, favorites — anywhere a verse card renders) with an independent
  App state (`chapter: { b, c, highlight? } | null`), so it stacks over
  panels.
- Sheet content: book + chapter heading; all verses of the chapter as flowing
  serif text, each prefixed by a small accent verse number; the origin verse
  highlighted (soft accent background, scrolled into view on open). ‹ ›
  buttons walk prev/next chapter, crossing book boundaries (Genesis 50 ›
  Exodus 1); ‹ hidden at Genesis 1, › hidden at Revelation 22. Close (✕)
  returns to where you were.
- Data: pure helpers in `src/content/verseStore.ts` — chapters are
  contiguous slices of the canonical corpus (`chapterOf(store, b, c)`,
  `prevChapter`/`nextChapter` navigating a book/chapter index built once).
  The five omitted variant verses simply skip a number, matching printed
  WEB Bibles; documented in code and covered by a test (Acts 8 renders
  ...36, 38... without error).
- Entry points wired this round: verse cards (main feed + feelings feed),
  search results, Favorites rows of kind `verse` (which store `id` =
  human-readable label like "John 3:16" — parse back to (b, c, v) via a
  small reverse-lookup helper with a test; ranges open at the range start).

## 4. Search

- Menu → Search: full-screen panel with a search field (autofocused),
  results list, warm empty states ("No verses match yet — try fewer or
  simpler words").
- `src/lib/search.ts` (pure, tested):
  `searchVerses(store, query, limit = 50): { index: number; score: number }[]`
  — case/punctuation-insensitive word-prefix matching; ALL query terms must
  match a word prefix in the verse; rank by (exact-word matches > prefix
  matches, then fewer total words in verse = tighter match, then canonical
  order); cap 50. Single linear scan; debounced 250ms in the component;
  queries under 3 characters show guidance instead of scanning.
- Result row: reference (accent) + verse snippet with matched words bolded
  (~120 chars around the first match). Tap → chapter reader highlighting
  that verse. Result count shown ("38 verses").

## Components & files

| Unit | Responsibility |
|---|---|
| `components/Menu.tsx` | Dropdown sheet + scrim; items dispatch panel changes |
| `components/TopBar.tsx` (mod) | ☰ replaces ♥/ⓘ; opens Menu |
| `content/feelings.json` + test | The feelings pack |
| `components/Feelings.tsx` | Picker (chips) + results feed + intro/closing cards |
| `components/ChapterSheet.tsx` | Chapter reader bottom sheet |
| `content/verseStore.ts` (mod) | `chapterOf`, `prevChapter`, `nextChapter`, `parseRefLabel` |
| `lib/search.ts` + test | Pure search/ranking |
| `components/Search.tsx` | Search panel: field, results, empty states |
| `components/cards/VerseCard.tsx` (mod) | Ref line becomes chapter-opening button |
| `App.tsx` (mod) | panel union grows; independent `chapter` sheet state; provides `ChapterContext` |

**Chapter-open mechanism (pinned):** App provides a
`ChapterContext = { openChapter(b: string, c: number, v?: number): void }`.
`VerseCard` (via `parseRefLabel` on its label), `Search` results, and
`Favorites` verse rows consume it. Components without a provider (unit
tests) get a no-op default — the ref line renders but does nothing, so
existing card tests keep passing unmodified.

## Error handling

- Feelings pack malformed at runtime: impossible by validation test at build;
  defensive: unknown feeling id in state → ignored.
- Chapter math: `chapterOf` on a nonexistent chapter returns empty → sheet
  shows nothing rather than crashing (unit-tested); prev/next clamped at
  canon boundaries.
- Search: empty/short queries never scan; no matches is a designed state.
- `parseRefLabel` failure (corrupted favorite) → chapter button no-ops.

## Testing

- Feelings pack validation (counts, resolution, dedupe, variant safety) +
  scripture accuracy fact-check in review (same bar as trivia/facts).
- `search.ts` unit tests: ranking order, prefix vs exact, multi-term AND,
  punctuation/case, cap, short-query guard.
- Chapter helpers: slices, first/last chapter navigation across books,
  canon boundary clamps, Acts 8 variant skip, `parseRefLabel` round-trip
  including numbered books ("1 John 3:16") and ranges.
- Component tests: menu open/dismiss; chips multi-select → feed renders
  intro + expected count + closing card; VerseCard ref-tap opens sheet with
  highlight; search-type → results → tap → sheet.

## Out of scope (parked)

Reading plans, notifications, share-as-image, memorization, feelings
analytics of any kind (we deliberately do NOT record which feelings a user
selects — not even locally, beyond the transient session).
