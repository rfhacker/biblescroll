import { readFileSync } from 'node:fs'
import { buildStore, parseLooseRef, refKey } from './verseStore'
import trivia from './trivia.json'
import facts from './facts.json'
import maps from './maps.json'
import whosaid from './whosaid.json'
import cont from './continue.json'
import prayer from './prayer.json'
import names from './names.json'
import prophecy from './prophecy.json'
import hymns from './hymns.json'
import timeline from './timeline.json'
import words from './words.json'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const allRefs: { src: string; ref: string }[] = [
  ...(trivia as { id: string; ref: string }[]).map((t) => ({ src: `trivia ${t.id}`, ref: t.ref })),
  ...(facts as { id: string; ref: string }[]).map((f) => ({ src: `facts ${f.id}`, ref: f.ref })),
  ...(maps as { id: string; ref: string }[]).map((m) => ({ src: `maps ${m.id}`, ref: m.ref })),
  ...(whosaid as { id: string; ref: string }[]).map((w) => ({ src: `whosaid ${w.id}`, ref: w.ref })),
  ...(cont as { id: string; ref: string }[]).map((c) => ({ src: `continue ${c.id}`, ref: c.ref })),
  ...(cont as { id: string; sources: string[] }[]).flatMap((c) =>
    c.sources.map((s, i) => ({ src: `continue ${c.id} source ${i}`, ref: s }))),
  ...(prayer as { id: string; ref: string }[]).map((p) => ({ src: `prayer ${p.id}`, ref: p.ref })),
  ...(names as { id: string; refs: string[] }[]).flatMap((n) =>
    n.refs.map((r, i) => ({ src: `names ${n.id} ref ${i}`, ref: r }))),
  ...(prophecy as { id: string; prophecyRef: string; fulfillmentRef: string }[]).flatMap((p) => [
    { src: `prophecy ${p.id} prophecyRef`, ref: p.prophecyRef },
    { src: `prophecy ${p.id} fulfillmentRef`, ref: p.fulfillmentRef },
  ]),
  ...(hymns as { id: string; ref: string }[]).map((h) => ({ src: `hymns ${h.id}`, ref: h.ref })),
  ...(timeline as { id: string; ref: string }[]).map((t) => ({ src: `timeline ${t.id}`, ref: t.ref })),
  ...(words as { id: string; refs: string[] }[]).flatMap((w) =>
    w.refs.map((r, i) => ({ src: `words ${w.id} ref ${i}`, ref: r }))),
]

test('every pack ref parses and resolves to a real chapter and verse', () => {
  for (const { src, ref } of allRefs) {
    const r = parseLooseRef(ref)
    expect(r, `${src}: "${ref}" did not parse`).not.toBeNull()
    expect(store.chapters.has(`${r!.b} ${r!.c}`), `${src}: "${ref}" chapter missing`).toBe(true)
    expect(store.byKey.has(refKey(r!.b, r!.c, r!.v)), `${src}: "${ref}" verse missing`).toBe(true)
  }
})
