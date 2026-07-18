# Round C Word Study Cards — Design Spec

**Date:** 2026-07-18
**Status:** Approved ("good to go!")

## Purpose

One new contemplative feed kind: **Word Study** — the Hebrew/Greek behind a
beloved biblical word (chesed, agape, shalom, logos…), validated at build
time against vendored public-domain Strong's dictionaries.

## Constraints (unchanged app-wide)

Public-domain only — **provenance verified at vendor time; if only
CC-BY/other-licensed machine-readable Strong's sources exist, STOP and ask
the user** (standing rule). No tracking. The dictionaries are BUILD-SIDE
ONLY (data/, validation tests) — the client ships just the small words
pack; precache unchanged. Dark-pinned; curly punctuation; ≥44px taps;
tappable refs; not VerseSlide-wrapped; no score. Suite green throughout.

## 1. Data pipeline (the "bigger round" part)

- `scripts/fetch-strongs.mjs` (run manually, never in CI — pattern of
  fetch-commentary-data.mjs): downloads Strong's Greek and Hebrew
  dictionary data from a verified public-domain machine-readable source,
  extracts minimal fields per entry — `{ number ("H2617"/"G26"), lemma
  (original script), translit, definition }` — and writes committed
  `data/strongs/hebrew.json` + `data/strongs/greek.json`.
- `data/strongs/PROVENANCE.md` records source URL, license evidence, and
  fetch date (discipline from the TSK/commentary vendors).
- A data-shape test validates both files (entry counts in known Strong's
  ranges — Hebrew ~8674, Greek ~5624 — id formats, non-empty lemmas).

## 2. The pack (`src/content/words.json`, ~50 entries, ids wd001…)

`{ id, strongs, word, translit, language: 'Hebrew'|'Greek'|'Aramaic',
gloss, body, refs: [1–3 display refs] }`

- `word` is the original-script lemma **byte-copied programmatically from
  the vendored dictionary** (equality enforced by test — the same
  never-retype rule as scripture).
- `translit` is a modern reader-friendly transliteration (authored; audit
  checks it against the dictionary's).
- `gloss` 10–60 chars (the one-line meaning); `body` 80–400 chars, 2–3
  sentences on the word's texture; refs resolve and are places the WEB
  genuinely translates this word (audit-verified).
- Validation: strongs number exists in the dictionary; word === dictionary
  lemma; language matches script (Aramaic → Hebrew script); counts ≥ 48;
  curly punctuation; unique ids; refs parse/resolve (pack-refs sweep).
- Mix: roughly half Hebrew, half Greek, spanning both testaments.

## 3. Card & feed

**WordCard** (CardShell, favoritable kind `word`, no score): kicker
`Word Study`; the original script large; a byline `{translit} · {language}
· Strong’s {strongs}`; the gloss in accent; the body; tappable refs.

Feed cycle 26 → 28: append `verse, word` to the existing cycle (verse 14 =
50%, word 1). themeFor unchanged (28+1 ≡ 4 mod 5, coprime — rotation
holds; test bounds 26 → 28). CardKind, FAVORITE_KINDS, AND Favorites
GROUPS (`Word Studies`) all gain `word` together, regression-tested (the
twice-bitten lesson).

## 4. Testing

Dictionary shape tests; pack validation (dictionary cross-checks, script/
language, lengths, refs); WordCard render (kicker, script, byline, gloss,
refs); favorites round-trip + panel; feed cycle 1..28 + word no-repeat +
verse split + themeFor bounds; resolve kicker. Audit gate: gloss/body
faithful to Strong's definition without over-claiming; translit accuracy;
each cited verse genuinely renders the word; nothing a Hebrew/Greek
student would flag as wrong.

## Out of scope

Full-dictionary browsing; occurrence counts (needs tagged texts);
morphology; audio pronunciation.
