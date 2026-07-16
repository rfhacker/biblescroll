import { scoreTitle } from '../lib/streak'

export function TopBar({ streak, score, onMenu }: {
  streak: number; score: number; onMenu: () => void
}) {
  return (
    <header className="topbar">
      <span className="brand">JesusFeed</span>
      <span className="stats">
        <span title="Daily streak">🔥 {streak}</span>
        <span title={`Trivia score — ${scoreTitle(score)}`}>✓ {score}</span>
      </span>
      <span className="topbar-actions">
        <button aria-label="Menu" onClick={onMenu}>☰</button>
      </span>
    </header>
  )
}
