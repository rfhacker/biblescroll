# BibleScroll Real Maps — Design Spec

**Date:** 2026-07-15
**Status:** Approved pending final review
**Supersedes:** the stylized hand-drawn `BaseMap` from the 2026-07-09 v1 spec (map cards section only)

## Problem

The v1 map cards draw a hand-authored stylized coastline and always show the
entire Near East. Users can't recognize where anything is: the land reads as
a blob, and stories with tight geography (Galilee ministry) compress their
cities into a few pixels. The map cards fail their purpose — showing *where*
biblical events happened.

## Goals

1. Genuinely recognizable geography: real coastlines, lakes, rivers.
2. Per-story zoom: each story's map frames its own places.
3. Orientation context: sea/river/region labels and a locator inset.
4. Unchanged constraints: fully offline, no external requests at runtime,
   bundle stays small, dark-first card aesthetic, no changes to `maps.json`.

## Non-Goals

Interactive panning/zooming, terrain shading, modern political borders,
per-story custom artwork.

## Approach

### Build-time basemap pipeline

- New script `scripts/make-basemap.mjs`, run manually (like `npm run convert`),
  with source data vendored into `data/` (committed) so builds never fetch.
- Source: **Natural Earth 1:50m** public-domain GeoJSON — land polygons,
  lakes, rivers (centerlines). Vendored subset only (our region), not the
  full global files.
- Region window: **lon 8–50°E, lat 26–43.5°N** (slightly wider than v1's
  10–48 / 27–42.5 so coastline context isn't cut mid-feature; `lib/geo.ts`
  projection constants update to match, and the existing 8px-margin
  validation in `maps.test.ts` keeps all story places on-map).
- Pipeline: clip → simplify (tolerance tuned to budget) → project via
  `lib/geo.ts` linear projection into a **800×600 reference frame** (higher
  precision than v1's 400×300; runtime scales freely via viewBox) → emit
  `src/content/basemap.json`.
- Output shape:
  ```ts
  interface Basemap {
    land: string[]      // SVG path `d` strings, projected, ref frame 800×600
    lakes: string[]
    rivers: string[]
    labels: MapLabel[]  // authored, merged in by the script from a source file
  }
  interface MapLabel {
    text: string                      // "Great Sea (Mediterranean)"
    kind: 'sea' | 'river' | 'region'
    x: number; y: number              // projected anchor, ref frame
    rank: 1 | 2 | 3                   // 1 = always show when in window
    angle?: number                    // optional rotation (rivers/elongated seas)
  }
  ```
- `basemap.json` size budget: **≤ 60KB raw** (validation-tested). Committed.

### Labels (authored, in `data/map-labels.json`, merged by the script)

- **Water:** Great Sea (Mediterranean), Sea of Galilee, Dead Sea (Salt Sea),
  Red Sea, Black Sea; rivers Jordan, Nile, Euphrates, Tigris.
- **Regions:** Egypt, Judea, Samaria, Galilee, Phoenicia, Syria, Mesopotamia,
  Asia Minor, Macedonia, Achaia, Moab, Edom, Persia.
- Naming convention: biblical name first, modern hint in parentheses only
  where it genuinely aids orientation.
- Rendering: seas soft italic; rivers small along-course (use `angle`);
  regions dim uppercase letter-spaced. Only labels whose anchor lies inside
  the current window render, capped at 6 by ascending rank.

### Per-story zoom

- New pure function in `lib/geo.ts`:
  `fitViewBox(points: {x,y}[], opts?): {x,y,w,h}` — bounding box of the
  story's projected places, padded 25%, clamped to: min window width 180
  (ref units — keeps single-city stories at a recognizable regional scale),
  max = full region, aspect locked 4:3, window shifted (not shrunk) when it
  would overflow the region edge.
- `MapCard` computes `fitViewBox` from its places and passes it to `BaseMap`
  as the SVG `viewBox`.
- **Constant on-screen sizing:** marker radius, stroke widths, and font sizes
  multiply by `scale = viewBox.w / 800` so they render the same size at any
  zoom. The existing top-edge label clamp and left/right text-anchor logic
  convert to window-relative coordinates.

### Locator inset

- When `viewBox.w < 0.55 × 800`, render a corner inset (~28% card width,
  bottom-right): full-region land silhouette + accent rectangle marking the
  current window. Non-interactive. Hidden for wide views (Paul's voyage).

### Unchanged

`maps.json` format and all 14 stories; city markers/routes; CardShell
integration; dark-pinned card palette (basemap uses `--map-sea`/`--map-land`
/`--text` tokens as today); share/favorite behavior.

## Components

| Unit | Responsibility |
|---|---|
| `scripts/make-basemap.mjs` | Vendored GeoJSON → clipped/simplified/projected `basemap.json` |
| `data/naturalearth-*.json` | Vendored public-domain source subsets (committed) |
| `data/map-labels.json` | Authored label anchors (lat/lon; script projects them) |
| `src/content/basemap.json` | Generated, committed; the only file runtime loads |
| `lib/geo.ts` | Existing projection (updated constants) + new `fitViewBox` |
| `BaseMap.tsx` | Renders basemap paths + filtered labels for a given viewBox |
| `MapCard.tsx` | Computes fit, scales marks, renders inset + story overlay |

## Error handling

- Script asserts: non-empty land/lakes/rivers after clip, all label anchors
  inside the region, size budget met — fails loudly at generation time.
- Runtime: basemap.json is statically imported (bundled) — no fetch, no new
  failure paths. A story whose places somehow produce a degenerate bbox gets
  the min-window clamp (never a zero/NaN viewBox — unit-tested).

## Testing

- `fitViewBox`: padding, min-window, aspect lock, edge shift, single-point,
  degenerate input.
- `basemap.json` validation: size budget, non-empty geometry, label anchors
  in-region, naming convention (regex: parenthetical hints only from an
  allowed list).
- `MapCard`: zoom applied (viewBox ≠ full region for Galilee story; = full
  region for voyage story), inset present/absent accordingly, ≤6 context
  labels, marker scaling; loop-render all 14 stories without error.
- Existing marker/route/edge-clamp tests updated to window-relative math.

## About panel

Add: "Map data: Natural Earth (public domain)."
