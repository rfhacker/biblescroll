// Session seeds drive the feed and feelings shuffles so every app start gets
// a fresh order. Not persisted (no tracking). The Verse of the Day stays
// date-pinned separately (lib/votd.ts).
//
// For installed PWAs, "starting the app" often RESUMES the page from memory
// without re-running this module — so App regenerates the seed via
// regenerateSessionSeed() when the app returns to the foreground after
// RESUME_SESSION_MS away (a quick app-switch keeps the current order).
export const RESUME_SESSION_MS = 30 * 60 * 1000

export function randomSeed(): string {
  const bytes = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

let seed = randomSeed()

export function getSessionSeed(): string {
  return seed
}

export function regenerateSessionSeed(): string {
  seed = randomSeed()
  return seed
}
