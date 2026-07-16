# JesusFeed

A Christian alternative to doom-scrolling: an endless, snap-scrolling feed of
Bible verses, trivia, maps, and facts — built for the same swipe-and-scroll
habit as social media, minus the social media. No accounts, no ads, no
tracking. Installs as an offline-first PWA so it works on a plane, in a
basement, or anywhere else the signal doesn't reach.

**Live:** https://jesusfeed.com/ (the old rfhacker.github.io/biblescroll URL redirects)

## What it is

Open the app and start scrolling. Each card is one bite: a verse of the day
first, then a shuffled mix of Scripture, trivia questions, biblical maps, and
short facts about people and places in the Bible. Cards can be favorited and
shared, trivia keeps score, and a daily streak tracks how many days in a row
you've opened the feed. Everything — content, favorites, streaks — lives on
the device; there is no backend and nothing is ever sent anywhere.

Beyond the feed, the ☰ menu opens three more doors:

- **How are you feeling?** — pick from 16 feelings (anxious, grieving,
  grateful…) and receive hand-curated passages chosen for that state. What
  you select is never recorded, not even locally.
- **Read the chapter** — tap any verse's reference to open its full chapter,
  with the verse highlighted and ‹ › navigation across the whole canon.
- **Search** — offline word search across all 31,098 verses, straight to the
  chapter.

## Tech

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for the offline-first
  service worker, web app manifest, and installability
- [Vitest](https://vitest.dev/) + Testing Library for unit/component tests
- Verse text is the **World English Bible (WEB)**, a public-domain
  translation with no copyright restrictions
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
