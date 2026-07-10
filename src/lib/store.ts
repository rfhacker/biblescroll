import type { Favorite, CardKind } from '../content/types'

// mem is a same-session mirror that always wins over storage; localStorage is only
// authoritative for values written in a previous session (i.e. not yet in mem).
const mem = new Map<string, string>()
function read(key: string): string | null {
  if (mem.has(key)) return mem.get(key) as string
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key: string, value: string): void {
  mem.set(key, value)
  try { localStorage.setItem(key, value) } catch { /* ignore: mem already has it */ }
}
function readJSON<T>(key: string, ok: (v: unknown) => boolean): T | null {
  const raw = read(key)
  if (raw == null) return null
  try {
    const v = JSON.parse(raw)
    return ok(v) ? (v as T) : null
  } catch { return null }
}

const FAVORITE_KINDS: CardKind[] = ['verse', 'trivia', 'fact', 'map']
function isFavoriteShape(v: unknown): v is Favorite {
  return typeof v === 'object' && v !== null &&
    FAVORITE_KINDS.includes((v as Favorite).kind) &&
    typeof (v as Favorite).id === 'string' &&
    typeof (v as Favorite).title === 'string' &&
    typeof (v as Favorite).body === 'string'
}
export function getFavorites(): Favorite[] {
  return readJSON<Favorite[]>('bs:favorites', (v) => Array.isArray(v) && v.every(isFavoriteShape)) ?? []
}
export function isFavorite(kind: CardKind, id: string): boolean {
  return getFavorites().some((f) => f.kind === kind && f.id === id)
}
export function toggleFavorite(f: Favorite): boolean {
  const favs = getFavorites()
  const idx = favs.findIndex((x) => x.kind === f.kind && x.id === f.id)
  if (idx >= 0) favs.splice(idx, 1)
  else favs.unshift(f)
  write('bs:favorites', JSON.stringify(favs))
  return idx < 0
}

export function getScore(): number {
  return readJSON<number>('bs:score', (v) => typeof v === 'number' && v >= 0) ?? 0
}
export function addScore(n: number): number {
  const s = getScore() + n
  write('bs:score', JSON.stringify(s))
  return s
}

export interface StreakState { count: number; last: string }
export function getStreakState(): StreakState | null {
  return readJSON<StreakState>('bs:streak', (v) =>
    typeof v === 'object' && v !== null &&
    typeof (v as StreakState).count === 'number' &&
    /^\d{4}-\d{2}-\d{2}$/.test((v as StreakState).last ?? ''))
}
export function setStreakState(s: StreakState): void {
  write('bs:streak', JSON.stringify(s))
}

export function getInstallSeed(): string {
  const existing = read('bs:seed')
  if (existing && /^[0-9a-f]{16}$/.test(existing)) return existing
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const seed = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  write('bs:seed', seed)
  return seed
}
