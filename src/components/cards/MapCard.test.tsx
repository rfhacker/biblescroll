import { render, screen } from '@testing-library/react'
import { MapCard } from './MapCard'
import maps from '../../content/maps.json'
import { VIEW } from '../../lib/geo'
import type { MapStory } from '../../content/types'

const story = {
  id: 'm01', title: 'Jonah runs the wrong way', route: true,
  body: 'Called east to Nineveh, Jonah sailed west from Joppa instead — toward the far edge of the known world.',
  ref: 'Jonah 1:1-3',
  places: [
    { name: 'Joppa', lat: 32.05, lon: 34.75 },
    { name: 'Nineveh', lat: 36.36, lon: 43.15 },
  ],
}

const galilee = (maps as MapStory[]).find((m) => m.title.toLowerCase().includes('galilee'))!
const voyage = (maps as MapStory[]).find((m) => m.title.toLowerCase().includes('rome') || m.id === 'm12')!

test('renders title, place labels, route line, and ref', () => {
  const { container } = render(<MapCard story={story} theme={0} />)
  expect(screen.getByText('Jonah runs the wrong way')).toBeInTheDocument()
  expect(screen.getByText('Joppa')).toBeInTheDocument()
  expect(screen.getByText('Nineveh')).toBeInTheDocument()
  expect(screen.getByText(/Jonah 1:1-3/)).toBeInTheDocument()
  expect(container.querySelectorAll('circle')).toHaveLength(2)
  expect(container.querySelector('polyline')).not.toBeNull()
})

test('does not render a route line when route is false', () => {
  const noRouteStory = { ...story, route: false }
  const { container } = render(<MapCard story={noRouteStory} theme={0} />)
  expect(container.querySelector('polyline')).toBeNull()
})

test('clamps a near-top-edge label below its marker when the fitted window hits the region top', () => {
  const edgeStory = {
    id: 'mX', title: 'North-South edge test', route: false,
    body: 'Places near the region top edge.', ref: 'Test 1:1',
    places: [
      { name: 'North', lat: 43.3, lon: 20 },
      { name: 'South', lat: 42.0, lon: 20 },
    ],
  }
  const { container } = render(<MapCard story={edgeStory} theme={0} />)
  const svg = container.querySelector('svg.basemap')!
  const [, vy, vw] = svg.getAttribute('viewBox')!.split(' ').map(Number)
  const s = vw / VIEW.w
  expect(vy).toBe(0) // fitted window clamps to the region's top edge

  const circles = container.querySelectorAll('circle')
  const northCy = Number(circles[0].getAttribute('cy'))
  const southCy = Number(circles[1].getAttribute('cy'))
  // per MapCard's labelYFor: cy - 30*s < view.y + 20*s triggers below-marker placement
  expect(northCy - 30 * s).toBeLessThan(vy + 20 * s)
  expect(southCy - 30 * s).not.toBeLessThan(vy + 20 * s)

  const northText = screen.getByText('North')
  const southText = screen.getByText('South')
  expect(Number(northText.getAttribute('y'))).toBeGreaterThan(northCy)
  expect(Number(southText.getAttribute('y'))).toBeLessThan(southCy)
})

test('anchors a near-left-edge label to start when the fitted window hits the region left edge', () => {
  const edgeStory = {
    id: 'mY', title: 'Left anchor test', route: false,
    body: 'A place near the region left edge.', ref: 'Test 2:1',
    places: [{ name: 'West', lat: 36.8, lon: 8.6 }],
  }
  const { container } = render(<MapCard story={edgeStory} theme={0} />)
  const svg = container.querySelector('svg.basemap')!
  const [vx, , vw] = svg.getAttribute('viewBox')!.split(' ').map(Number)
  const s = vw / VIEW.w
  expect(vx).toBe(0) // fitted window clamps to the region's left edge

  const circle = container.querySelector('circle')!
  const cx = Number(circle.getAttribute('cx'))
  expect(cx).toBeLessThan(vx + 60 * s) // inside the anchorFor edge zone

  const westText = screen.getByText('West')
  expect(westText.getAttribute('text-anchor')).toBe('start')
})

