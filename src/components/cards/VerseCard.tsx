import { useState, useContext } from 'react'
import { CardShell } from './CardShell'
import { ChapterContext } from '../ChapterContext'
import { parseRefLabel } from '../../content/verseStore'

export function VerseCard({ text, label, votd, theme }: {
  text: string; label: string; votd?: boolean; theme: number
}) {
  const [expanded, setExpanded] = useState(false)
  const { openChapter } = useContext(ChapterContext)
  const long = text.length > 380
  const shown = long && !expanded
    ? `${text.slice(0, 340).replace(/\s+\S*$/, '').trimEnd()}…`
    : text
  return (
    <CardShell theme={theme} shareText={`"${text}" — ${label} (WEB)`}
      fav={{ kind: 'verse', id: label, title: label, body: text }}>
      {votd && <div className="votd-badge">✦ Verse of the Day</div>}
      <p className="verse-text">{shown}</p>
      {long && !expanded && (
        <button className="read-more" onClick={() => setExpanded(true)}>Read more</button>
      )}
      <button className="verse-ref verse-ref-btn" onClick={() => {
        const r = parseRefLabel(label)
        if (r) openChapter(r.b, r.c, r.v)
      }}>{label} — WEB ›</button>
    </CardShell>
  )
}
