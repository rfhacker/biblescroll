import { CardShell } from './CardShell'
import { BaseMap } from './BaseMap'
import { project, fitViewBox, VIEW } from '../../lib/geo'
import basemap from '../../content/basemap.json'
import type { MapStory } from '../../content/types'

const INSET_THRESHOLD = 0.55 * VIEW.w

export function MapCard({ story, theme }: { story: MapStory; theme: number }) {
  const pts = story.places.map((p) => ({ ...p, ...project(p.lat, p.lon) }))
  const view = fitViewBox(pts)
  const s = view.w / VIEW.w

  const anchorFor = (x: number) => {
    if (x < view.x + 60 * s) return { anchor: 'start' as const, dx: 10 * s }
    if (x > view.x + view.w - 60 * s) return { anchor: 'end' as const, dx: -10 * s }
    return { anchor: 'middle' as const, dx: 0 }
  }
  const labelYFor = (y: number) =>
    y - 30 * s < view.y + 20 * s ? y + 36 * s : y - 18 * s

  const iw = view.w * 0.28
  const ih = iw * 0.75
  const ix = view.x + view.w - iw - 12 * s
  const iy = view.y + view.h - ih - 12 * s
  const k = iw / VIEW.w

  return (
    <CardShell theme={theme} shareText={`${story.title} — ${story.body} (${story.ref})`}
      fav={{ kind: 'map', id: story.id, title: story.title, body: `${story.body} (${story.ref})` }}>
      <div className="kicker">Biblical places</div>
      <h2 className="fact-title">{story.title}</h2>
      <BaseMap view={view}>
        {story.route && pts.length > 1 && (
          <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none"
            stroke="var(--accent)" strokeWidth={4 * s} strokeDasharray={`${10 * s} ${8 * s}`}
            strokeLinecap="round" />
        )}
        {pts.map((p) => {
          const a = anchorFor(p.x)
          return (
            <g key={p.name}>
              <circle cx={p.x} cy={p.y} r={9 * s} fill="var(--accent)"
                stroke="var(--bg)" strokeWidth={3 * s} />
              <text x={p.x + a.dx} y={labelYFor(p.y)} textAnchor={a.anchor}
                className="map-label" style={{ fontSize: 22 * s }}>{p.name}</text>
            </g>
          )
        })}
        {view.w < INSET_THRESHOLD && (
          <g data-testid="inset">
            <rect x={ix} y={iy} width={iw} height={ih} rx={4 * s}
              fill="var(--map-sea)" stroke="var(--text-dim)" strokeWidth={1.5 * s} opacity={0.94} />
            <g transform={`translate(${ix},${iy}) scale(${k})`} opacity={0.9}>
              {basemap.land.map((d, i) => (
                <path key={i} d={d} fill="var(--map-land)" fillRule="evenodd" />
              ))}
            </g>
            <rect x={ix + view.x * k} y={iy + view.y * k} width={view.w * k} height={view.h * k}
              fill="none" stroke="var(--accent)" strokeWidth={2 * s} />
          </g>
        )}
      </BaseMap>
      <p className="fact-body">{story.body}</p>
      <p className="verse-ref">{story.ref}</p>
    </CardShell>
  )
}
