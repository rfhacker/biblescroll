// Pure geometry for the basemap build pipeline. No dependencies.

// Sutherland–Hodgman polygon clip against an axis-aligned rect (convex).
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
  return out
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
  const [minX, minY, maxX, maxY] = rect
  const inside = (p) => p[0] >= minX && p[0] <= maxX && p[1] >= minY && p[1] <= maxY
  const segs = []
  let cur = []
  for (let i = 0; i < line.length; i++) {
    const p = line[i], prev = i > 0 ? line[i - 1] : null
    if (inside(p)) {
      if (prev && !inside(prev)) cur.push(boundaryPoint(prev, p, rect))
      cur.push(p)
    } else if (prev && inside(prev)) {
      cur.push(boundaryPoint(p, prev, rect))
      if (cur.length > 1) segs.push(cur)
      cur = []
    }
  }
  if (cur.length > 1) segs.push(cur)
  return segs
}

// Intersection of segment (out -> in) with the rect boundary, via binary search
// (robust for axis crossings without enumerating edge cases).
function boundaryPoint(outside, insideP, rect) {
  const [minX, minY, maxX, maxY] = rect
  const inR = (p) => p[0] >= minX && p[0] <= maxX && p[1] >= minY && p[1] <= maxY
  let lo = outside, hi = insideP
  for (let i = 0; i < 40; i++) {
    const mid = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2]
    if (inR(mid)) hi = mid
    else lo = mid
  }
  // snap to the exact boundary coordinate
  const p = hi.slice()
  if (Math.abs(p[0] - minX) < 1e-6) p[0] = minX
  if (Math.abs(p[0] - maxX) < 1e-6) p[0] = maxX
  if (Math.abs(p[1] - minY) < 1e-6) p[1] = minY
  if (Math.abs(p[1] - maxY) < 1e-6) p[1] = maxY
  return p
}

// Douglas–Peucker simplification. tolerance in the data's coordinate units.
export function simplify(points, tolerance) {
  if (points.length <= 2) return points
  let maxDist = 0, index = 0
  const [a, b] = [points[0], points[points.length - 1]]
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], a, b)
    if (d > maxDist) { maxDist = d; index = i }
  }
  if (maxDist <= tolerance) return [a, b]
  const left = simplify(points.slice(0, index + 1), tolerance)
  const right = simplify(points.slice(index), tolerance)
  return left.slice(0, -1).concat(right)
}

function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len
}
