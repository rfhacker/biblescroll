import { useEffect, useRef } from 'react'
import { BOOKS } from '../content/books'
import {
  chapterOf, prevChapter, nextChapter, type VerseStore,
} from '../content/verseStore'

export function ChapterSheet({ store, b, c, highlight, onClose, onOpen }: {
  store: VerseStore; b: string; c: number; highlight?: number
  onClose: () => void; onOpen: (b: string, c: number) => void
}) {
  const verses = chapterOf(store, b, c)
  const prev = prevChapter(store, b, c)
  const next = nextChapter(store, b, c)
  const hlRef = useRef<HTMLSpanElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hlRef.current) {
      hlRef.current.scrollIntoView({ block: 'center' })
    } else if (bodyRef.current) {
      bodyRef.current.scrollTop = 0
    }
  }, [b, c, highlight])

  return (
    <div className="chapter-scrim" onClick={onClose}>
      <section className="chapter-sheet" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-label={`${BOOKS[b] ?? b} chapter ${c}`}>
        <header className="chapter-head">
          <h2>{BOOKS[b] ?? b} {c}</h2>
          <button aria-label="Close" onClick={onClose}>✕</button>
        </header>
        <div className="chapter-body" ref={bodyRef}>
          <p className="chapter-text">
            {verses.map(({ v, text }) => (
              <span key={v} ref={v === highlight ? hlRef : undefined}
                className={v === highlight ? 'ch-verse ch-highlight' : 'ch-verse'}>
                <sup className="ch-num">{v}</sup> {text}{' '}
              </span>
            ))}
          </p>
        </div>
        <footer className="chapter-nav">
          {prev ? (
            <button aria-label="Previous chapter" onClick={() => onOpen(prev.b, prev.c)}>
              ‹ {BOOKS[prev.b] ?? prev.b} {prev.c}
            </button>
          ) : <span />}
          {next ? (
            <button aria-label="Next chapter" onClick={() => onOpen(next.b, next.c)}>
              {BOOKS[next.b] ?? next.b} {next.c} ›
            </button>
          ) : <span />}
        </footer>
      </section>
    </div>
  )
}
