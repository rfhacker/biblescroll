// src/content/facts.test.ts
import facts from './facts.json'
import type { FactItem } from './types'

const items = facts as FactItem[]

test('at least 100 valid facts', () => {
  expect(items.length).toBeGreaterThanOrEqual(100)
  expect(new Set(items.map((f) => f.id)).size).toBe(items.length)
  for (const f of items) {
    expect(f.title.length).toBeGreaterThan(5)
    expect(f.title.length).toBeLessThanOrEqual(70)
    expect(f.body.length).toBeGreaterThan(40)
    expect(f.ref.length).toBeGreaterThan(3)
  }
})
