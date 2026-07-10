import { useRef, useState } from 'react'
import { cardAt } from '../lib/feed'
import { dayKey, votdIndex } from '../lib/votd'
import { getInstallSeed } from '../lib/store'
import type { VerseStore } from '../content/verseStore'
import { resolveCard, POOL_SIZES } from './cards/resolve'

const WINDOW = 3

export function Feed({ verses, onScore }: { verses: VerseStore; onScore: () => void }) {
  const [current, setCurrent] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const day = dayKey()
  const seed = `${getInstallSeed()}:${day}`
  const sizes = { ...POOL_SIZES, corpus: verses.list.length }
  const vi = votdIndex(day, sizes.curated)
  const total = Math.max(current + 15, 40)

  function onScroll() {
    const el = ref.current
    if (!el || el.clientHeight === 0) return
    const i = Math.round(el.scrollTop / el.clientHeight)
    if (i !== current) setCurrent(i)
  }

  return (
    <div className="feed" ref={ref} onScroll={onScroll}>
      {Array.from({ length: total }, (_, i) => (
        <section className="slot" key={i}>
          {Math.abs(i - current) <= WINDOW
            ? resolveCard(cardAt(i, seed, sizes, vi), verses, i % 5, onScore)
            : null}
        </section>
      ))}
    </div>
  )
}
