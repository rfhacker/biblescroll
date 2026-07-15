import { render } from '@testing-library/react'
import { BaseMap } from './BaseMap'
import { project, fitViewBox, VIEW } from '../../lib/geo'
import maps from '../../content/maps.json'
import basemap from '../../content/basemap.json'
import type { MapStory } from '../../content/types'

const FULL = { x: 0, y: 0, w: VIEW.w, h: VIEW.h }

test('renders real geometry with the requested viewBox', () => {
  const { container } = render(<BaseMap view={FULL} />)
  const svg = container.querySelector('svg')!
  expect(svg.getAttribute('viewBox')).toBe('0 0 800 600')
  expect(container.querySelectorAll('path.bm-land').length).toBeGreaterThanOrEqual(3)
  expect(container.querySelectorAll('path.bm-lake').length).toBeGreaterThanOrEqual(2)
  expect(container.querySelectorAll('path.bm-river').length).toBeGreaterThanOrEqual(4)
})

test('caps context labels at 6, rank-ordered', () => {
  const { container } = render(<BaseMap view={FULL} />)
  const labels = container.querySelectorAll('text.bm-label')
  expect(labels.length).toBeLessThanOrEqual(6)
  expect([...labels].some((t) => t.textContent === 'Great Sea (Mediterranean)')).toBe(true)
})

test('filters labels to the current window', () => {
  // Levant window: Galilee visible, Macedonia not
  const { container } = render(<BaseMap view={{ x: 480, y: 320, w: 180, h: 135 }} />)
  const texts = [...container.querySelectorAll('text.bm-label')].map((t) => t.textContent)
  expect(texts).toContain('Galilee')
  expect(texts).not.toContain('Macedonia')
})

test('breaks rank ties by distance to window center, favoring story-relevant labels', () => {
  // m12's voyage window is wide and rank-2 labels vastly outnumber the 6-label cap.
  // Macedonia/Achaia sit near the window center (Paul's route) and must win the
  // tie over farther-off rank-2 Levant labels (Judea, Syria, Black Sea, ...).
  // Sea of Galilee is out on rank alone (demoted to 3 — it sits within ~9 view
  // units of the "Galilee" region label, so it's redundant crowding cargo, not
  // information voyage readers need); this asserts it doesn't sneak back in.
  const voyage = (maps as MapStory[]).find((m) => m.id === 'm12')!
  const pts = voyage.places.map((p) => project(p.lat, p.lon))
  const view = fitViewBox(pts)
  const { container } = render(<BaseMap view={view} />)
  const texts = [...container.querySelectorAll('text.bm-label')].map((t) => t.textContent)
  expect(texts).toContain('Macedonia')
  expect(texts).toContain('Achaia (Greece)')
  expect(texts).not.toContain('Sea of Galilee')
})

test('Red Sea label falls within the Exodus (m04) window after the Gulf-of-Suez anchor move', () => {
  const exodus = (maps as MapStory[]).find((m) => m.id === 'm04')!
  const pts = exodus.places.map((p) => project(p.lat, p.lon))
  const view = fitViewBox(pts)
  const { container } = render(<BaseMap view={view} />)
  const texts = [...container.querySelectorAll('text.bm-label')].map((t) => t.textContent)
  expect(texts).toContain('Red Sea')
})

test('avoid suppresses context labels near given points, regardless of window', () => {
  // Levant window includes "Galilee" per the earlier test; passing an avoid point
  // right on top of its anchor should hide it while leaving other labels alone.
  const view = { x: 480, y: 320, w: 180, h: 135 }
  const { container: withoutAvoid } = render(<BaseMap view={view} />)
  expect([...withoutAvoid.querySelectorAll('text.bm-label')].some((t) => t.textContent === 'Galilee')).toBe(true)

  const galileeLabel = (basemap.labels as { text: string; x: number; y: number }[])
    .find((l) => l.text === 'Galilee')!
  const { container: withAvoid } = render(<BaseMap view={view} avoid={[{ x: galileeLabel.x, y: galileeLabel.y }]} />)
  const texts = [...withAvoid.querySelectorAll('text.bm-label')].map((t) => t.textContent)
  expect(texts).not.toContain('Galilee')
})
