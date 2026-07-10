import { useState } from 'react'
import { CardShell } from './CardShell'

export function VerseCard({ text, label, votd, theme }: {
  text: string; label: string; votd?: boolean; theme: number
}) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > 380
  const shown = long && !expanded ? `${text.slice(0, 340).trimEnd()}…` : text
  return (
    <CardShell theme={theme} shareText={`"${text}" — ${label} (WEB)`}
      fav={{ kind: 'verse', id: label, title: label, body: text }}>
      {votd && <div className="votd-badge">✦ Verse of the Day</div>}
      <p className="verse-text">{shown}</p>
      {long && !expanded && (
        <button className="read-more" onClick={() => setExpanded(true)}>Read more</button>
      )}
      <p className="verse-ref">{label} — WEB</p>
    </CardShell>
  )
}
