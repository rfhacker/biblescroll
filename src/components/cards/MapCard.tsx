import { CardShell } from './CardShell'
import { BaseMap } from './BaseMap'
import { project, VIEW } from '../../lib/geo'
import type { MapStory } from '../../content/types'

const EDGE_MARGIN = 30

export function MapCard({ story, theme }: { story: MapStory; theme: number }) {
  const pts = story.places.map((p) => ({ ...p, ...project(p.lat, p.lon) }))
  return (
    <CardShell theme={theme} shareText={`${story.title} — ${story.body} (${story.ref})`}
      fav={{ kind: 'map', id: story.id, title: story.title, body: `${story.body} (${story.ref})` }}>
      <div className="kicker">Biblical places</div>
      <h2 className="fact-title">{story.title}</h2>
      <BaseMap>
        {story.route && pts.length > 1 && (
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="var(--accent)" strokeWidth="2"
            strokeDasharray="5 4" strokeLinecap="round" />
        )}
        {pts.map((p) => {
          const labelAbove = p.y - 9
          const labelY = labelAbove < 12 ? p.y + 18 : labelAbove
          const nearLeft = p.x < EDGE_MARGIN
          const nearRight = p.x > VIEW.w - EDGE_MARGIN
          const textAnchor = nearLeft ? 'start' : nearRight ? 'end' : 'middle'
          const labelX = nearLeft ? p.x + 6 : nearRight ? p.x - 6 : p.x
          return (
            <g key={p.name}>
              <circle cx={p.x} cy={p.y} r="4.5" fill="var(--accent)" stroke="var(--bg)" strokeWidth="1.5" />
              <text x={labelX} y={labelY} textAnchor={textAnchor} className="map-label">{p.name}</text>
            </g>
          )
        })}
      </BaseMap>
      <p className="fact-body">{story.body}</p>
      <p className="verse-ref">{story.ref}</p>
    </CardShell>
  )
}
