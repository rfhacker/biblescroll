import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { CommentaryPane } from './CommentaryPane'
import { CrossRefsPane } from './CrossRefsPane'
import { prefetchCommentary } from '../../lib/commentary'
import { prefetchCrossRefs } from '../../lib/crossrefs'
import { getCommentarySource } from '../../lib/store'
import type { VerseStore } from '../../content/verseStore'

export function VerseSlide({ book, c, v, verses, children }: {
  book: string; c: number; v: number; verses: VerseStore; children: ReactNode
}) {
  const [engagedLeft, setEngagedLeft] = useState(false)
  const [engagedRight, setEngagedRight] = useState(false)
  const track = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = track.current
    if (el) el.scrollLeft = el.clientWidth // start centered on the card pane
  }, [])

  useEffect(() => {
    prefetchCommentary(getCommentarySource(), book)
    prefetchCrossRefs(book)
  }, [book])

  function engage(side: 'left' | 'right') {
    if (side === 'left' && !engagedLeft) setEngagedLeft(true)
    if (side === 'right' && !engagedRight) setEngagedRight(true)
    window.dispatchEvent(new CustomEvent('bs:slide-engaged'))
  }

  function onScroll() {
    const el = track.current
    if (!el || el.clientWidth === 0) return
    const w = el.clientWidth
    if (!engagedLeft && el.scrollLeft < w - 2) engage('left')
    if (!engagedRight && el.scrollLeft > w + 2) engage('right')
  }

  function goTo(paneIndex: 0 | 2) {
    engage(paneIndex === 0 ? 'left' : 'right')
    const el = track.current
    if (el) el.scrollTo({ left: paneIndex * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="vslide" ref={track} onScroll={onScroll}>
      <div className="vpane">
        {engagedLeft ? <CrossRefsPane book={book} c={c} v={v} verses={verses} active={engagedLeft} /> : null}
      </div>
      <div className="vpane vpane-card">
        {children}
        <div className="slide-chips">
          <button className="commentary-chip" onClick={() => goTo(0)}>‹ References</button>
          <button className="commentary-chip" onClick={() => goTo(2)}>Commentary ›</button>
        </div>
      </div>
      <div className="vpane">
        {engagedRight ? <CommentaryPane book={book} c={c} v={v} active={engagedRight} /> : null}
      </div>
    </div>
  )
}
