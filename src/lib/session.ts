// A fresh random seed per app load. Drives the feed and feelings shuffles so
// every refresh gets a new order. Deliberately NOT persisted — the Verse of
// the Day stays date-pinned separately (lib/votd.ts), and the within-session
// no-repeat-until-pool-exhausted guarantee is unaffected.
function randomSeed(): string {
  const bytes = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export const SESSION_SEED = randomSeed()
