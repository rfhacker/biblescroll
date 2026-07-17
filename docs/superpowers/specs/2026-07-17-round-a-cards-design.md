# Round A Cards — Design Spec

**Date:** 2026-07-17
**Status:** Approved ("let's go!" — staged roadmap: Round A cheap wins now; Round B prophecy-fulfillment/hymns/timeline next; Round C word study after)

## Purpose

Four new feed card kinds, all cheap wins on existing machinery: **Who said
it?** (speaker quiz), **Continue the verse** (ending quiz), **Prayer
moment** (restful, no interaction), **Names of God** (devotional). They
balance the feed: quiz, rest, devotion.

## Constraints (unchanged app-wide)

Public-domain content only (WEB scripture verbatim). No tracking. Four
bundled JSON packs — zero new pipelines or downloads. Dark-pinned cards;
curly punctuation (U+2019/U+201C/U+201D) in all copy and quotes; ≥44px
taps; all refs tappable (parseLooseRef/RefButton). Quiz kinds NOT wrapped
in VerseSlide. Suite green throughout; content validated against the
corpus at build time.

## 1. Feed integration

Cycle grows 12 → 20, verses stay exactly 50%:
`verse, fact, verse, trivia, verse, map, verse, whosaid, verse, fact,
verse, trivia, verse, memory, verse, continue, verse, prayer, verse, names`
PER_CYCLE: verse 10, fact 2, trivia 2, map 1, memory 1, whosaid 1,
continue 1, prayer 1, names 1. The curated/corpus 7-of-10 verse split is
untouched (keys off verse-occurrence count). Each new kind gets its own
seeded no-repeat pool stream, sized from its pack.

## 2. The four kinds

### Who said it? (`whosaid`, ~60 items, ids ws001…)
A WEB-verbatim quote (substring of its ref's text, curly punctuation) with
four speaker choices. Plays exactly like trivia: tap once per mount, wrong
locks the mount but only correct persists (`bs:answered`, same
getAnsweredPick/setAnsweredPick, ids don't collide with t###), correct
first-pick → addScore(1) once ever. Kicker "Who said it?"; quote styled as
a serif blockquote. Favoritable (kind `whosaid`).

### Continue the verse (`continue`, ~50 items, ids cv001…)
A famous verse stem with three candidate endings: the true one plus two
REAL endings lifted verbatim from other verses (never invented scripture);
the `why` line names where the impostors came from. Scoring identical to
trivia/whosaid. Kicker "Continue the verse". Favoritable (kind `continue`).

### Prayer moment (`prayer`, ~40 items, ids pr001…)
Original pastoral copy (1–3 sentences) tied to one ref; no interaction, no
score, no save/share actions — a deliberate rest between quiz kinds.
Kicker "A moment of prayer". Pastoral bar: same audit standard as the
feelings pack.

### Names of God (`names`, ~25 items, ids ng001…)
Name (transliteration) large, original script + language, meaning, a
1–2 sentence body, and tappable refs where it appears. No score.
Favoritable (kind `names`). Kicker "Names of God".

## 3. Components & architecture

The trivia pick/lock/score logic is extracted into a shared **QuizCard**
(kicker + prompt node + choices + why + RefButton, CardShell-wrapped);
TriviaCard becomes a thin adapter with unchanged behavior (existing tests
must pass unmodified), WhoSaidCard and ContinueCard are sibling adapters.
PrayerCard is a bare card (no CardShell). NamesCard uses CardShell.
`CardKind`/`FAVORITE_KINDS` gain `whosaid`, `continue`, `names` (NOT
prayer). resolve.tsx gains four cases; POOL_SIZES gains four entries.

| Unit | Responsibility |
|---|---|
| `src/content/whosaid.json` + validation test | 60 speaker quizzes |
| `src/content/continue.json` + validation test | 50 ending quizzes |
| `src/content/prayer.json` + validation test | 40 prayer prompts |
| `src/content/names.json` + validation test | 25 names |
| `src/components/cards/QuizCard.tsx` + adapters | shared quiz mechanics |
| `src/components/cards/PrayerCard.tsx`, `NamesCard.tsx` | devotional cards |
| `src/lib/feed.ts`, `resolve.tsx`, `store.ts`, `types.ts` | wiring |

## 4. Content validation (build-time, against the real corpus)

- whosaid: quote is a verbatim substring of `refText` for its parsed ref;
  4 unique choices containing the answer; all four answer indexes used
  across the pack; unique ids.
- continue: `stem + ' ' + endings[answer]` equals the ref's `refText`
  exactly; every distractor ending is a verbatim suffix of its named
  source ref's text; endings distinct; unique ids.
- prayer/names: every ref parses and resolves (pack-refs pattern); counts
  and unique ids; names have non-empty original/language/meaning.
- All packs join the existing `pack-refs.test.ts` ref sweep.
- Editorial gate (Task 6): fable-tier audit of ALL entries — speaker
  attribution, theology, pastoral tone, name meanings — before deploy.

## 5. Testing

QuizCard (pick locks mount, correct persists + scores once, wrong
re-encounterable, why+RefButton reveal); adapters render distinct kickers
and prompts; TriviaCard suite unchanged; PrayerCard/NamesCard render;
favorites round-trip for the three new kinds; feed cycle 1..20 +
no-repeat per new pool + verse split unchanged; resolve renders each new
kind. Full suite green.

## Out of scope

Round B (prophecy & fulfillment, hymn stories, timeline) and Round C
(word study / Strong's) — future rounds. Streaks per kind; difficulty
selection; audio.
