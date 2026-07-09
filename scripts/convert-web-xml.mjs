import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const xml = readFileSync('data/engwebp_vpl.xml', 'utf8')
// Single pass, source order: group 4 is undefined for self-closing (empty) verse tags.
const reVerse = /<v b="([A-Z0-9]+)" c="(\d+)" v="(\d+)"\s*(?:\/>|>([\s\S]*?)<\/v>)/g
const decode = (s) => s
  .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"').replaceAll('&apos;', "'")

const allVerses = []
for (const m of xml.matchAll(reVerse)) {
  const text = m[4] === undefined ? '' : decode(m[4]).trim()
  allVerses.push([m[1], Number(m[2]), Number(m[3]), text])
}

// Source-integrity check: every <v> tag in the XML must have been parsed, in order.
if (allVerses.length !== 31103) throw new Error(`expected 31103 verses, got ${allVerses.length}`)

// Empty verses are footnote-only textual variants (e.g. LUK 17:36, ACT 8:37, ACT 15:34,
// ACT 24:7, ROM 16:25). An app that renders random verse cards must never draw a blank,
// so we omit them from the output while keeping the canonical source order intact.
const verses = allVerses.filter((v) => v[3].length > 0)
const omitted = allVerses.length - verses.length

mkdirSync('public/content', { recursive: true })
writeFileSync('public/content/verses.json', JSON.stringify(verses))
console.log(`wrote ${verses.length} verses (${omitted} empty textual variants omitted)`)
