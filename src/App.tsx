import { useEffect, useState } from 'react'
import { Feed } from './components/Feed'
import { TopBar } from './components/TopBar'
import { loadVerses, type VerseStore } from './content/verseStore'
import { dayKey } from './lib/votd'
import { updateStreak } from './lib/streak'
import { getStreakState, setStreakState, getScore } from './lib/store'

export default function App() {
  const [verses, setVerses] = useState<VerseStore | null>(null)
  const [error, setError] = useState(false)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(getScore())
  const [panel, setPanel] = useState<'favorites' | 'about' | null>(null)

  useEffect(() => {
    const s = updateStreak(getStreakState(), dayKey())
    setStreakState(s)
    setStreak(s.count)
    loadVerses(import.meta.env.BASE_URL).then(setVerses).catch(() => setError(true))
  }, [])

  if (error) return <div className="splash">Couldn’t load — check your connection and refresh.</div>
  if (!verses) return <div className="splash pulse">BibleScroll</div>

  return (
    <div className="app">
      <TopBar streak={streak} score={score}
        onFavorites={() => setPanel('favorites')} onAbout={() => setPanel('about')} />
      <Feed verses={verses} onScore={() => setScore(getScore())} />
      {/* panels mount here in Task 16 */}
    </div>
  )
}
