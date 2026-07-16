import type { VerseTuple, CuratedRef } from './types'
import { BOOKS } from './books'

export interface VerseStore {
  list: VerseTuple[]
  byKey: Map<string, number>
  chapters: Map<string, [number, number]>
  chapterOrder: string[]
}

export const refKey = (b: string, c: number, v: number) => `${b} ${c}:${v}`

export function buildStore(list: VerseTuple[]): VerseStore {
  const byKey = new Map<string, number>()
  const chapters = new Map<string, [number, number]>()
  const chapterOrder: string[] = []
  list.forEach((t, i) => {
    byKey.set(refKey(t[0], t[1], t[2]), i)
    const ck = `${t[0]} ${t[1]}`
    const span = chapters.get(ck)
    if (!span) {
      chapters.set(ck, [i, i])
      chapterOrder.push(ck)
    } else {
      span[1] = i
    }
  })
  return { list, byKey, chapters, chapterOrder }
}

export function refLabel([b, c, v, end]: CuratedRef): string {
  const name = BOOKS[b] ?? b
  return end && end !== v ? `${name} ${c}:${v}–${end}` : `${name} ${c}:${v}`
}

export function refText(store: VerseStore, [b, c, v, end]: CuratedRef): string {
  const parts: string[] = []
  for (let i = v; i <= (end ?? v); i++) {
    const idx = store.byKey.get(refKey(b, c, i))
    if (idx !== undefined) parts.push(store.list[idx][3])
  }
  return parts.join(' ')
}

export function chapterOf(store: VerseStore, b: string, c: number): { v: number; text: string }[] {
  const span = store.chapters.get(`${b} ${c}`)
  if (!span) return []
  return store.list.slice(span[0], span[1] + 1).map((t) => ({ v: t[2], text: t[3] }))
}

function chapterAt(store: VerseStore, b: string, c: number, offset: number) {
  const pos = store.chapterOrder.indexOf(`${b} ${c}`)
  if (pos < 0) return null
  const ck = store.chapterOrder[pos + offset]
  if (!ck) return null
  const sp = ck.lastIndexOf(' ')
  return { b: ck.slice(0, sp), c: Number(ck.slice(sp + 1)) }
}
export const prevChapter = (s: VerseStore, b: string, c: number) => chapterAt(s, b, c, -1)
export const nextChapter = (s: VerseStore, b: string, c: number) => chapterAt(s, b, c, +1)

export const NAME_TO_CODE = new Map(Object.entries(BOOKS).map(([code, name]) => [name, code]))

export function parseRefLabel(label: string): { b: string; c: number; v: number } | null {
  const m = label.match(/^(.+?) (\d+):(\d+)(?:–\d+)?$/)
  if (!m) return null
  const b = NAME_TO_CODE.get(m[1])
  if (!b) return null
  return { b, c: Number(m[2]), v: Number(m[3]) }
}

// Common book-name variants found in prose citations (packs use display names,
// but singular/alternate forms are natural when authoring).
const BOOK_ALIASES: Record<string, string> = {
  Psalm: 'PSA',
  'Song of Songs': 'SNG',
  Canticles: 'SNG',
}

// Forgiving parser for prose citations: "1 Samuel 17:40", "Acts 1:1-2",
// "Acts 10:44-48; 11:17-18", "Exodus 12:37-19:2", "Psalms 23:1–6".
// Returns the FIRST cited book/chapter/verse; null when unrecognizable.
export function parseLooseRef(ref: string): { b: string; c: number; v: number } | null {
  const first = ref.split(';')[0].trim()

  // Try to match book names (longest first to avoid partial matches)
  // Build array of [name, code] sorted by name length descending
  const bookNames = Array.from(NAME_TO_CODE.entries()).sort((a, b) => b[0].length - a[0].length)
  const aliases = Object.entries(BOOK_ALIASES).sort((a, b) => b[0].length - a[0].length)

  for (const [name, code] of [...bookNames, ...aliases]) {
    if (first.startsWith(name + ' ')) {
      const remainder = first.slice(name.length + 1).trim()
      const m = remainder.match(/^(\d+)(?::(\d+))?/)
      if (m) {
        return { b: code, c: Number(m[1]), v: m[2] ? Number(m[2]) : 1 }
      }
    }
  }

  return null
}

export async function loadVerses(baseUrl: string): Promise<VerseStore> {
  const res = await fetch(`${baseUrl}content/verses.json`)
  if (!res.ok) throw new Error(`verses fetch failed: ${res.status}`)
  return buildStore(await res.json())
}
