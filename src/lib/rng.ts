export function hashString(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items]
  const rand = mulberry32(hashString(seed))
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const rangeCache = new Map<string, number[]>()
export function shuffledRange(n: number, seed: string): number[] {
  const key = `${n}:${seed}`
  let r = rangeCache.get(key)
  if (!r) {
    r = seededShuffle(Array.from({ length: n }, (_, i) => i), seed)
    rangeCache.set(key, r)
    if (rangeCache.size > 40) rangeCache.delete(rangeCache.keys().next().value!)
  }
  return r
}
