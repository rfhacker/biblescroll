import { readFileSync } from 'node:fs'
import { BOOKS } from './books'

type Tuple = [string, number, number, string]
const verses: Tuple[] = JSON.parse(readFileSync('public/content/verses.json', 'utf8'))

// 31103 <v> tags in the source XML, minus 5 empty textual variants
// (LUK 17:36, ACT 8:37, ACT 15:34, ACT 24:7, ROM 16:25) that are footnote-only in the WEB.
const EXPECTED_TOTAL = 31098

test('has 31098 verses across exactly the 66 books', () => {
  expect(verses.length).toBe(EXPECTED_TOTAL)
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
})

test('every verse has non-empty text', () => {
  for (const t of verses) expect(t[3].length).toBeGreaterThan(0)
})

test('verses are in canonical order: contiguous book runs, increasing chapter:verse', () => {
  // Walking the array, the book should change exactly 65 times (66 contiguous
  // book runs total) -- proof no verse is out of place by book.
  let bookTransitions = 0
  let prevBook: string | null = null
  let prevChapter = -1
  let prevVerse = -1
  const seenBooks = new Set<string>()

  for (const [book, chapter, verse] of verses) {
    if (book !== prevBook) {
      if (prevBook !== null) bookTransitions++
      expect(seenBooks.has(book)).toBe(false)
      seenBooks.add(book)
      prevBook = book
      prevChapter = -1
      prevVerse = -1
    } else {
      const increased = chapter > prevChapter || (chapter === prevChapter && verse > prevVerse)
      expect(increased).toBe(true)
    }
    prevChapter = chapter
    prevVerse = verse
  }

  expect(bookTransitions).toBe(65)
  expect(seenBooks.size).toBe(66)
})
