import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CommentaryPane } from './CommentaryPane'
import { prefetchCommentary } from '../../lib/commentary'
import { getCommentarySource } from '../../lib/store'

export function VerseSlide({ book, c, v, children }: {
  book: string; c: number; v: number; children: ReactNode
}) {
  const [engaged, setEngaged] = useState(false)
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    prefetchCommentary(getCommentarySource(), book)
  }, [book])

  function onScroll() {
    if (!engaged && (track.current?.scrollLeft ?? 0) > 0) {
      setEngaged(true)
      window.dispatchEvent(new CustomEvent('bs:slide-engaged'))
    }
  }

  function openPane() {
    if (!engaged) window.dispatchEvent(new CustomEvent('bs:slide-engaged'))
    setEngaged(true)
    const el = track.current
    if (el) el.scrollTo({ left: el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="vslide" ref={track} onScroll={onScroll}>
      <div className="vpane vpane-card">
        {children}
        <button className="commentary-chip" onClick={openPane}>Commentary ›</button>
      </div>
      <div className="vpane">
        {engaged ? <CommentaryPane book={book} c={c} v={v} active={engaged} /> : null}
      </div>
    </div>
  )
}
