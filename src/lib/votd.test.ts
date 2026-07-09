import { dayKey, votdIndex } from './votd'

test('dayKey formats local date', () => {
  expect(dayKey(new Date(2026, 6, 9))).toBe('2026-07-09')
  expect(dayKey(new Date(2026, 0, 1))).toBe('2026-01-01')
})

test('votdIndex is deterministic per day and in range', () => {
  const a = votdIndex('2026-07-09', 300)
  expect(votdIndex('2026-07-09', 300)).toBe(a)
  expect(a).toBeGreaterThanOrEqual(0)
  expect(a).toBeLessThan(300)
  const days = ['2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12']
  expect(new Set(days.map((d) => votdIndex(d, 300))).size).toBeGreaterThan(1)
})
