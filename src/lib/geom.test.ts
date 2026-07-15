// @ts-expect-error plain-JS build helper without type declarations
import { clipPolygonToRect, clipPolylineToRect, simplify } from '../../scripts/geom.mjs'

const RECT = [0, 0, 10, 10] as [number, number, number, number]

test('clipPolygonToRect keeps an inside polygon unchanged', () => {
  const tri = [[2, 2], [8, 2], [5, 8]]
  expect(clipPolygonToRect(tri, RECT)).toEqual(tri)
})

test('clipPolygonToRect clips a polygon straddling an edge', () => {
  const sq = [[-5, 2], [5, 2], [5, 8], [-5, 8]]
  const out = clipPolygonToRect(sq, RECT)
  for (const [x, y] of out) {
    expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(10)
    expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(10)
  }
  expect(out.some(([x]) => x === 0)).toBe(true)   // new points on the clip edge
  expect(out.some(([x]) => x === 5)).toBe(true)   // original inside points kept
})

test('clipPolygonToRect returns [] for a fully outside polygon', () => {
  expect(clipPolygonToRect([[20, 20], [30, 20], [25, 30]], RECT)).toEqual([])
})

test('clipPolylineToRect splits a line that exits and re-enters', () => {
  const line = [[1, 5], [15, 5], [15, 6], [1, 6]]
  const segs = clipPolylineToRect(line, RECT)
  expect(segs).toHaveLength(2)
  expect(segs[0][0]).toEqual([1, 5])
  expect(segs[0][segs[0].length - 1]).toEqual([10, 5])
  expect(segs[1][0]).toEqual([10, 6])
})

test('simplify removes collinear middles but keeps corners and endpoints', () => {
  const line = [[0, 0], [1, 0.001], [2, 0], [2, 0.001], [4, 4]]
  const out = simplify(line, 0.1)
  expect(out[0]).toEqual([0, 0])
  expect(out[out.length - 1]).toEqual([4, 4])
  expect(out.length).toBeLessThan(line.length)
  expect(simplify([[0, 0], [9, 9]], 0.1)).toEqual([[0, 0], [9, 9]])
})

test('clipPolylineToRect keeps a through-crossing segment (Liang-Barsky)', () => {
  const segs = clipPolylineToRect([[-5, 5], [15, 5]], RECT)
  expect(segs).toEqual([[[0, 5], [10, 5]]])
})

test('clipPolygonToRect drops a corner-touch sliver', () => {
  const out = clipPolygonToRect([[0, 0], [-5, 0], [-5, -5], [0, -5]], RECT)
  expect(out).toEqual([])
})

test('clipPolygonToRect handles a GeoJSON-closed ring input and returns an open ring', () => {
  const closedRing = [[-5, 2], [5, 2], [5, 8], [-5, 8], [-5, 2]]
  const out = clipPolygonToRect(closedRing, RECT)
  for (const [x, y] of out) {
    expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(10)
    expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(10)
  }
  expect(out.length).toBeGreaterThanOrEqual(4)
  const first = out[0], last = out[out.length - 1]
  expect(first[0] === last[0] && first[1] === last[1]).toBe(false)
})

test('clipPolygonToRect clips an engulfing polygon down to the rect corners', () => {
  const out = clipPolygonToRect([[-100, -100], [100, -100], [100, 100], [-100, 100]], RECT)
  expect(out).toHaveLength(4)
  const expectedCorners = [[0, 0], [10, 0], [10, 10], [0, 10]]
  for (const corner of expectedCorners) {
    expect(out.some(([x, y]) => x === corner[0] && y === corner[1])).toBe(true)
  }
})

test('simplify handles a large near-collinear polyline without recursion overflow', () => {
  const n = 50000
  const line: number[][] = []
  for (let i = 0; i < n; i++) {
    const noise = (i % 7 === 0) ? 1e-6 : 0
    line.push([i, noise])
  }
  const out = simplify(line, 0.01)
  expect(out.length).toBeGreaterThanOrEqual(2)
  expect(out[0]).toEqual(line[0])
  expect(out[out.length - 1]).toEqual(line[line.length - 1])
})
