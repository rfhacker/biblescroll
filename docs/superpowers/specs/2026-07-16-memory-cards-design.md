# Memory Verse Cards — Design Spec

**Date:** 2026-07-16
**Status:** Approved (user-selected word-bank mechanics)

## Purpose

A new feed card kind: a beloved verse with 2–4 key words blanked and a
word bank below. Tap the right word, it fills in gold; tap wrong, it shakes
and stays. Complete the verse and it glows whole. Scripture memorization as
a native scrolling moment — "I have hidden your word in my heart."

## Constraints (unchanged app-wide)

No new content pipelines or downloads — everything derives from the bundled
curated refs + verse corpus. No tracking (completion stored on-device only).
Dark-pinned cards; warm tone; reduced-motion respected; ≥44px taps; feed
performance untouched. Suite green throughout.

## 1. Mechanics

- **Verse pool:** the 332 curated refs (its own seeded no-repeat stream,
  like every pool). Card text via `refText`, label via `refLabel`.
- **Blanks:** chosen algorithmically and deterministically per card
  (seeded by the feed seed + pool index — stable while you look at it,
  different across sessions): significant words only (≥4 letters after
  stripping punctuation, not in a small stopword list), spread across the
  verse (no two adjacent), count by verse length — 2 (<15 words),
  3 (15–28), 4 (>28). If a verse has too few significant words, blank as
  many as exist (min 1).
- **Word bank:** the blanked words + `count + 2` distractors — significant
  words sampled (seeded) from OTHER curated verses' texts, deduped against
  the answers case-insensitively — all shuffled together. Chips reuse the
  `.chip` styling.
- **Play:** blanks fill IN ORDER (the next empty blank is the target —
  shown with a subtle pulse). Tapping the correct chip fills the blank
  (gold) and removes the chip; a wrong chip shakes (static highlight under
  reduced motion) and increments a mistake counter. Matching is
  case-insensitive; punctuation stays attached to the verse text outside
  the blank.
- **Completion:** all blanks filled → the verse renders whole with a gentle
  affirmation "Hidden in your heart ✓" and the tappable reference
  (RefButton → chapter). A PERFECT fill (zero mistakes) awards +1 to the
  existing score via `addScore` — once ever per card, persisted in
  `bs:memorized` (mirrors `bs:answered`): a completed card remounts in its
  completed state and can never re-award.
- TopBar's score tooltip becomes just "Score" (it now spans trivia +
  memory).

## 2. Feed integration

- New `FeedItem` kind `'memory'`, pool `'memory'` (size = curated count,
  independent shuffle stream).
- Cycle grows 10 → 12:
  `verse, fact, verse, trivia, verse, map, verse, fact, verse, memory, verse, trivia`
  (verse 6/12 = 50%, fact 2, trivia 2, map 1, memory 1). The curated/corpus
  7-of-10 verse split is untouched (it keys off verse-occurrence count, not
  cycle shape).
- Memory cards are NOT wrapped in VerseSlide (no commentary/crossref panes —
  the card is a focused exercise; the completed state's RefButton is the
  doorway).
- resolve.tsx `case 'memory'` → `MemoryCard`.

## 3. Components & files

| Unit | Responsibility |
|---|---|
| `src/lib/memory.ts` + test | Tokenize, pickBlanks, buildWordBank — pure, seeded |
| `src/lib/store.ts` (mod) | `isMemorized(id)` / `setMemorized(id)` (`bs:memorized`) |
| `src/components/cards/MemoryCard.tsx` + test | The card UI + play state |
| `src/lib/feed.ts` (mod) + tests | kind 'memory', 12-cycle |
| `src/components/cards/resolve.tsx` (mod) | memory branch |
| `src/components/TopBar.tsx` (mod) | tooltip "Score" |

## 4. Testing

memory lib (determinism per seed, significant-word rules, adjacency, counts
by length, bank composition/dedupe/shuffle); store round-trip; MemoryCard
(fill order, wrong-tap mistake + chip stays, completion + affirmation,
perfect-fill scores once, remount-completed no re-award, reduced-motion
class); feed (new cycle order 1..12, memory pool no-repeat, verse split
unchanged); resolve renders MemoryCard for kind 'memory'; existing suite
green (Feed cycle tests updated deliberately).

## Out of scope

Streaks/stats pages for memorized verses; difficulty levels; typing input;
memorization of non-curated verses.
