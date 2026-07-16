import { useContext, useEffect, useState } from 'react'
import { ChapterContext } from '../ChapterContext'
import { BOOKS } from '../../content/books'
import { refText, refLabel, type VerseStore } from '../../content/verseStore'
import { loadCrossRefs, crossRefsFor, type CrossRefEntry, type Ref } from '../../lib/crossrefs'
import type { CuratedRef } from '../../content/types'

type Status = 'loading' | 'ready' | 'failed'
const CAP = 15

export function CrossRefsPane({ book, c, v, verses, active }: {
  book: string; c: number; v: number; verses: VerseStore; active: boolean
}) {
  const { openChapter } = useContext(ChapterContext)
  const [status, setStatus] = useState<Status>('loading')
  const [entries, setEntries] = useState<CrossRefEntry[] | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!active) return
    let dead = false
    setStatus('loading')
    loadCrossRefs(book).then(
      (es) => { if (!dead) { setEntries(es); setStatus('ready') } },
      () => { if (!dead) setStatus('failed') },
    )
    return () => { dead = true }
  }, [active, book, attempt])

  if (!active) return null
  const refs = status === 'ready' && entries ? crossRefsFor(entries, c, v) : null
  const shown = refs ? (showAll ? refs : refs.slice(0, CAP)) : []

  return (
    <div className="commentary-pane xref-pane">
      <div className="kicker">Cross References</div>
      <h3 className="commentary-head">Scripture on {BOOKS[book] ?? book} {c}:{v}</h3>
      {status === 'loading' && <p className="commentary-dim">Gathering the echoes…</p>}
      {status === 'failed' && (
        <p className="commentary-dim">
          References for this book aren't downloaded yet.
          <button className="commentary-switch" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </p>
      )}
      {status === 'ready' && !refs && (
        <p className="commentary-dim">No cross-references recorded for this verse.</p>
      )}
      {shown.map((r: Ref, i) => (
        <div className="xref-item" key={i}>
          <button className="verse-ref verse-ref-btn"
            onClick={() => openChapter(r[0], r[1], r[2])}>{refLabel(r as CuratedRef)}</button>
          <p className="xref-text">{refText(verses, r as CuratedRef)}</p>
        </div>
      ))}
      {refs && refs.length > CAP && !showAll && (
        <button className="feel-go xref-more" onClick={() => setShowAll(true)}>
          Show all ({refs.length})
        </button>
      )}
    </div>
  )
}
