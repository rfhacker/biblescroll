export type CommentaryEntry = [c: number, vStart: number, vEnd: number, text: string]
export type CommentarySource = 'mhcc' | 'jfb'

export const SOURCE_NAMES: Record<CommentarySource, string> = {
  mhcc: 'Matthew Henry',
  jfb: 'Jamieson-Fausset-Brown',
}

export function commentaryFor(entries: CommentaryEntry[], c: number, v: number): CommentaryEntry | null {
  for (const e of entries) {
    if (e[0] === c && e[1] <= v && v <= e[2]) return e
  }
  return null
}

const cache = new Map<string, CommentaryEntry[]>()
const inflight = new Map<string, Promise<CommentaryEntry[]>>()

export async function loadCommentary(source: CommentarySource, book: string): Promise<CommentaryEntry[]> {
  const key = `${source}:${book}`
  const hit = cache.get(key)
  if (hit) return hit
  const pending = inflight.get(key)
  if (pending) return pending
  const promise = (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}commentary/${source}/${book}.json`)
    if (!res.ok) throw new Error(`commentary ${key}: HTTP ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error(`commentary ${key}: malformed`)
    cache.set(key, data as CommentaryEntry[])
    return data as CommentaryEntry[]
  })()
  inflight.set(key, promise)
  promise.then(
    () => inflight.delete(key),
    () => inflight.delete(key),
  )
  return promise
}

export function prefetchCommentary(source: CommentarySource, book: string): void {
  loadCommentary(source, book).catch(() => {})
}
