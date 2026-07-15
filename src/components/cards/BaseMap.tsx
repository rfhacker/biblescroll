import type { ReactNode } from 'react'
import { VIEW, type Box } from '../../lib/geo'
import basemap from '../../content/basemap.json'

interface MapLabel { text: string; kind: string; x: number; y: number; rank: number; angle?: number }

const FONT = { sea: 20, river: 13, region: 15 } as const

export function BaseMap({ view, children }: { view: Box; children?: ReactNode }) {
  const s = view.w / VIEW.w
  const m = 10 * s
  const labels = (basemap.labels as MapLabel[])
    .filter((l) => l.x >= view.x + m && l.x <= view.x + view.w - m &&
                   l.y >= view.y + m && l.y <= view.y + view.h - m)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 6)

  return (
    <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} className="basemap"
      role="img" aria-label="Map of the biblical world">
      <rect x={0} y={0} width={VIEW.w} height={VIEW.h} fill="var(--map-sea)" />
      {basemap.land.map((d, i) => (
        <path key={`l${i}`} d={d} className="bm-land" fill="var(--map-land)" fillRule="evenodd" />
      ))}
      {basemap.lakes.map((d, i) => (
        <path key={`k${i}`} d={d} className="bm-lake" fill="var(--map-sea)" />
      ))}
      {basemap.rivers.map((d, i) => (
        <path key={`r${i}`} d={d} className="bm-river" fill="none" stroke="var(--map-sea)"
          strokeWidth={2.5 * s} strokeLinecap="round" />
      ))}
      {labels.map((l) => (
        <text key={l.text} x={l.x} y={l.y} textAnchor="middle"
          className={`bm-label bm-${l.kind}`}
          style={{ fontSize: FONT[l.kind as keyof typeof FONT] * s }}
          transform={l.angle ? `rotate(${l.angle} ${l.x} ${l.y})` : undefined}>
          {l.text}
        </text>
      ))}
      {children}
    </svg>
  )
}
