export type Ref = [b: string, c: number, v: number, end?: number]
export type CrossRefEntry = [c: number, v: number, refs: Ref[]]

// Returns the refs for an exact-verse lookup
export function crossRefsFor(entries: CrossRefEntry[], c: number, v: number): Ref[] | null {
  for (const e of entries) {
    if (e[0] === c && e[1] === v) {
      return e[2]
    }
  }
  return null
}

const cache = new Map<string, CrossRefEntry[]>()
const inflight = new Map<string, Promise<CrossRefEntry[]>>()

export async function loadCrossRefs(book: string): Promise<CrossRefEntry[]> {
  const hit = cache.get(book)
  if (hit) return hit
  const pending = inflight.get(book)
  if (pending) return pending
  const promise = (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}crossrefs/${book}.json`)
    if (!res.ok) throw new Error(`crossrefs ${book}: HTTP ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error(`crossrefs ${book}: malformed`)
    cache.set(book, data as CrossRefEntry[])
    return data as CrossRefEntry[]
  })()
  inflight.set(book, promise)
  promise.then(
    () => inflight.delete(book),
    () => inflight.delete(book),
  )
  return promise
}

export function prefetchCrossRefs(book: string): void {
  loadCrossRefs(book).catch(() => {})
}
