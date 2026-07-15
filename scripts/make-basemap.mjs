// scripts/make-basemap.mjs
// data/ne-*.json (+ data/map-labels.json if present) -> src/content/basemap.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { simplify } from './geom.mjs'

const LON = { min: 8, max: 50 }
const LAT = { min: 26, max: 43.5 }
const VIEW = { w: 800, h: 600 }
const project = ([lon, lat]) => [
  Math.round(((lon - LON.min) / (LON.max - LON.min)) * VIEW.w * 10) / 10,
  Math.round(((LAT.max - lat) / (LAT.max - LAT.min)) * VIEW.h * 10) / 10,
]

// Small features (Levant 10m detail) keep more points than continental coastline.
function toleranceFor(points) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y] of points) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  return Math.max(maxX - minX, maxY - minY) < 1.5 ? 0.004 : 0.02
}

const pathOf = (pts, close) => {
  const d = pts.map(project).map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('')
  return close ? d + 'Z' : d
}

const land = JSON.parse(readFileSync('data/ne-land.json', 'utf8'))
const lakes = JSON.parse(readFileSync('data/ne-lakes.json', 'utf8'))
const rivers = JSON.parse(readFileSync('data/ne-rivers.json', 'utf8'))

const landPaths = land
  .map(({ ring }) => simplify(ring, toleranceFor(ring)))
  .filter((r) => r.length >= 4)
  .map((r) => pathOf(r, true))
const lakePaths = lakes
  .map(({ ring }) => simplify(ring, toleranceFor(ring)))
  .filter((r) => r.length >= 4)
  .map((r) => pathOf(r, true))
const riverPaths = rivers
  .map(({ line }) => simplify(line, toleranceFor(line)))
  .filter((l) => l.length >= 2)
  .map((l) => pathOf(l, false))

let labels = []
if (existsSync('data/map-labels.json')) {
  labels = JSON.parse(readFileSync('data/map-labels.json', 'utf8')).map((l) => {
    const [x, y] = project([l.lon, l.lat])
    if (x < 0 || x > VIEW.w || y < 0 || y > VIEW.h) throw new Error(`label off-region: ${l.text}`)
    const out = { text: l.text, kind: l.kind, x, y, rank: l.rank }
    if (l.angle) out.angle = l.angle
    return out
  })
}

if (landPaths.length < 3) throw new Error('land geometry suspiciously small')
if (lakePaths.length < 2 || riverPaths.length < 4) throw new Error('missing lakes/rivers')

const out = JSON.stringify({ land: landPaths, lakes: lakePaths, rivers: riverPaths, labels })
if (out.length > 61440) throw new Error(`basemap.json ${out.length}B exceeds 60KB budget — raise simplify tolerance`)
writeFileSync('src/content/basemap.json', out)
console.log(`basemap.json: ${out.length}B, land ${landPaths.length}, lakes ${lakePaths.length}, rivers ${riverPaths.length}, labels ${labels.length}`)
