import { readFileSync } from 'node:fs'
import { BOOKS } from './books'

type Tuple = [string, number, number, string]
const verses: Tuple[] = JSON.parse(readFileSync('public/content/verses.json', 'utf8'))

test('has 31103 verses across exactly the 66 books', () => {
  expect(verses.length).toBe(31103)
  const codes = new Set(verses.map((t) => t[0]))
  expect(codes.size).toBe(66)
  for (const c of codes) expect(BOOKS[c]).toBeTruthy()
})

test('spot checks', () => {
  const key = (t: Tuple) => `${t[0]} ${t[1]}:${t[2]}`
  const map = new Map(verses.map((t) => [key(t), t[3]]))
  expect(map.get('GEN 1:1')).toMatch(/In the beginning, God created/)
  expect(map.get('JHN 3:16')).toMatch(/God so loved the world/)
  expect(map.get('PSA 23:1')).toMatch(/shepherd/i)
  const nonEmpty = verses.filter((t) => t[3].length > 0)
  expect(nonEmpty.length).toBe(31098)
})
