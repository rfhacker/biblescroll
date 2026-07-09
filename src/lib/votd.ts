import { hashString } from './rng'

export function dayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function votdIndex(day: string, curatedCount: number): number {
  return hashString(`votd:${day}`) % curatedCount
}
