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
import { getSessionSeed, regenerateSessionSeed, RESUME_SESSION_MS } from './lib/session'

export default function App() {
  const [verses, setVerses] = useState<VerseStore | null>(null)
  const [error, setError] = useState(false)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(getScore())
  const [panel, setPanel] = useState<'favorites' | 'about' | 'feelings' | 'search' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [day, setDay] = useState(dayKey())
  const [sessionSeed, setSessionSeed] = useState(getSessionSeed)
  const [chapter, setChapter] = useState<{ b: string; c: number; highlight?: number } | null>(null)
  const openChapter = (b: string, c: number, v?: number) => setChapter({ b, c, highlight: v })

  useEffect(() => {
    loadVerses(import.meta.env.BASE_URL).then(setVerses).catch(() => setError(true))
  }, [])

  // Installed PWAs resume from memory without a reload. On return to the
  // foreground: refresh `day` (VOTD/streak), and after a long absence
  // (RESUME_SESSION_MS) treat it as a new session — fresh shuffle seed so the
  // feed order changes, matching a real app start. Quick app-switches keep
  // the current order.
  useEffect(() => {
    let hiddenAt: number | null = null
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }
      const today = dayKey()
      if (today !== day) setDay(today)
      if (hiddenAt !== null && Date.now() - hiddenAt >= RESUME_SESSION_MS) {
        setSessionSeed(regenerateSessionSeed())
      }
      hiddenAt = null
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [day])

  useEffect(() => {
    const s = updateStreak(getStreakState(), day)
    setStreakState(s)
    setStreak(s.count)
  }, [day])

  if (error) return <div className="splash">Couldn’t load — check your connection and refresh.</div>
  if (!verses) return <div className="splash pulse">JesusFeed</div>

  return (
    <ChapterContext.Provider value={{ openChapter }}>
      <div className="app">
        <TopBar streak={streak} score={score} onMenu={() => setMenuOpen((o) => !o)} />
        <Feed verses={verses} day={day} sessionSeed={sessionSeed} onScore={() => setScore(getScore())} />
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
