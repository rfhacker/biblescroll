import { CardShell } from './CardShell'
import { BaseMap } from './BaseMap'
import { project } from '../../lib/geo'
import type { MapStory } from '../../content/types'

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
        {pts.map((p) => (
          <g key={p.name}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="var(--accent)" stroke="var(--bg)" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 9} textAnchor="middle" className="map-label">{p.name}</text>
          </g>
        ))}
      </BaseMap>
      <p className="fact-body">{story.body}</p>
      <p className="verse-ref">{story.ref}</p>
    </CardShell>
  )
}
