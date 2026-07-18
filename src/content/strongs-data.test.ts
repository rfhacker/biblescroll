import { readFileSync } from 'node:fs'

interface StrongsEntry { lemma: string; translit: string; definition: string }
const hebrew = JSON.parse(readFileSync('data/strongs/hebrew.json', 'utf8')) as Record<string, StrongsEntry>
const greek = JSON.parse(readFileSync('data/strongs/greek.json', 'utf8')) as Record<string, StrongsEntry>

test('strongs hebrew: id format, count, non-empty lemmas in Hebrew script', () => {
  const keys = Object.keys(hebrew)
  expect(keys.length).toBeGreaterThan(8000)
  for (const k of keys) expect(k).toMatch(/^H\d{1,4}$/)
  expect(hebrew.H2617.lemma.length).toBeGreaterThan(0)
  expect(/[֐-׿]/.test(hebrew.H2617.lemma)).toBe(true) // chesed
  expect(hebrew.H7965.lemma.length).toBeGreaterThan(0)          // shalom
})

test('strongs greek: id format, count, non-empty lemmas in Greek script', () => {
  const keys = Object.keys(greek)
  expect(keys.length).toBeGreaterThan(5000)
  for (const k of keys) expect(k).toMatch(/^G\d{1,4}$/)
  expect(/[Ͱ-Ͽἀ-῿]/.test(greek.G26.lemma)).toBe(true)  // agape
  expect(/[Ͱ-Ͽἀ-῿]/.test(greek.G3056.lemma)).toBe(true) // logos
})

test('strongs entries carry translit and definition', () => {
  for (const e of [hebrew.H2617, hebrew.H7965, greek.G26, greek.G3056, greek.G5485]) {
    expect(e.translit.length).toBeGreaterThan(0)
    expect(e.definition.length).toBeGreaterThan(0)
  }
})
