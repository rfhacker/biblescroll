import type { Favorite, CardKind } from '../content/types'
import type { CommentarySource } from './commentary'

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

const FAVORITE_KINDS: CardKind[] = ['verse', 'trivia', 'fact', 'map', 'whosaid', 'continue', 'names']
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
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bs:favorites-changed'))
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

function isAnsweredShape(v: unknown): v is Record<string, number> {
  return typeof v === 'object' && v !== null &&
    Object.values(v as Record<string, unknown>).every((n) => typeof n === 'number')
}
export function getAnsweredPick(id: string): number | null {
  const answered = readJSON<Record<string, number>>('bs:answered', isAnsweredShape) ?? {}
  return id in answered ? answered[id] : null
}
export function setAnsweredPick(id: string, pick: number): void {
  const answered = readJSON<Record<string, number>>('bs:answered', isAnsweredShape) ?? {}
  answered[id] = pick
  write('bs:answered', JSON.stringify(answered))
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

export function getHasScrolled(): boolean {
  return read('bs:scrolled') != null
}
export function setHasScrolled(): void {
  write('bs:scrolled', '1')
}

export function getCommentarySource(): CommentarySource {
  const raw = read('bs:commentary')
  if (raw === '"jfb"' || raw === 'jfb') return 'jfb'
  if (raw === '"mhc"' || raw === 'mhc') return 'mhc'
  return 'mhcc'
}
export function setCommentarySource(s: CommentarySource): void {
  write('bs:commentary', s)
}

export function isMemorized(id: string): boolean {
  const rec = readJSON<Record<string, number>>('bs:memorized', (v) =>
    typeof v === 'object' && v !== null && !Array.isArray(v) &&
    Object.values(v as Record<string, unknown>).every((x) => typeof x === 'number'))
  return !!rec?.[id]
}
export function setMemorized(id: string): void {
  const rec = readJSON<Record<string, number>>('bs:memorized', (v) =>
    typeof v === 'object' && v !== null && !Array.isArray(v)) ?? {}
  rec[id] = 1
  write('bs:memorized', JSON.stringify(rec))
}
