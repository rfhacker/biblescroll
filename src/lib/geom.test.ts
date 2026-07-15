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
