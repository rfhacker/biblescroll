import type { StreakState } from './store'

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
}

export function updateStreak(prev: StreakState | null, today: string): StreakState {
  if (!prev) return { count: 1, last: today }
  const gap = daysBetween(prev.last, today)
  if (gap === 0) return prev
  if (gap === 1) return { count: prev.count + 1, last: today }
  return { count: 1, last: today }
}

export function scoreTitle(n: number): string {
  if (n >= 150) return 'Berean'
  if (n >= 50) return 'Scholar'
  if (n >= 10) return 'Student'
  return 'Seeker'
}
