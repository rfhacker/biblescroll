// data/crossrefs-raw.json -> public/crossrefs/{BOOK}.json ; prints tier decision
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const raw = JSON.parse(readFileSync('data/crossrefs-raw.json', 'utf8'))
const byBook = new Map()
for (const a of raw) {
  if (!byBook.has(a.book)) byBook.set(a.book, [])
  byBook.get(a.book).push([a.c, a.v, a.refs])
}
mkdirSync('public/crossrefs', { recursive: true })
let total = 0
for (const [book, entries] of byBook) {
  entries.sort((x, y) => x[0] - y[0] || x[1] - y[1])
  const out = JSON.stringify(entries)
  writeFileSync(`public/crossrefs/${book}.json`, out)
  total += out.length
}
console.log(`crossrefs: ${byBook.size} books, ${total}B`)
console.log(total <= 4718592 ? 'TIER: precache' : 'TIER: runtime')
