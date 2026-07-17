import { useState, type ReactNode } from 'react'
import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import { addScore, getAnsweredPick, setAnsweredPick } from '../../lib/store'
import type { Favorite } from '../../content/types'

export interface QuizSpec { id: string; choices: string[]; answer: number; why: string; ref: string }

export function QuizCard({ quiz, kicker, prompt, fav, shareText, theme, onScore }: {
  quiz: QuizSpec; kicker: string; prompt: ReactNode; fav: Favorite
  shareText: string; theme: number; onScore: () => void
}) {
  const [picked, setPicked] = useState<number | null>(() => getAnsweredPick(quiz.id))

  function pick(i: number) {
    if (picked !== null) return
    setPicked(i)
    // Only persist correct picks: a wrong answer locks this mount (so no
    // double-answering / farming right now) but the question comes back
    // fresh next time, keeping the lifetime score ceiling reachable.
    if (i === quiz.answer) {
      setAnsweredPick(quiz.id, i)
      addScore(1)
      onScore()
    }
  }

  return (
    <CardShell theme={theme} shareText={shareText} fav={fav}>
      <div className="kicker">{kicker}</div>
      {prompt}
      <div className="choices">
        {quiz.choices.map((c, i) => {
          let cls = 'choice'
          let label = c
          if (picked !== null) {
            if (i === quiz.answer) { cls += ' correct'; label = `✓ ${c}` }
            else if (i === picked) { cls += ' wrong'; label = `✗ ${c}` }
            else cls += ' dim'
          }
          return <button key={i} className={cls} onClick={() => pick(i)}>{label}</button>
        })}
      </div>
      {picked !== null && (
        <p className="trivia-why">
          {picked === quiz.answer ? '✓ ' : ''}{quiz.why} <RefButton refString={quiz.ref} />
        </p>
      )}
    </CardShell>
  )
}
