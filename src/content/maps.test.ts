import maps from './maps.json'
import { project, VIEW } from '../lib/geo'
import type { MapStory } from './types'

const items = maps as MapStory[]

test('at least 12 valid map stories, all places project on-screen', () => {
  expect(items.length).toBeGreaterThanOrEqual(12)
  expect(new Set(items.map((m) => m.id)).size).toBe(items.length)
  for (const m of items) {
    expect(m.title.length).toBeGreaterThan(5)
    expect(m.body.length).toBeGreaterThan(40)
    expect(m.ref.length).toBeGreaterThan(3)
    expect(m.places.length).toBeGreaterThanOrEqual(1)
    expect(typeof m.route).toBe('boolean')
    for (const p of m.places) {
      const { x, y } = project(p.lat, p.lon)
      expect(x, `${m.id}:${p.name}`).toBeGreaterThanOrEqual(8)
      expect(x, `${m.id}:${p.name}`).toBeLessThanOrEqual(VIEW.w - 8)
      expect(y, `${m.id}:${p.name}`).toBeGreaterThanOrEqual(8)
      expect(y, `${m.id}:${p.name}`).toBeLessThanOrEqual(VIEW.h - 8)
    }
  }
})