test('zooms to the story: Galilee window is small, voyage window is region-wide', () => {
  const { container: g } = render(<MapCard story={galilee} theme={0} />)
  const gw = Number(g.querySelector('svg.basemap')!.getAttribute('viewBox')!.split(' ')[2])
  expect(gw).toBeLessThan(300)
  const { container: v } = render(<MapCard story={voyage} theme={0} />)
  const vw = Number(v.querySelector('svg.basemap')!.getAttribute('viewBox')!.split(' ')[2])
  expect(vw).toBeGreaterThan(600) // Caesarea→Rome spans ~427 ref units; padded+aspect ≈ 644
})

test('locator inset appears only when zoomed in', () => {
  const { container: g } = render(<MapCard story={galilee} theme={0} />)
  expect(g.querySelector('[data-testid="inset"]')).not.toBeNull()
  const { container: v } = render(<MapCard story={voyage} theme={0} />)
  expect(v.querySelector('[data-testid="inset"]')).toBeNull()
})

test('inset avoids occluding a story place, picking a free corner (m03: Ur)', () => {
  const m03 = (maps as MapStory[]).find((m) => m.id === 'm03')!
  const { container } = render(<MapCard story={m03} theme={0} />)
  const svg = container.querySelector('svg.basemap')!
  const [vx, vy, vw, vh] = svg.getAttribute('viewBox')!.split(' ').map(Number)
  const s = vw / VIEW.w

  const insetRect = container.querySelector('[data-testid="inset"] rect')!
  const ix = Number(insetRect.getAttribute('x'))
  const iy = Number(insetRect.getAttribute('y'))
  const iw = Number(insetRect.getAttribute('width'))
  const ih = Number(insetRect.getAttribute('height'))

  const brX = vx + vw - iw - 12 * s
  const brY = vy + vh - ih - 12 * s
  expect(ix === brX && iy === brY).toBe(false) // bottom-right is occupied by Ur; must have moved

  // Ur (first place in m03) sits at ~(725.7, 429.9) in view space and must be outside the inset rect.
  const urCircle = container.querySelectorAll('circle')[0]
  const urX = Number(urCircle.getAttribute('cx'))
  const urY = Number(urCircle.getAttribute('cy'))
  expect(urX).toBeCloseTo(725.7, 0)
  expect(urY).toBeCloseTo(429.9, 0)
  const urInsideInset = urX >= ix && urX <= ix + iw && urY >= iy && urY <= iy + ih
  expect(urInsideInset).toBe(false)
})

test('inset stays bottom-right when no story place occupies that corner', () => {
  const m02 = (maps as MapStory[]).find((m) => m.id === 'm02')!
  const { container } = render(<MapCard story={m02} theme={0} />)
  const svg = container.querySelector('svg.basemap')!
  const [vx, vy, vw, vh] = svg.getAttribute('viewBox')!.split(' ').map(Number)
  const s = vw / VIEW.w

  const insetRect = container.querySelector('[data-testid="inset"] rect')!
  const ix = Number(insetRect.getAttribute('x'))
  const iy = Number(insetRect.getAttribute('y'))
  const iw = Number(insetRect.getAttribute('width'))
  const ih = Number(insetRect.getAttribute('height'))

  const brX = vx + vw - iw - 12 * s
  const brY = vy + vh - ih - 12 * s
  expect(ix).toBeCloseTo(brX, 5)
  expect(iy).toBeCloseTo(brY, 5)
})

test('dodges a near-coincident place label below to avoid stacking on an earlier marker', () => {
  const dodgeStory = {
    id: 'mZ', title: 'Coincident places test', route: false,
    body: 'Two places close enough on the map to collide.', ref: 'Test 3:1',
    places: [
      { name: 'Nazareth', lat: 32.7, lon: 35.3 },
      { name: 'Cana', lat: 32.75, lon: 35.34 },
    ],
  }
  const { container } = render(<MapCard story={dodgeStory} theme={0} />)
  const svg = container.querySelector('svg.basemap')!
  const vw = Number(svg.getAttribute('viewBox')!.split(' ')[2])
  const s = vw / VIEW.w

  const nazarethY = Number(screen.getByText('Nazareth').getAttribute('y'))
  const canaY = Number(screen.getByText('Cana').getAttribute('y'))
  expect(Math.abs(canaY - nazarethY)).toBeGreaterThan(20 * s)
})

test('all 14 stories render without error and with ≤6 context labels', () => {
  for (const s of maps as MapStory[]) {
    const { container, unmount } = render(<MapCard story={s} theme={1} />)
    expect(container.querySelectorAll('circle').length).toBe(s.places.length)
    expect(container.querySelectorAll('text.bm-label').length).toBeLessThanOrEqual(6)
    unmount()
  }
})
