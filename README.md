# JesusFeed

A Christian alternative to doom-scrolling: an endless, snap-scrolling feed of
Scripture and Scripture-adjacent cards — built for the same swipe-and-scroll
habit as social media, minus the social media. No accounts, no ads, no
tracking. Installs as an offline-first PWA so it works on a plane, in a
basement, or anywhere else the signal doesn't reach.

**Live:** https://jesusfeed.com/ (the old rfhacker.github.io/biblescroll URL redirects)

## What it is

Open the app and start scrolling. Each card is one bite. A verse of the day
comes first each day, then a shuffled mix (fresh order on every app start) of
twelve card kinds:

- **Verses** — half of every cycle, drawn from a hand-curated pool and the
  full 31,098-verse corpus
- **Trivia** — multiple-choice questions with a lifetime score and ranks
- **Who said it?** — a quote from Scripture, four possible speakers
- **Continue the verse** — pick the true ending; the impostor endings are
  real endings from other verses, and the reveal tells you where they're from
- **Memory verses** — fill in a beloved verse's missing words from a word
  bank; a perfect fill earns a point, once ever per verse
- **Maps** — real Natural Earth geography, auto-zoomed per story
- **Facts** — short, verified notes on people and places
- **Prophecy · Fulfilled** — an Old Testament promise and its New Testament
  answer, side by side
- **Hymn stories** — a public-domain hymn stanza and the story behind it
- **A moment of prayer** — a quiet prompt between the busier cards
- **Names of God** — El Shaddai to Alpha and Omega, with original script
- **Biblical timeline** — where a story sits in the sweep from Abraham to
  Patmos
- **Word studies** — the Hebrew/Greek behind words like *chesed* and
  *agape*, validated against Strong's dictionaries at build time

On verse cards, **swipe left** for commentary (Matthew Henry Concise and
Complete, Jamieson-Fausset-Brown) and **swipe right** for Treasury of
Scripture Knowledge cross-references. Cards can be favorited and shared, and
a daily streak tracks how many days in a row you've opened the feed.
Everything — content, favorites, score, streaks — lives on the device; there
is no backend and nothing is ever sent anywhere.

Beyond the feed, the ☰ menu opens three more doors:

- **How are you feeling?** — pick from 16 feelings (anxious, grieving,
  grateful…) and receive hand-curated passages chosen for that state. What
  you select is never recorded, not even locally.
- **Read the chapter** — tap any verse's reference to open its full chapter,
  with the verse highlighted and ‹ › navigation across the whole canon.
- **Search** — offline word search across all 31,098 verses, straight to the
  chapter.

Questions, bugs, or corrections: **info@jesusfeed.com** (also in the app
under About).

## Content sources

Every source is public domain, with provenance recorded where vendored:

- Scripture: **World English Bible (WEB)** — all quoted text is validated
  byte-for-byte against the corpus at build time
- Maps: **Natural Earth**
- Commentary: **Matthew Henry** (Concise and Complete) and
  **Jamieson-Fausset-Brown**
- Cross-references: **Treasury of Scripture Knowledge**
- Word studies: **Strong's dictionaries** (build-side validation only —
  never shipped to the client; see `data/strongs/PROVENANCE.md`)
- Hymns: pre-1929 publications, author and year verified

## Tech

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for the offline-first
  service worker, web app manifest, and installability — the core app and
  default commentary precache; larger commentary sets and cross-references
  cache on demand
- [Vitest](https://vitest.dev/) + Testing Library — the suite includes
  build-time content validation (every quote, reference, and lemma checked
  against its source)
- Deployed as a static site to GitHub Pages via GitHub Actions

## Develop

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Deploy

Deployment is automatic: every push to `main` runs
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which
installs dependencies, runs the test suite, builds the production bundle,
and publishes `dist/` to GitHub Pages.
