import { readFileSync } from 'node:fs'
import { buildStore, parseLooseRef, refKey } from './verseStore'
import words from './words.json'

interface StrongsEntry { lemma: string; translit: string; definition: string }
const hebrew = JSON.parse(readFileSync('data/strongs/hebrew.json', 'utf8')) as Record<string, StrongsEntry>
const greek = JSON.parse(readFileSync('data/strongs/greek.json', 'utf8')) as Record<string, StrongsEntry>
const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

interface WD { id: string; strongs: string; word: string; translit: string; language: string; gloss: string; body: string; refs: string[] }
const WDP = words as WD[]

test('words: 48+, unique ids, valid shapes', () => {
  expect(WDP.length).toBeGreaterThanOrEqual(48)
  expect(new Set(WDP.map((w) => w.id)).size).toBe(WDP.length)
  for (const w of WDP) {
    expect(w.id).toMatch(/^wd\d{3}$/)
    expect(['Hebrew', 'Greek', 'Aramaic']).toContain(w.language)
    expect(w.gloss.length).toBeGreaterThanOrEqual(10)
    expect(w.gloss.length).toBeLessThanOrEqual(60)
    expect(w.body.length).toBeGreaterThanOrEqual(80)
    expect(w.body.length).toBeLessThanOrEqual(400)
    expect(w.body.includes("'"), `${w.id} straight apostrophe`).toBe(false)
    expect(w.refs.length).toBeGreaterThanOrEqual(1)
    expect(w.refs.length).toBeLessThanOrEqual(3)
  }
})

test('words: every strongs number exists and word byte-equals the dictionary lemma', () => {
  for (const w of WDP) {
    const dict = w.strongs.startsWith('H') ? hebrew : greek
    const entry = dict[w.strongs]
    expect(entry, `${w.id}: ${w.strongs} not in dictionary`).toBeDefined()
    expect(w.word, `${w.id}: word differs from dictionary lemma`).toBe(entry.lemma)
    expect(w.strongs).toMatch(/^[HG]\d{1,4}$/)
    if (w.language === 'Greek') expect(w.strongs.startsWith('G')).toBe(true)
    else expect(w.strongs.startsWith('H')).toBe(true)
  }
})

test('words: original script matches language (Aramaic uses Hebrew script)', () => {
  for (const w of WDP) {
    const hasHebrew = /[֐-׿]/.test(w.word)
    const hasGreek = /[Ͱ-Ͽἀ-῿]/.test(w.word)
    expect(w.language === 'Greek' ? hasGreek : hasHebrew, `${w.id} script/language mismatch`).toBe(true)
  }
})

test('words: refs parse and resolve; language halves balanced', () => {
  for (const w of WDP) for (const ref of w.refs) {
    const r = parseLooseRef(ref)
    expect(r, `${w.id}: "${ref}" did not parse`).not.toBeNull()
    expect(store.byKey.has(refKey(r!.b, r!.c, r!.v)), `${w.id}: "${ref}" missing`).toBe(true)
  }
  const heb = WDP.filter((w) => w.language !== 'Greek').length
  expect(heb).toBeGreaterThanOrEqual(18)
  expect(WDP.length - heb).toBeGreaterThanOrEqual(18)
})
