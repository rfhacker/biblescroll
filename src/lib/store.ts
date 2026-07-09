import type { Favorite, CardKind } from '../content/types'

const mem = new Map<string, string>()
function read(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return mem.get(key) ?? null }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { mem.set(key, value) }
}
function readJSON<T>(key: string, ok: (v: unknown) => boolean): T | null {
  const raw = read(key)
  if (raw == null) return null
  try {
    const v = JSON.parse(raw)
    return ok(v) ? (v as T) : null
  } catch { return null }
}

export function getFavorites(): Favorite[] {
  return readJSON<Favorite[]>('bs:favorites', (v) => Array.isArray(v)) ?? []
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
