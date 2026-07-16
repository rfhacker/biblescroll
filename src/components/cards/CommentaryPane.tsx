import { useEffect, useState } from 'react'
import { BOOKS } from '../../content/books'
import { RefButton } from './RefButton'
import {
  loadCommentary, commentaryFor, SOURCE_NAMES,
  type CommentaryEntry, type CommentarySource,
} from '../../lib/commentary'
import { getCommentarySource, setCommentarySource } from '../../lib/store'

type Status = 'loading' | 'ready' | 'failed'

const SOURCES: CommentarySource[] = ['mhcc', 'mhc', 'jfb']
const TOGGLE_LABELS: Record<CommentarySource, string> = { mhcc: 'Concise', mhc: 'Full', jfb: 'JFB' }

export function CommentaryPane({ book, c, v, active }: {
  book: string; c: number; v: number; active: boolean
}) {
  const [source, setSource] = useState<CommentarySource>(getCommentarySource)
  const [status, setStatus] = useState<Status>('loading')
  const [entries, setEntries] = useState<CommentaryEntry[] | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!active) return
    let dead = false
    setStatus('loading')
    loadCommentary(source, book).then(
      (es) => { if (!dead) { setEntries(es); setStatus('ready') } },
      () => { if (!dead) setStatus('failed') },
    )
    return () => { dead = true }
  }, [active, source, book, attempt])

  const pick = (s: CommentarySource) => { setSource(s); setCommentarySource(s) }
  if (!active) return null

  const entry = status === 'ready' && entries ? commentaryFor(entries, c, v) : null
  const bookName = BOOKS[book] ?? book
  const range = entry ? (entry[2] > entry[1] ? `${entry[1]}–${entry[2]}` : `${entry[1]}`) : `${v}`

  return (
    <div className="commentary-pane">
      <div className="kicker">Bible Commentary</div>
      <div className="commentary-toggle" role="group" aria-label="Commentary source">
        {SOURCES.map((s) => (
          <button
            key={s}
            className={source === s ? 'chip chip-on' : 'chip'}
            aria-pressed={source === s}
            onClick={() => pick(s)}
          >
            {TOGGLE_LABELS[s]}
          </button>
        ))}
      </div>
      {status === 'loading' && <p className="commentary-dim">Opening the commentary…</p>}
      {status === 'failed' && (
        <p className="commentary-dim">
          {source !== 'mhcc'
            ? `${SOURCE_NAMES[source]} for this book isn't downloaded yet — ${SOURCE_NAMES.mhcc} is always available offline.`
            : "Commentary couldn’t load."}
          {source === 'mhcc' && (
            <button className="commentary-switch" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
          )}
          {source !== 'mhcc' && (
            <button className="commentary-switch" onClick={() => pick('mhcc')}>Read {SOURCE_NAMES.mhcc}</button>
          )}
        </p>
      )}
      {status === 'ready' && !entry && (
        <p className="commentary-dim">
          {source !== 'mhcc'
            ? `${SOURCE_NAMES[source]} doesn't comment on this verse —`
            : "This verse doesn’t have a note here."}
          {source !== 'mhcc' && (
            <button className="commentary-switch" onClick={() => pick('mhcc')}>read {SOURCE_NAMES.mhcc}</button>
          )}
        </p>
      )}
      {entry && (
        <>
          <h3 className="commentary-head">{SOURCE_NAMES[source]} · {bookName} {c}:{range}</h3>
          <div className="commentary-body">
            {entry[3].split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <RefButton refString={`${bookName} ${c}:${v}`} />
        </>
      )}
    </div>
  )
}
