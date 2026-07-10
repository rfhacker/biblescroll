// src/content/trivia.test.ts
import trivia from './trivia.json'
import type { TriviaItem } from './types'

const items = trivia as TriviaItem[]

test('at least 150 valid trivia items', () => {
  expect(items.length).toBeGreaterThanOrEqual(150)
  const ids = new Set(items.map((t) => t.id))
  expect(ids.size).toBe(items.length)
  for (const t of items) {
    expect(t.q.length).toBeGreaterThan(10)
    expect(t.choices.length).toBeGreaterThanOrEqual(3)
    expect(t.choices.length).toBeLessThanOrEqual(4)
    expect(t.answer).toBeGreaterThanOrEqual(0)
    expect(t.answer).toBeLessThan(t.choices.length)
    expect(new Set(t.choices).size).toBe(t.choices.length)
    expect(t.why.length).toBeGreaterThan(20)
    expect(t.ref.length).toBeGreaterThan(3)
    expect(['easy', 'medium', 'hard']).toContain(t.difficulty)
  }
})

test('difficulty mix is reasonable', () => {
  const count = (d: string) => items.filter((t) => t.difficulty === d).length
  expect(count('easy')).toBeGreaterThanOrEqual(40)
  expect(count('medium')).toBeGreaterThanOrEqual(40)
  expect(count('hard')).toBeGreaterThanOrEqual(15)
})
