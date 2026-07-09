import type { VerseTuple, CuratedRef } from './types'
import { BOOKS } from './books'

export interface VerseStore { list: VerseTuple[]; byKey: Map<string, number> }

export const refKey = (b: string, c: number, v: number) => `${b} ${c}:${v}`

export function buildStore(list: VerseTuple[]): VerseStore {
  const byKey = new Map<string, number>()
  list.forEach((t, i) => byKey.set(refKey(t[0], t[1], t[2]), i))
  return { list, byKey }
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

export async function loadVerses(baseUrl: string): Promise<VerseStore> {
  const res = await fetch(`${baseUrl}content/verses.json`)
  if (!res.ok) throw new Error(`verses fetch failed: ${res.status}`)
  return buildStore(await res.json())
}
