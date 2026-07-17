import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import type { TimelineItem } from '../../content/types'

const ERAS = [
  { label: 'Abraham', pos: 10 },
  { label: 'Exodus', pos: 24 },
  { label: 'David', pos: 40 },
  { label: 'Exile', pos: 56 },
  { label: 'Jesus', pos: 78 },
  { label: 'Paul', pos: 90 },
]

export function TimelineCard({ item, theme }: { item: TimelineItem; theme: number }) {
  const x = 12 + (item.position / 100) * 376
  return (
    <CardShell theme={theme}
      shareText={`${item.title} (${item.when}): ${item.blurb} (${item.ref})`}
      fav={{ kind: 'timeline', id: item.id, title: `${item.title} — ${item.when}`, body: `${item.blurb} (${item.ref})` }}>
      <div className="kicker">Biblical Timeline</div>
      <h2 className="fact-title">{item.title}</h2>
      <svg viewBox="0 0 400 84" className="timeline-svg" role="img"
        aria-label={`Timeline position: ${item.when}`}>
        <line x1="12" y1="52" x2="388" y2="52" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" />
        {ERAS.map((e) => {
          const ex = 12 + (e.pos / 100) * 376
          return (
            <g key={e.label}>
              <circle cx={ex} cy={52} r={3.5} fill="var(--text-dim)" />
              <text x={ex} y={72} textAnchor="middle" className="timeline-era">{e.label}</text>
            </g>
          )
        })}
        <circle cx={x} cy={52} r={7} fill="var(--accent)" stroke="var(--bg)" strokeWidth="2.5" />
        <text x={Math.min(Math.max(x, 40), 360)} y={30} textAnchor="middle" className="timeline-when">{item.when}</text>
      </svg>
      <p className="fact-body">{item.blurb}</p>
      <RefButton refString={item.ref} />
    </CardShell>
  )
}
