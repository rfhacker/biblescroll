import { readFileSync } from 'node:fs'
import { buildStore, refKey, refLabel, refText, chapterOf, prevChapter, nextChapter, parseRefLabel } from './verseStore'

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

test('chapterOf returns a full chapter in verse order', () => {
  const ch = chapterOf(store, 'PSA', 117)
  expect(ch).toHaveLength(2)
  expect(ch[0].v).toBe(1)
  expect(ch[1].text).toMatch(/faithfulness/i)
  expect(chapterOf(store, 'ZZZ', 1)).toEqual([])
  expect(chapterOf(store, 'GEN', 999)).toEqual([])
})

test('chapterOf skips omitted variant verses without error', () => {
  const acts8 = chapterOf(store, 'ACT', 8)
  const nums = acts8.map((x) => x.v)
  expect(nums).toContain(36)
  expect(nums).toContain(38)
  expect(nums).not.toContain(37)
})

test('prev/next chapter walk within and across books and clamp at canon edges', () => {
  expect(nextChapter(store, 'GEN', 1)).toEqual({ b: 'GEN', c: 2 })
  expect(nextChapter(store, 'GEN', 50)).toEqual({ b: 'EXO', c: 1 })
  expect(prevChapter(store, 'EXO', 1)).toEqual({ b: 'GEN', c: 50 })
  expect(prevChapter(store, 'GEN', 1)).toBeNull()
  expect(nextChapter(store, 'REV', 22)).toBeNull()
})

test('parseRefLabel inverts refLabel for singles, ranges, and numbered books', () => {
  expect(parseRefLabel('John 3:16')).toEqual({ b: 'JHN', c: 3, v: 16 })
  expect(parseRefLabel('Psalms 23:1–6')).toEqual({ b: 'PSA', c: 23, v: 1 })
  expect(parseRefLabel('1 John 3:16')).toEqual({ b: '1JN', c: 3, v: 16 })
  expect(parseRefLabel('Song of Solomon 2:1')).toEqual({ b: 'SNG', c: 2, v: 1 })
  expect(parseRefLabel('Nonsense')).toBeNull()
  expect(parseRefLabel('Atlantis 3:16')).toBeNull()
})
