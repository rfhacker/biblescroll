import { readFileSync } from 'node:fs'
import { buildStore, parseLooseRef, refKey } from './verseStore'
import trivia from './trivia.json'
import facts from './facts.json'
import maps from './maps.json'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const allRefs: { src: string; ref: string }[] = [
  ...(trivia as { id: string; ref: string }[]).map((t) => ({ src: `trivia ${t.id}`, ref: t.ref })),
  ...(facts as { id: string; ref: string }[]).map((f) => ({ src: `facts ${f.id}`, ref: f.ref })),
  ...(maps as { id: string; ref: string }[]).map((m) => ({ src: `maps ${m.id}`, ref: m.ref })),
]

test('every pack ref parses and resolves to a real chapter and verse', () => {
  for (const { src, ref } of allRefs) {
    const r = parseLooseRef(ref)
    expect(r, `${src}: "${ref}" did not parse`).not.toBeNull()
    expect(store.chapters.has(`${r!.b} ${r!.c}`), `${src}: "${ref}" chapter missing`).toBe(true)
    expect(store.byKey.has(refKey(r!.b, r!.c, r!.v)), `${src}: "${ref}" verse missing`).toBe(true)
  }
})
