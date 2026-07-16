import { useMemo, useState } from 'react'
import { VerseCard } from './cards/VerseCard'
import { VerseSlide } from './cards/VerseSlide'
import { seededShuffle } from '../lib/rng'
import { getInstallSeed } from '../lib/store'
import { refLabel, refText, type VerseStore } from '../content/verseStore'
import feelings from '../content/feelings.json'
import type { CuratedRef } from '../content/types'

interface Feeling { id: string; label: string; intro: string; refs: CuratedRef[] }
const FEELINGS = feelings as Feeling[]

export function Feelings({ verses, onClose }: { verses: VerseStore; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [showing, setShowing] = useState(false)

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const ordered = useMemo(() => {
    const chosenFeelings = FEELINGS.filter((f) => selected.includes(f.id))
    const seen = new Set<string>()
    const union: CuratedRef[] = []
    for (const f of chosenFeelings) for (const r of f.refs) {
      const k = r.join(':')
      if (!seen.has(k)) { seen.add(k); union.push(r) }
    }
    // Absorb refs whose span is fully contained within another kept ref's
    // (wider) span in the same book+chapter, e.g. JHN 11:35 inside JHN 11:32-35.
    const refs = union.filter((r) => !union.some((o) => {
      if (o === r || o[0] !== r[0] || o[1] !== r[1]) return false
      const oEnd = o[3] ?? o[2]
      const rEnd = r[3] ?? r[2]
      const contained = o[2] <= r[2] && oEnd >= rEnd
      const identical = o[2] === r[2] && oEnd === rEnd
      return contained && !identical
    }))
    const ids = [...selected].sort().join('+')
    return seededShuffle(refs, `${getInstallSeed()}:feel:${ids}`)
  }, [selected, showing])

  if (!showing) {
    return (
      <div className="panel">
        <header className="panel-head">
          <h1>How are you feeling?</h1>
          <button aria-label="Close" onClick={onClose}>✕</button>
        </header>
        <p className="feel-prompt">Whatever you're carrying, the Word meets you there.</p>
        <div className="feel-chips">
          {FEELINGS.map((f) => (
            <button key={f.id} aria-pressed={selected.includes(f.id)}
              className={selected.includes(f.id) ? 'chip chip-on' : 'chip'}
              onClick={() => toggle(f.id)}>{f.label}</button>
          ))}
        </div>
        <button className="feel-go" disabled={selected.length === 0}
          onClick={() => setShowing(true)}>Show me verses</button>
      </div>
    )
  }

  const chosen = FEELINGS.filter((f) => selected.includes(f.id))
  const introText = chosen.length === 1
    ? chosen[0].intro
    : `For what you're carrying — ${chosen.map((f) => f.label.toLowerCase()).join(', ')} — the Word has a word.`

  return (
    <div className="panel feel-results">
      <header className="panel-head feel-results-head">
        <button aria-label="Back" onClick={() => setShowing(false)}>‹ Feelings</button>
        <span className="feel-tags">{chosen.map((f) => f.label).join(' · ')}</span>
        <button aria-label="Close" onClick={onClose}>✕</button>
      </header>
      <div className="feed feel-feed">
        <section className="slot"><article className="card theme-0">
          <div className="card-body">
            <div className="kicker">For you, right now</div>
            <p className="verse-text">{introText}</p>
          </div>
        </article></section>
        {ordered.map((r, i) => (
          <section className="slot" key={r.join(':')}>
            <VerseSlide book={r[0]} c={r[1]} v={r[2]} verses={verses}>
              <VerseCard text={refText(verses, r)} label={refLabel(r)} theme={(i + 1) % 5} />
            </VerseSlide>
          </section>
        ))}
        <section className="slot"><article className="card theme-2">
          <div className="card-body">
            <p className="verse-text">May these stay with you — come back whenever you need them.</p>
            <button className="feel-go" onClick={() => setShowing(false)}>Back to feelings</button>
          </div>
        </article></section>
      </div>
    </div>
  )
}
