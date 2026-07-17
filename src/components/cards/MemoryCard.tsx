import { useMemo, useState } from 'react'
import { RefButton } from './RefButton'
import { buildPuzzle, DISTRACTOR_TEXTS, cleanWord } from '../../lib/memory'
import { addScore, isMemorized, setMemorized } from '../../lib/store'

export function MemoryCard({ text, label, seed, theme, onScore }: {
  text: string; label: string; seed: string; theme: number; onScore: () => void
}) {
  const puzzle = useMemo(() => buildPuzzle(text, DISTRACTOR_TEXTS, seed), [text, seed])
  const [done, setDone] = useState(() => isMemorized(label))
  const [filled, setFilled] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [used, setUsed] = useState<Set<number>>(new Set())
  const [shakeIdx, setShakeIdx] = useState<number | null>(null)

  function tap(chipIdx: number) {
    if (done) return
    const expected = puzzle.answers[filled]
    if (puzzle.bank[chipIdx].toLowerCase() === expected.toLowerCase()) {
      const next = filled + 1
      setUsed((u) => new Set(u).add(chipIdx))
      setFilled(next)
      setShakeIdx(null)
      if (next === puzzle.answers.length) {
        setDone(true)
        setMemorized(label)
        if (mistakes === 0) { addScore(1); onScore() }
      }
    } else {
      setMistakes((m) => m + 1)
      setShakeIdx(chipIdx)
    }
  }

  const blanksFilled = new Set(puzzle.blankIndexes.slice(0, filled))

  return (
    <article className={`card theme-${theme}`}>
      <div className="card-body">
        <div className="kicker">Memory Verse</div>
        {!done && <p className="memory-hint">Fill in the missing words</p>}
        <p className="verse-text">
          {puzzle.words.map((w, i) => {
            const bi = puzzle.blankIndexes.indexOf(i)
            if (done || bi === -1 || blanksFilled.has(i)) {
              const isBlankWord = bi !== -1
              return <span key={i} className={isBlankWord ? 'memory-filled' : undefined}>{w} </span>
            }
            const isNext = puzzle.blankIndexes[filled] === i
            return <span key={i} className={isNext ? 'memory-blank memory-next' : 'memory-blank'}>{'______'} </span>
          })}
        </p>
        {!done && (
          <div className="memory-bank">
            {puzzle.bank.map((w, i) => used.has(i) ? null : (
              <button key={i} className={shakeIdx === i ? 'chip memory-wrong' : 'chip'}
                onClick={() => tap(i)}>{w}</button>
            ))}
          </div>
        )}
        {done && <p className="memory-done">Hidden in your heart ✓</p>}
        <RefButton refString={label} />
      </div>
    </article>
  )
}
