import { useState } from 'react'
import { getFavorites, toggleFavorite } from '../lib/store'
import type { CardKind } from '../content/types'

const GROUPS: [CardKind, string][] = [
  ['verse', 'Verses'], ['trivia', 'Trivia'], ['fact', 'Facts'], ['map', 'Maps'],
]

export function Favorites({ onClose }: { onClose: () => void }) {
  const [favs, setFavs] = useState(getFavorites)
  return (
    <div className="panel">
      <header className="panel-head">
        <h1>Saved</h1>
        <button aria-label="Close" onClick={onClose}>✕</button>
      </header>
      {favs.length === 0 && <p className="empty">Nothing saved yet — tap ♡ on any card.</p>}
      {GROUPS.map(([kind, label]) => {
        const group = favs.filter((f) => f.kind === kind)
        if (group.length === 0) return null
        return (
          <section key={kind}>
            <h2>{label}</h2>
            {group.map((f) => (
              <div className="fav" key={`${f.kind}:${f.id}`}>
                <div>
                  <div className="fav-title">{f.title}</div>
                  <div className="fav-body">{f.body}</div>
                </div>
                <button aria-label={`Remove ${f.title}`}
                  onClick={() => { toggleFavorite(f); setFavs(getFavorites()) }}>♥</button>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
