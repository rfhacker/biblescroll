// Pure geometry for the basemap build pipeline. No dependencies.

// Sutherland–Hodgman polygon clip against an axis-aligned rect (convex).
//
// Ring convention: the input ring may be GeoJSON-closed (first point === last
// point — this is harmless, S-H clipping tolerates the repeated vertex). The
// returned ring is always OPEN (no duplicated closing vertex). Callers that
// build SVG paths (or any other closed representation) from the output must
// close the path themselves (e.g. with 'Z').
export function clipPolygonToRect(ring, [minX, minY, maxX, maxY]) {
  const edges = [
    { inside: (p) => p[0] >= minX, cross: (a, b) => lerpX(a, b, minX) },
    { inside: (p) => p[0] <= maxX, cross: (a, b) => lerpX(a, b, maxX) },
    { inside: (p) => p[1] >= minY, cross: (a, b) => lerpY(a, b, minY) },
    { inside: (p) => p[1] <= maxY, cross: (a, b) => lerpY(a, b, maxY) },
  ]
  let out = ring
  for (const e of edges) {
    const input = out
    out = []
    for (let i = 0; i < input.length; i++) {
      const cur = input[i]
      const prev = input[(i + input.length - 1) % input.length]
      const curIn = e.inside(cur), prevIn = e.inside(prev)
      if (curIn) {
        if (!prevIn) out.push(e.cross(prev, cur))
        out.push(cur)
      } else if (prevIn) {
        out.push(e.cross(prev, cur))
      }
    }
    if (out.length === 0) return []
  }
  return dedupeRing(out)
}

// Remove consecutive duplicate points (epsilon 1e-9), treating the first and
// last points as adjacent too (since the ring is implicitly closed). Guards
// against degenerate slivers (e.g. corner-touch clips) that survive the S-H
// passes as rings of 4+ coincident points. Returns [] if fewer than 3
// distinct points remain.
function dedupeRing(points) {
  const EPS = 1e-9
  const same = (a, b) => Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS
  const out = []
  for (const p of points) {
    if (out.length === 0 || !same(out[out.length - 1], p)) out.push(p)
  }
  while (out.length > 1 && same(out[0], out[out.length - 1])) out.pop()
  return out.length < 3 ? [] : out
}

function lerpX(a, b, x) {
  const t = (x - a[0]) / (b[0] - a[0])
  return [x, a[1] + t * (b[1] - a[1])]
}
function lerpY(a, b, y) {
  const t = (y - a[1]) / (b[1] - a[1])
  return [a[0] + t * (b[0] - a[0]), y]
}

// Clip a polyline; returns an array of segments (may exit/re-enter the rect).
export function clipPolylineToRect(line, rect) {
  const segs = []
  let cur = null
  const EPS = 1e-9
  const samePoint = (a, b) => Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS

  const closeCur = () => {
    if (cur && cur.length > 1) segs.push(cur)
    cur = null
  }

  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i]
    const clipped = clipSegment(a, b, rect)
    if (!clipped) {
      closeCur()
      continue
    }
    const { p0, p1, exits } = clipped
    if (!cur) {
      cur = [p0]
    } else if (!samePoint(cur[cur.length - 1], p0)) {
      closeCur()
      cur = [p0]
    }
    cur.push(p1)
    if (exits) closeCur()
  }
  closeCur()
  return segs
}

// Liang–Barsky parametric clipping of segment a->b against an axis-aligned
// rect. Returns null if the segment doesn't intersect the rect, otherwise
// the clipped endpoints and whether the clipped segment exits the rect
// before reaching b (t1 < 1).
function clipSegment(a, b, [minX, minY, maxX, maxY]) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  let t0 = 0, t1 = 1
  const p = [-dx, dx, -dy, dy]
  const q = [a[0] - minX, maxX - a[0], a[1] - minY, maxY - a[1]]
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null
    } else {
      const r = q[i] / p[i]
      if (p[i] < 0) {
        if (r > t1) return null
        if (r > t0) t0 = r
      } else {
        if (r < t0) return null
        if (r < t1) t1 = r
      }
    }
  }
  return { p0: [a[0] + t0 * dx, a[1] + t0 * dy], p1: [a[0] + t1 * dx, a[1] + t1 * dy], exits: t1 < 1 }
}

// Douglas–Peucker simplification. tolerance in the data's coordinate units.
// Iterative (explicit stack) so it doesn't blow the call stack on
// tens-of-thousands-point coastlines. Endpoints are always preserved.
export function simplify(points, tolerance) {
  if (points.length <= 2) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [lo, hi] = stack.pop()
    if (hi - lo < 2) continue
    const a = points[lo], b = points[hi]
    let maxDist = 0, index = -1
    for (let i = lo + 1; i < hi; i++) {
      const d = perpDist(points[i], a, b)
      if (d > maxDist) { maxDist = d; index = i }
    }
    if (maxDist > tolerance && index !== -1) {
      keep[index] = 1
      stack.push([lo, index], [index, hi])
    }
  }
  const out = []
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i])
  return out
}

function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len
}
