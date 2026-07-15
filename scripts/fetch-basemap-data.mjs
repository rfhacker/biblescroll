// scripts/fetch-basemap-data.mjs
// One-time vendoring: download Natural Earth GeoJSON (public domain), clip to
// our region, write small subsets into data/. CI never runs this.
import { writeFileSync, mkdirSync } from 'node:fs'
import { clipPolygonToRect, clipPolylineToRect } from './geom.mjs'

const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson'
const REGION = [8, 26, 50, 43.5]           // minLon, minLat, maxLon, maxLat
const LEVANT = [34, 29, 37.5, 34]          // high-detail sub-window (Jordan valley)

async function fetchJson(name) {
  const res = await fetch(`${BASE}/${name}`)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  return res.json()
}

function ringsOf(feature) {
  const g = feature.geometry
  if (g.type === 'Polygon') return g.coordinates
  if (g.type === 'MultiPolygon') return g.coordinates.flat()
  return []
}
function linesOf(feature) {
  const g = feature.geometry
  if (g.type === 'LineString') return [g.coordinates]
  if (g.type === 'MultiLineString') return g.coordinates
  return []
}
const nameOf = (f) => (f.properties?.name ?? f.properties?.NAME ?? f.properties?.name_en ?? '') + ''

function clipPolyFeatures(features, rect) {
  const out = []
  for (const f of features) {
    for (const ring of ringsOf(f)) {
      const c = clipPolygonToRect(ring, rect)
      if (c.length >= 4) out.push({ name: nameOf(f), ring: c })
    }
  }
  return out
}
function clipLineFeatures(features, rect) {
  const out = []
  for (const f of features) {
    for (const line of linesOf(f)) {
      for (const seg of clipPolylineToRect(line, rect)) {
        if (seg.length >= 2) out.push({ name: nameOf(f), line: seg })
      }
    }
  }
  return out
}

const land50 = await fetchJson('ne_50m_land.geojson')
const lakes50 = await fetchJson('ne_50m_lakes.geojson')
const rivers50 = await fetchJson('ne_50m_rivers_lake_centerlines.geojson')
const lakes10 = await fetchJson('ne_10m_lakes.geojson')
const rivers10 = await fetchJson('ne_10m_rivers_lake_centerlines.geojson')

const land = clipPolyFeatures(land50.features, REGION)

// Lakes: 50m everywhere, plus 10m detail for the biblically-critical Levant
// lakes (Sea of Galilee / Lake Tiberias, Dead Sea), replacing 50m versions.
const levantLakeRe = /galilee|tiberias|dead sea/i
const lakes = [
  ...clipPolyFeatures(lakes50.features, REGION).filter((l) => !levantLakeRe.test(l.name)),
  ...clipPolyFeatures(lakes10.features.filter((f) => levantLakeRe.test(nameOf(f))), LEVANT),
]

// Rivers: 50m everywhere (Nile, Euphrates, Tigris), plus 10m Jordan.
const rivers = [
  ...clipLineFeatures(rivers50.features, REGION),
  ...clipLineFeatures(rivers10.features.filter((f) => /jordan/i.test(nameOf(f))), LEVANT),
]

// Sanity: the named features this app's stories depend on must be present.
const lakeNames = lakes.map((l) => l.name.toLowerCase()).join('|')
for (const need of ['galilee|tiberias', 'dead sea']) {
  if (!new RegExp(need).test(lakeNames)) throw new Error(`missing lake matching /${need}/ — check 10m source`)
}
const riverNames = rivers.map((r) => r.name.toLowerCase()).join('|')
for (const need of ['nile', 'euphrates', 'tigris', 'jordan']) {
  if (!riverNames.includes(need)) throw new Error(`missing river ${need}`)
}
if (land.length < 3) throw new Error('suspiciously little land after clip')

mkdirSync('data', { recursive: true })
writeFileSync('data/ne-land.json', JSON.stringify(land))
writeFileSync('data/ne-lakes.json', JSON.stringify(lakes))
writeFileSync('data/ne-rivers.json', JSON.stringify(rivers))
console.log(`land rings: ${land.length}, lakes: ${lakes.length}, river segs: ${rivers.length}`)
