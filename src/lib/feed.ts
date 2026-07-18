import { shuffledRange } from './rng'

export interface PoolSizes { curated: number; corpus: number; trivia: number; fact: number; map: number; memory: number; whosaid: number; continue: number; prayer: number; names: number; prophecy: number; hymn: number; timeline: number; word: number }
export interface FeedItem {
  kind: 'verse' | 'trivia' | 'fact' | 'map' | 'memory' | 'whosaid' | 'continue' | 'prayer' | 'names' | 'prophecy' | 'hymn' | 'timeline' | 'word'
  pool: 'curated' | 'corpus' | 'trivia' | 'fact' | 'map' | 'memory' | 'whosaid' | 'continue' | 'prayer' | 'names' | 'prophecy' | 'hymn' | 'timeline' | 'word'
  poolIndex: number
  votd?: boolean
}

const CYCLE = [
  'verse', 'fact', 'verse', 'trivia', 'verse', 'map', 'verse', 'whosaid',
  'verse', 'prophecy', 'verse', 'fact', 'verse', 'trivia', 'verse', 'memory',
  'verse', 'continue', 'verse', 'hymn', 'verse', 'prayer', 'verse', 'names',
  'verse', 'timeline', 'verse', 'word',
] as const
const PER_CYCLE = { verse: 14, fact: 2, trivia: 2, map: 1, memory: 1, whosaid: 1, continue: 1, prayer: 1, names: 1, prophecy: 1, hymn: 1, timeline: 1, word: 1 } as const

// Card background theme. The per-cycle shift keeps every slot's theme
// drifting across cycles regardless of CYCLE.length: with plain i % 5, any
// cycle length divisible by 5 pins each non-verse kind to one theme forever
// (that shipped once at 20 slots).
export function themeFor(i: number): number {
  return (i + Math.floor(i / CYCLE.length)) % 5
}

function poolIndexFor(pool: string, occ: number, size: number, seed: string): number {
  const epoch = Math.floor(occ / size)
  return shuffledRange(size, `${seed}:${pool}:${epoch}`)[occ % size]
}

export function cardAt(i: number, seed: string, sizes: PoolSizes, votdIdx: number): FeedItem {
  if (i === 0) return { kind: 'verse', pool: 'curated', poolIndex: votdIdx % sizes.curated, votd: true }
  const j = i - 1
  const pos = j % CYCLE.length
  const fullCycles = Math.floor(j / CYCLE.length)
  const kind = CYCLE[pos]
  let inPartial = 0
  for (let p = 0; p < pos; p++) if (CYCLE[p] === kind) inPartial++
  const k = fullCycles * PER_CYCLE[kind] + inPartial // 0-based occurrence of this kind

  if (kind === 'verse') {
    const slot = k % 10
    if (slot < 7) {
      const occ = Math.floor(k / 10) * 7 + slot
      return { kind, pool: 'curated', poolIndex: poolIndexFor('curated', occ, sizes.curated, seed) }
    }
    const occ = Math.floor(k / 10) * 3 + (slot - 7)
    return { kind, pool: 'corpus', poolIndex: poolIndexFor('corpus', occ, sizes.corpus, seed) }
  }
  return { kind, pool: kind, poolIndex: poolIndexFor(kind, k, sizes[kind], seed) }
}
