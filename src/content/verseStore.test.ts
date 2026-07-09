import { readFileSync } from 'node:fs'
import { buildStore, refKey, refLabel, refText } from './verseStore'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

test('refKey and byKey lookup', () => {
  const i = store.byKey.get(refKey('JHN', 3, 16))!
  expect(store.list[i][3]).toMatch(/God so loved/)
})

test('refLabel formats single verses and ranges', () => {
  expect(refLabel(['JHN', 3, 16])).toBe('John 3:16')
  expect(refLabel(['PSA', 23, 1, 6])).toBe('Psalms 23:1–6')
})

test('refText joins a range', () => {
  const t = refText(store, ['PSA', 23, 1, 2])
  expect(t).toMatch(/shepherd/i)
  expect(t).toMatch(/green pastures/i)
})
