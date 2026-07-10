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
    setAnsweredPick(item.id, i)
    if (i === item.answer) {
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
          if (picked !== null) {
            if (i === item.answer) cls += ' correct'
            else if (i === picked) cls += ' wrong'
            else cls += ' dim'
          }
          return <button key={i} className={cls} onClick={() => pick(i)}>{c}</button>
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
