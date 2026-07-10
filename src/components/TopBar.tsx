import { scoreTitle } from '../lib/streak'

export function TopBar({ streak, score, onFavorites, onAbout }: {
  streak: number; score: number; onFavorites: () => void; onAbout: () => void
}) {
  return (
    <header className="topbar">
      <span className="brand">BibleScroll</span>
      <span className="stats">
        <span title="Daily streak">🔥 {streak}</span>
        <span title={`Trivia score — ${scoreTitle(score)}`}>✓ {score}</span>
      </span>
      <span className="topbar-actions">
        <button aria-label="Favorites" onClick={onFavorites}>♥</button>
        <button aria-label="About" onClick={onAbout}>ⓘ</button>
      </span>
    </header>
  )
}
