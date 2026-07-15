import { project, fitViewBox, VIEW } from './geo'

test('projects known places inside the 800x600 viewBox', () => {
  const jerusalem = project(31.78, 35.22)
  expect(jerusalem.x).toBeGreaterThan(0); expect(jerusalem.x).toBeLessThan(VIEW.w)
  expect(jerusalem.y).toBeGreaterThan(0); expect(jerusalem.y).toBeLessThan(VIEW.h)
  const rome = project(41.9, 12.49)
  expect(rome.x).toBeLessThan(jerusalem.x)
  expect(rome.y).toBeLessThan(jerusalem.y)
})

test('fitViewBox pads a cluster and locks 4:3 aspect', () => {
  const v = fitViewBox([{ x: 500, y: 200 }, { x: 540, y: 230 }])
  expect(v.w / v.h).toBeCloseTo(4 / 3, 2)
  expect(v.x).toBeLessThan(500); expect(v.x + v.w).toBeGreaterThan(540)
  expect(v.y).toBeLessThan(200); expect(v.y + v.h).toBeGreaterThan(230)
})

test('fitViewBox enforces the minimum window for tight/single-point stories', () => {
  const v = fitViewBox([{ x: 400, y: 300 }])
  expect(v.w).toBe(180); expect(v.h).toBe(135)
  expect(v.x).toBeCloseTo(400 - 90, 0); expect(v.y).toBeCloseTo(300 - 67.5, 0)
})

test('fitViewBox clamps to the region at edges and caps at full region', () => {
  const corner = fitViewBox([{ x: 5, y: 5 }])
  expect(corner.x).toBe(0); expect(corner.y).toBe(0)
  const wide = fitViewBox([{ x: 10, y: 10 }, { x: 790, y: 590 }])
  expect(wide).toEqual({ x: 0, y: 0, w: 800, h: 600 })
})

test('fitViewBox never returns NaN or non-positive size', () => {
  for (const pts of [[], [{ x: 0, y: 0 }], [{ x: 800, y: 600 }]]) {
    const v = fitViewBox(pts as { x: number; y: number }[])
    for (const n of [v.x, v.y, v.w, v.h]) expect(Number.isFinite(n)).toBe(true)
    expect(v.w).toBeGreaterThan(0); expect(v.h).toBeGreaterThan(0)
  }
})
