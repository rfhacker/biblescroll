export const VIEW = { w: 800, h: 600 }
export const LON = { min: 8, max: 50 }
export const LAT = { min: 26, max: 43.5 }

export function project(lat: number, lon: number): { x: number; y: number } {
  return {
    x: ((lon - LON.min) / (LON.max - LON.min)) * VIEW.w,
    y: ((LAT.max - lat) / (LAT.max - LAT.min)) * VIEW.h,
  }
}

export interface Box { x: number; y: number; w: number; h: number }

const MIN_W = 180
const ASPECT = 4 / 3
const round1 = (n: number) => Math.round(n * 10) / 10

export function fitViewBox(pts: { x: number; y: number }[]): Box {
  if (pts.length === 0) return { x: 0, y: 0, w: VIEW.w, h: VIEW.h }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  let w = (maxX - minX) * 1.5
  const paddedH = (maxY - minY) * 1.5
  w = Math.max(w, MIN_W, paddedH * ASPECT)
  if (w > VIEW.w) w = VIEW.w
  let h = w / ASPECT
  let x = (minX + maxX) / 2 - w / 2
  let y = (minY + maxY) / 2 - h / 2
  x = Math.min(Math.max(x, 0), VIEW.w - w)
  y = Math.min(Math.max(y, 0), VIEW.h - h)
  return { x: round1(x), y: round1(y), w: round1(w), h: round1(h) }
}
