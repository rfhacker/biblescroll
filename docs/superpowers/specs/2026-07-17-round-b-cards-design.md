# Round B Cards — Design Spec

**Date:** 2026-07-17
**Status:** Approved ("yes lets go")

## Purpose

Three new contemplative feed kinds: **Prophecy & Fulfillment** (paired OT
promise / NT fulfillment), **Hymn Story** (public-domain hymn stanza + the
story behind it), **Timeline** (where a story sits in the biblical sweep,
drawn as an SVG timeline). All favoritable; none scored.

## Constraints (unchanged app-wide)

Public-domain content only (WEB scripture rendered live from the corpus;
hymns published before 1929 with author/year verified). No tracking. Three
bundled JSON packs — zero new pipelines. Dark-pinned; curly punctuation in
authored copy; ≥44px taps; refs tappable; not VerseSlide-wrapped. Suite
green; corpus validation at build time; editorial audit before deploy.

## 1. Feed integration

Cycle 20 → 26, verses exactly half:
`verse, fact, verse, trivia, verse, map, verse, whosaid, verse, prophecy,
verse, fact, verse, trivia, verse, memory, verse, continue, verse, hymn,
verse, prayer, verse, names, verse, timeline`
PER_CYCLE: verse 13, fact 2, trivia 2, map/memory/whosaid/continue/prayer/
names/prophecy/hymn/timeline 1 each. Curated/corpus 7-of-10 verse split
untouched. `themeFor` already derives from CYCLE.length (its test's loop
bounds update 20 → 26; (s + 27c) % 5 still hits all 5 themes since
27 ≡ 2 mod 5). Each new kind gets its own seeded no-repeat pool.

## 2. The three kinds

### Prophecy & Fulfillment (`prophecy`, ~40 pairs, ids pf001…)
Two stacked passages rendered LIVE from the corpus (verbatim by
construction): "Foretold — {OT ref}" and "Fulfilled — {NT ref}", then a
one-sentence connecting note and both refs as RefButtons. Pair honesty
bar: favor NT passages that explicitly quote/cite the prophecy; the audit
gate verifies no interpretive stretch. Validation: prophecyRef resolves in
the OT, fulfillmentRef in the NT, combined text ≤ 480 chars, note 20–200.
Kicker "Prophecy · Fulfilled". Favoritable.

### Hymn Story (`hymn`, ~20, ids hy001…)
Title, author · year (1500–1928 enforced), a stanza (serif italic,
line-broken via `\n` + `white-space: pre-line`), the 2–3 sentence story of
its writing, and the scripture it echoes. Stanza/story accuracy and
public-domain status are audit-gate responsibilities (stanzas are typed,
not corpus-derived). Kicker "Hymn Story". Favoritable.

### Timeline (`timeline`, ~25, ids tl001…)
SVG horizontal timeline with six fixed era landmarks (Abraham, Exodus,
David, Exile, Jesus, Paul) and a gold marker at the item's `position`
(0–100 sweep scale); `when` label above the marker ("c. 1446 BC" /
"AD 95" — traditional approximate dating, audit-checked for
defensibility), title, blurb, RefButton. Validation: `when` parses
(optional "c. ", "N BC" or "AD N"), positions in [2, 98], and position
order is chronologically consistent with parsed years pack-wide.
Kicker "Biblical Timeline". Favoritable.

## 3. Components & architecture

New range-aware helpers in verseStore: `looseRefTuple(ref)` /
`looseRefText(store, ref)` (parseLooseRef + end-verse extraction).
ProphecyCard (takes `verses`), HymnCard, TimelineCard — all
CardShell-wrapped. CardKind/FAVORITE_KINDS gain all three; the Favorites
panel GROUPS gains all three IN THE SAME TASK (Round A lesson: an
unlisted kind wipes the favorites array, and a missing group hides saved
items — both have regression tests to extend).

| Unit | Responsibility |
|---|---|
| `src/content/{prophecy,hymns,timeline}.json` + validation tests | the packs |
| `src/content/verseStore.ts` (mod) | looseRefTuple/looseRefText + test |
| `src/components/cards/{ProphecyCard,HymnCard,TimelineCard}.tsx` | cards |
| `src/lib/feed.ts`, `resolve.tsx`, `store.ts`, `Favorites.tsx` | wiring |

## 4. Testing

Pack validation (OT/NT split, length caps, year bounds, chronology
consistency, curly apostrophes, unique ids, pack-refs sweep); helper unit
tests (range and single-verse refs); card render tests (kickers, era
labels, marker presence, stanza line breaks); favorites round-trip +
panel render for the three kinds; feed cycle 1..26 + no-repeat + verse
split + themeFor bounds update; resolve renders each kind. Suite green
throughout (currently 239).

## Out of scope

Round C word study (Strong's). Interactive timeline scrubbing; hymn
audio; prophecy apologetics beyond the one-line note.
