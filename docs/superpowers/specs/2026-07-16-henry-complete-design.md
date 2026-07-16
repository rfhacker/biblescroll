# Henry Complete (Third Commentary Source) — Design Spec

**Date:** 2026-07-16
**Status:** Approved (user-selected option)
**Amends:** 2026-07-16-commentary-swipe-design.md

## Problem

Users comparing our "Matthew Henry" against the famous unabridged commentary
perceive our Concise text as truncated (field report: Matthew 11:25–30). The
Concise is a different, much shorter work — correctly shipped, mislabeled by
omission, and missing the depth users may want.

## Decision

1. **Accurate labeling:** the Concise source is presented as
   "Matthew Henry (Concise)" everywhere (pane header, About).
2. **New source `mhc` — Matthew Henry (Complete):** the unabridged commentary,
   vendored from CCEL with the existing pipeline, tiered like JFB
   (runtime-cached per book on demand; never precached — it is far too large).
   Concise (`mhcc`) remains the precached always-offline default.

## Specifics

- `CommentarySource = 'mhcc' | 'mhc' | 'jfb'`; `SOURCE_NAMES`:
  mhcc "Matthew Henry (Concise)", mhc "Matthew Henry (Complete)",
  jfb "Jamieson-Fausset-Brown". Store validator accepts all three; default
  unchanged ('mhcc').
- Toggle chips: `Concise | Full | JFB` (short labels; header shows the full
  source name). Preference semantics unchanged.
- Offline-uncached copy generalizes to non-default sources:
  "«SOURCE_NAME» for this book isn't downloaded yet — Matthew Henry (Concise)
  is always available offline." (JFB string therefore changes only by the
  source name; the Concise always-offline promise is the constant.)
- Gap copy likewise parameterized by source name; escape hatch still switches
  to mhcc.
- Vendoring: CCEL's complete Henry ships as multiple volume files — the
  fetch script ingests all volumes into one normalized `mhc-raw.json`
  (same shape). Same assertion discipline: 66 books, zero missing chapters
  (Henry Complete covers the whole canon), no variant endpoints, hygiene.
- Generation: same per-book files + gap-fill; budgets sized for the
  unabridged text: per-book ≤ 8MB, whole-set ≤ 48MB raw (tune at generation,
  record actuals); coverage floor 100% like mhcc.
- Workbox: `globIgnores` adds `**/commentary/mhc/**`; the runtime CacheFirst
  route covers both `jfb` and `mhc`; `maxEntries` 160 (2 × 66 books + slack).
- Precache MUST remain exactly the 66 mhcc files (+app shell) — verified in
  the final gate.
- Note: per-file 8MB budget exceeds the SW `maximumFileSizeToCacheInBytes`
  (8,388,608) only at the margin — runtime-cached files are not subject to
  the precache limit, but keep per-book ≤ 8MB so cache storage stays sane.

## Out of scope

Search within commentary; diffing Concise vs Complete; other commentaries.

## Testing

Pipeline validation extended to mhc (coverage 100%, budgets, endpoints,
hygiene); lib/store source-union tests; pane toggle 3-way + copy tests;
tiering test (precache still 66 mhcc / 0 jfb / 0 mhc); About wording.
