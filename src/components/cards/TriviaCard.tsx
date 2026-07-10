import { useState } from 'react'
import { CardShell } from './CardShell'
import { addScore, getAnsweredPick, setAnsweredPick } from '../../lib/store'
import type { TriviaItem } from '../../content/types'

export function TriviaCard({ item, theme, onScore }: {
  item: TriviaItem; theme: number; onScore: () => void
}) {
  const [picked, setPicked] = useState<number | null>(() => getAnsweredPick(item.id))

  function pick(i: number) {
    if (picked !== null) return
    setPicked(i)
    // Only persist correct picks: a wrong answer locks this mount (so no
    // double-answering / farming right now) but the question comes back
    // fresh next time, keeping the lifetime score ceiling reachable.
    if (i === item.answer) {
      setAnsweredPick(item.id, i)
      addScore(1)
      onScore()
    }
  }

  return (
    <CardShell theme={theme} shareText={`${item.q} (${item.ref})`}
      fav={{ kind: 'trivia', id: item.id, title: item.q, body: `${item.why} (${item.ref})` }}>
      <div className="kicker">Trivia · {item.difficulty}</div>
      <h2 className="trivia-q">{item.q}</h2>
      <div className="choices">
        {item.choices.map((c, i) => {
          let cls = 'choice'
          let label = c
          if (picked !== null) {
            if (i === item.answer) { cls += ' correct'; label = `✓ ${c}` }
            else if (i === picked) { cls += ' wrong'; label = `✗ ${c}` }
            else cls += ' dim'
          }
          return <button key={i} className={cls} onClick={() => pick(i)}>{label}</button>
        })}
      </div>
      {picked !== null && (
        <p className="trivia-why">
          {picked === item.answer ? '✓ ' : ''}{item.why} <span className="verse-ref">{item.ref}</span>
        </p>
      )}
    </CardShell>
  )
}
