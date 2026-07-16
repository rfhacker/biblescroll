import { useEffect, useRef, useState } from 'react'
import { cardAt } from '../lib/feed'
import { votdIndex } from '../lib/votd'
import { getHasScrolled, setHasScrolled } from '../lib/store'
import type { VerseStore } from '../content/verseStore'
import { resolveCard, POOL_SIZES } from './cards/resolve'

const WINDOW = 3

export function Feed({ verses, day, sessionSeed, onScore }: { verses: VerseStore; day: string; sessionSeed: string; onScore: () => void }) {
  const [current, setCurrent] = useState(0)
  const [showHint, setShowHint] = useState(() => !getHasScrolled())
  const ref = useRef<HTMLDivElement>(null)
  const seed = `${sessionSeed}:${day}`
  const sizes = { ...POOL_SIZES, corpus: verses.list.length }
  const vi = votdIndex(day, sizes.curated)
  const total = Math.max(current + 15, 40)

  useEffect(() => {
    function onSlideEngaged() {
      if (showHint) {
        setShowHint(false)
        setHasScrolled()
      }
    }
    window.addEventListener('bs:slide-engaged', onSlideEngaged)
    return () => window.removeEventListener('bs:slide-engaged', onSlideEngaged)
  }, [showHint])

  // A new session seed means a fresh feed — return to the top like a real
  // app start rather than remapping cards under the user's thumb.
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = 0
    setCurrent(0)
  }, [sessionSeed])

  function onScroll() {
    const el = ref.current
    if (!el || el.clientHeight === 0) return
    const i = Math.round(el.scrollTop / el.clientHeight)
    if (i !== current) setCurrent(i)
    if (showHint && el.scrollTop > 0) {
      setShowHint(false)
      setHasScrolled()
    }
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
      {showHint && current === 0 && (
        <div className="scroll-hint" aria-hidden="true">
          <span className="scroll-hint-arrow">↑</span>
          Swipe up for the next card
        </div>
      )}
    </div>
  )
}
