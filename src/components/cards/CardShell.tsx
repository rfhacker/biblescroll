import { useState, type ReactNode } from 'react'
import type { Favorite } from '../../content/types'
import { toggleFavorite, isFavorite } from '../../lib/store'

export function CardShell({ fav, shareText, theme, children }: {
  fav: Favorite; shareText: string; theme: number; children: ReactNode
}) {
  const [saved, setSaved] = useState(() => isFavorite(fav.kind, fav.id))
  const [copied, setCopied] = useState(false)

  async function share() {
    const data = { text: shareText, url: new URL(import.meta.env.BASE_URL, location.origin).href }
    try {
      if (navigator.share) await navigator.share(data)
      else {
        await navigator.clipboard.writeText(`${shareText}\n${data.url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }
    } catch { /* user cancelled */ }
  }

  return (
    <article className={`card theme-${theme}`}>
      <div className="card-body">{children}</div>
      <footer className="card-actions">
        <button aria-label={saved ? 'Unsave' : 'Save'} className={saved ? 'act saved' : 'act'}
          onClick={() => setSaved(toggleFavorite(fav))}>
          {saved ? '♥' : '♡'}
        </button>
        <button aria-label="Share" className="act" onClick={share}>
          {copied ? 'Copied!' : '↗'}
        </button>
      </footer>
    </article>
  )
}
