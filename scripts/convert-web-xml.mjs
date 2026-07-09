import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const xml = readFileSync('data/engwebp_vpl.xml', 'utf8')
const reWithContent = /<v b="([A-Z0-9]+)" c="(\d+)" v="(\d+)">([\s\S]*?)<\/v>/g
const reEmpty = /<v b="([A-Z0-9]+)" c="(\d+)" v="(\d+)" \/>/g
const decode = (s) => s
  .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"').replaceAll('&apos;', "'")
const verses = []
for (const m of xml.matchAll(reWithContent)) {
  verses.push([m[1], Number(m[2]), Number(m[3]), decode(m[4]).trim()])
}
for (const m of xml.matchAll(reEmpty)) {
  verses.push([m[1], Number(m[2]), Number(m[3]), ''])
}
if (verses.length !== 31103) throw new Error(`expected 31103 verses, got ${verses.length}`)
mkdirSync('public/content', { recursive: true })
writeFileSync('public/content/verses.json', JSON.stringify(verses))
console.log(`wrote ${verses.length} verses`)
