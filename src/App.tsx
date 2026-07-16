import { useEffect, useState } from 'react'
import { Feed } from './components/Feed'
import { TopBar } from './components/TopBar'
import { Menu } from './components/Menu'
import { Favorites } from './components/Favorites'
import { About } from './components/About'
import { Feelings } from './components/Feelings'
import { Search } from './components/Search'
import { ChapterContext } from './components/ChapterContext'
import { ChapterSheet } from './components/ChapterSheet'
import { loadVerses, type VerseStore } from './content/verseStore'
import { dayKey } from './lib/votd'
import { updateStreak } from './lib/streak'
import { getStreakState, setStreakState, getScore } from './lib/store'

export default function App() {
  const [verses, setVerses] = useState<VerseStore | null>(null)
  const [error, setError] = useState(false)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(getScore())
  const [panel, setPanel] = useState<'favorites' | 'about' | 'feelings' | 'search' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [day, setDay] = useState(dayKey())
  const [chapter, setChapter] = useState<{ b: string; c: number; highlight?: number } | null>(null)
  const openChapter = (b: string, c: number, v?: number) => setChapter({ b, c, highlight: v })

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
    <ChapterContext.Provider value={{ openChapter }}>
      <div className="app">
        <TopBar streak={streak} score={score} onMenu={() => setMenuOpen((o) => !o)} />
        <Feed verses={verses} day={day} onScore={() => setScore(getScore())} />
        {menuOpen && <Menu onNavigate={setPanel} onClose={() => setMenuOpen(false)} />}
        {panel === 'favorites' && <Favorites onClose={() => setPanel(null)} />}
        {panel === 'about' && <About onClose={() => setPanel(null)} />}
        {panel === 'feelings' && <Feelings verses={verses} onClose={() => setPanel(null)} />}
        {panel === 'search' && <Search verses={verses} onClose={() => setPanel(null)} />}
        {chapter && verses && (
          <ChapterSheet store={verses} b={chapter.b} c={chapter.c} highlight={chapter.highlight}
            onClose={() => setChapter(null)} onOpen={(b, c) => setChapter({ b, c })} />
        )}
      </div>
    </ChapterContext.Provider>
  )
}
