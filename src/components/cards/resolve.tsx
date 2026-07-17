import type { ReactNode } from 'react'
import type { FeedItem } from '../../lib/feed'
import type { VerseStore } from '../../content/verseStore'
import { refLabel, refText } from '../../content/verseStore'
import { VerseCard } from './VerseCard'
import { VerseSlide } from './VerseSlide'
import { FactCard } from './FactCard'
import { TriviaCard } from './TriviaCard'
import { MapCard } from './MapCard'
import { MemoryCard } from './MemoryCard'
import { BOOKS } from '../../content/books'
import curated from '../../content/curated.json'
import trivia from '../../content/trivia.json'
import facts from '../../content/facts.json'
import maps from '../../content/maps.json'
import type { CuratedRef, TriviaItem, FactItem, MapStory } from '../../content/types'

export const POOL_SIZES = {
  curated: (curated as CuratedRef[]).length,
  corpus: 0, // placeholder — Feed replaces this with the real verses.json length
  trivia: (trivia as TriviaItem[]).length,
  fact: (facts as FactItem[]).length,
  map: (maps as MapStory[]).length,
}

// A memory-card puzzle renders its full curated text plus up to 10 word-bank
// chips inside a fixed-height (100dvh) card. Long multi-verse ranges (e.g.
// Psalms 23:1–6 at 595 chars) overflow the card before layout can react, so
// the memory pool is restricted to curated refs whose resolved text is short
// enough to fit. Verse text only exists once the runtime VerseStore has
// loaded, so this is computed lazily and cached against the store instance
// (a stable singleton after load) rather than at module load time.
export const MEMORY_MAX_CHARS = 280
let memoryPoolCache: { store: VerseStore; pool: CuratedRef[] } | null = null

export function memoryPool(verses: VerseStore): CuratedRef[] {
  if (memoryPoolCache && memoryPoolCache.store === verses) return memoryPoolCache.pool
  const pool = (curated as CuratedRef[]).filter((ref) => refText(verses, ref).length <= MEMORY_MAX_CHARS)
  memoryPoolCache = { store: verses, pool }
  return pool
}

export function resolveCard(item: FeedItem, verses: VerseStore, theme: number, onScore: () => void): ReactNode {
  switch (item.kind) {
    case 'verse': {
      if (item.pool === 'curated') {
        const ref = (curated as CuratedRef[])[item.poolIndex]
        return (
          <VerseSlide book={ref[0]} c={ref[1]} v={ref[2]} verses={verses}>
            <VerseCard text={refText(verses, ref)} label={refLabel(ref)} votd={item.votd} theme={theme} />
          </VerseSlide>
        )
      }
      const [b, c, v, text] = verses.list[item.poolIndex]
      return (
        <VerseSlide book={b} c={c} v={v} verses={verses}>
          <VerseCard text={text} label={`${BOOKS[b] ?? b} ${c}:${v}`} theme={theme} />
        </VerseSlide>
      )
    }
    case 'trivia':
      return <TriviaCard item={(trivia as TriviaItem[])[item.poolIndex]} theme={theme} onScore={onScore} />
    case 'fact':
      return <FactCard fact={(facts as FactItem[])[item.poolIndex]} theme={theme} />
    case 'map':
      return <MapCard story={(maps as MapStory[])[item.poolIndex]} theme={theme} />
    case 'memory': {
      const ref = memoryPool(verses)[item.poolIndex]
      return (
        <MemoryCard text={refText(verses, ref)} label={refLabel(ref)}
          seed={`mem:${item.poolIndex}`} theme={theme} onScore={onScore} />
      )
    }
  }
}
