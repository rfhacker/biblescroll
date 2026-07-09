# BibleScroll — Design Spec

**Date:** 2026-07-09
**Status:** Approved pending final review

## Purpose

A mobile-first web app offering a Christian "doom scroll" alternative: an endless,
beautiful, full-screen feed of Bible verses, trivia, biblical maps, and
did-you-know facts. The goal is to redirect idle scrolling time (15-minute
sessions, often at night) into something spiritually nourishing and educational,
with just enough engagement mechanics to build the habit — and none of the dark
patterns of social media (no ads, no infinite outrage, no leaderboards).

## Platform & Stack

- **Mobile web app / PWA** — installable to home screen, works offline, no app
  store. Native wrapper possible later if validated.
- **Vite + React + TypeScript**, `vite-plugin-pwa` for service worker/manifest.
- **No backend.** All content bundled as static JSON; all user state
  (favorites, streak, score) in `localStorage`. Code structured so a backend
  could slot in later, but nothing in v1 requires one.
- **Hosting:** GitHub Pages, deployed by GitHub Actions on push to `main`.
  Repo created under the user's GitHub account via `gh`.

## Architecture

Single-page app. No router.

- **Feed screen** (main): full-height CSS `scroll-snap` container, one card per
  viewport, native momentum scrolling.
- **Top bar** (overlay): 🔥 streak counter, trivia score, Favorites button,
  About button.
- **Favorites & About**: slide-over panels above the feed.

### Modules (one clear purpose each)

| Module | Responsibility |
|---|---|
| `content/` | Bundled JSON packs: verses, trivia, facts, maps + TypeScript types |
| `lib/feed.ts` | Feed generator — infinite interleaved card sequence (pure, testable) |
| `lib/votd.ts` | Verse-of-the-day selection (deterministic by date) |
| `lib/streak.ts` | Streak tracking with date-rollover logic (pure, testable) |
| `lib/store.ts` | localStorage persistence: favorites, streak state, score, feed seed |
| `components/cards/` | One component per card type: Verse, Trivia, Map, Fact |
| `components/Feed.tsx` | Scroll-snap container + sliding mount window |
| `components/TopBar.tsx`, `Favorites.tsx`, `About.tsx` | Chrome/panels |
| `scripts/convert-web-xml.ts` | Build-time: WEB XML → verses JSON |

## The Feed

- **Infinite sequence** from a seeded generator. Each content type keeps its own
  seeded-shuffled pool; when a pool is exhausted it reshuffles with a new seed.
  No repeats until a pool is exhausted.
- **Interleave pattern** guarantees variety and keeps verses dominant, roughly:
  `verse, fact, verse, trivia, verse, map, verse, fact, verse, trivia, …`
  (~50% verses; map cards rarer since the pool is small).
- **Verse of the Day is always card #1** each calendar day — deterministic from
  the date, chosen from the curated list, same for every user. Gets a special
  badge/treatment on the card.
- **Verse weighting:** a curated "greatest hits" list (~300 refs: Psalms,
  Proverbs, promises, Gospel passages) is weighted heavily vs. the full ~31k
  verse corpus, so the feed feels nourishing rather than random. Long passages
  get a "read more" expansion.
- **Performance:** sliding window of ~7 mounted cards around the current
  position; memory flat regardless of scroll depth.

## Card Types & Content (v1 pack sizes)

1. **Verse card** — big serif type on rotating rich gradient/texture themes;
   reference line ("John 3:16 — WEB"); heart + share. Corpus: full WEB
   (~31,000 verses) converted at build time from `engwebp_vpl.xml` (public
   domain, already on disk in the sibling `biblos` project); ~300 curated
   weighted refs.
2. **Trivia card** — question + 3–4 answers; instant feedback (green/red),
   correct answer revealed, 1–2 sentence explanation **with scripture
   reference**; score increments. ~150 questions, mixed difficulty.
3. **Map card** — stylized inline SVG of the biblical Near East with
   highlighted route/markers per story (Exodus, Paul's journeys, Jesus'
   Galilee ministry, etc.) + short caption citing the passage. ~12–15 stories.
4. **Did-you-know card** — word origins, customs, people, numbers — always
   with a scripture reference. ~100 facts.

All trivia/fact/map content authored as JSON and verified against scripture.
No external APIs; everything works offline.

## Visual Design

Primary constraint: **comfortable to look at for 15+ minutes, often at night.**

- Dark-first palette; respects `prefers-color-scheme` but the dark theme is the
  flagship. No pure white backgrounds; soft, muted, rich gradients.
- Generous serif typography for scripture; clean sans for UI/trivia.
- High contrast without harshness; subtle motion only (fades/slides — no
  flashing, no bouncing).
- Rotating card background themes so consecutive cards feel distinct.

## Engagement (all on-device)

- **Favorites:** heart any card → Favorites panel, grouped by type.
- **Streak:** consecutive-day counter; missing a day resets, with encouraging
  (never guilt-based) copy.
- **Trivia score:** lifetime correct count with milestone titles
  (10 "Student", 50 "Scholar", 150 "Berean"). No leaderboards.
- **Share:** `navigator.share` with clipboard fallback; shares text + app link.

## PWA & Offline

- Installable (manifest + icons + splash), app name **BibleScroll** (working
  title).
- Service worker precaches app shell **and all content packs** — fully
  functional offline.

## Error Handling

- localStorage unavailable (private mode): app works, engagement features
  degrade gracefully (session-only state, no crash).
- Corrupt stored state: validated on load; invalid → reset that key.
- `navigator.share` unsupported: clipboard fallback with "Copied!" toast.

## Testing

- **Vitest** unit tests: feed generator (interleave pattern, no repeats until
  pool exhaustion, determinism per seed), verse-of-the-day (deterministic by
  date), streak logic (rollover, timezone edge at midnight, reset),
  trivia scoring, store validation/fallbacks.
- **Conversion script** validated against known WEB verse counts
  (66 books; spot-check verse totals).
- Manual mobile check via devtools emulation + real device on LAN.

## Out of Scope (v1)

Accounts/sync, push notifications, multiple translations, audio, comments or
any social features, native app stores, analytics.
