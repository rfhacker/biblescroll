import type { VerseStore } from '../content/verseStore'

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function searchVerses(
  store: VerseStore, query: string, limit = 50,
): { index: number; score: number }[] {
  const terms = normalize(query).split(' ').filter((t) => t.length >= 2)
  if (terms.length === 0) return []
  const out: { index: number; score: number }[] = []
  for (let i = 0; i < store.list.length; i++) {
    const words = normalize(store.list[i][3]).split(' ')
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
