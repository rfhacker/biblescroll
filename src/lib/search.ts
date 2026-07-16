import type { VerseStore } from '../content/verseStore'

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’ʼ']/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Per-verse word arrays are expensive to recompute (normalize + split over
// ~31k verses). Cache them per store on first search so repeat searches
// only pay for scoring, not re-tokenizing the whole corpus.
const wordCache = new WeakMap<VerseStore, string[][]>()

function wordsFor(store: VerseStore): string[][] {
  let words = wordCache.get(store)
  if (!words) {
    words = store.list.map((t) => normalize(t[3]).split(' '))
    wordCache.set(store, words)
  }
  return words
}

export function searchVerses(
  store: VerseStore, query: string, limit = 50,
): { index: number; score: number }[] {
  const terms = normalize(query).split(' ').filter((t) => t.length >= 2)
  if (terms.length === 0) return []
  const allWords = wordsFor(store)
  const out: { index: number; score: number }[] = []
  for (let i = 0; i < store.list.length; i++) {
    const words = allWords[i]
    let score = 0
    let ok = true
    for (const t of terms) {
      let best = 0
      for (const w of words) {
        if (w === t) { best = 2; break }
        if (best < 1 && w.startsWith(t)) best = 1
      }
      if (best === 0) { ok = false; break }
      score += best
    }
    if (ok) out.push({ index: i, score: score * 1000 - words.length })
  }
  out.sort((a, b) => b.score - a.score) // stable → canonical order within ties
  return out.slice(0, limit)
}
