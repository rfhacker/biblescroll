import { useContext, useEffect, useState } from 'react'
import { searchVerses, normalize } from '../lib/search'
import { ChapterContext } from './ChapterContext'
import { BOOKS } from '../content/books'
import type { VerseStore } from '../content/verseStore'

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function Snippet({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>
  const re = new RegExp(`\\b(${terms.map(escapeRe).join('|')})`, 'ig')
  const parts = text.split(re)
  return (
    <>{parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p))}</>
  )
}

export function Search({ verses, onClose }: { verses: VerseStore; onClose: () => void }) {
  const { openChapter } = useContext(ChapterContext)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ index: number; score: number }[]>([])

  useEffect(() => {
    if (normalize(query).length < 3) { setResults([]); return }
    const t = setTimeout(() => setResults(searchVerses(verses, query)), 250)
    return () => clearTimeout(t)
  }, [query, verses])

  const terms = normalize(query).split(' ').filter((t) => t.length >= 2)
  const short = normalize(query).length < 3

  return (
    <div className="panel">
      <header className="panel-head">
        <h1>Search</h1>
        <button aria-label="Close" onClick={onClose}>✕</button>
      </header>
      <input type="search" role="searchbox" className="search-field" autoFocus
        placeholder="eagles wings…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {short && <p className="empty">Type a few letters and the Word starts looking.</p>}
      {!short && results.length === 0 && (
        <p className="empty">No verses match yet — try fewer or simpler words.</p>
      )}
      {results.length > 0 && (
        <>
          <p className="search-count">{results.length === 50 ? '50+' : results.length} verse{results.length === 1 ? '' : 's'}</p>
          {results.map(({ index }) => {
            const [b, c, v, text] = verses.list[index]
            return (
              <button key={`${b}${c}:${v}`} className="search-row"
                onClick={() => openChapter(b, c, v)}>
                <span className="search-ref">{BOOKS[b] ?? b} {c}:{v}</span>
                <span className="search-snippet"><Snippet text={text} terms={terms} /></span>
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}
