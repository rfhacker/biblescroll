import { useEffect, useState } from 'react'
import { Feed } from './components/Feed'
import { TopBar } from './components/TopBar'
import { Favorites } from './components/Favorites'
import { About } from './components/About'
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
  const [day, setDay] = useState(dayKey())

  useEffect(() => {
    loadVerses(import.meta.env.BASE_URL).then(setVerses).catch(() => setError(true))
  }, [])

  // Keep `day` current for an installed PWA resumed across midnight without a
  // full reload — the feed's seed/VOTD and the streak both key off it.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        const today = dayKey()
        if (today !== day) setDay(today)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [day])

  useEffect(() => {
    const s = updateStreak(getStreakState(), day)
    setStreakState(s)
    setStreak(s.count)
  }, [day])

  if (error) return <div className="splash">Couldn’t load — check your connection and refresh.</div>
  if (!verses) return <div className="splash pulse">BibleScroll</div>

  return (
    <div className="app">
      <TopBar streak={streak} score={score}
        onFavorites={() => setPanel('favorites')} onAbout={() => setPanel('about')} />
      <Feed verses={verses} day={day} onScore={() => setScore(getScore())} />
      {panel === 'favorites' && <Favorites onClose={() => setPanel(null)} />}
      {panel === 'about' && <About onClose={() => setPanel(null)} />}
    </div>
  )
}
