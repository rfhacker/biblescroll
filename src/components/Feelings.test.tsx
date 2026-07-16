import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { Feelings } from './Feelings'
import { buildStore } from '../content/verseStore'
import feelings from '../content/feelings.json'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

beforeEach(() => localStorage.clear())

test('picker shows prompt and 16 chips; button disabled until a selection', async () => {
  render(<Feelings verses={store} onClose={() => {}} />)
  expect(screen.getByText(/whatever you're carrying/i)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(16)
  const go = screen.getByRole('button', { name: /show me verses/i })
  expect(go).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Anxious' }))
  expect(go).toBeEnabled()
})

test('selecting a feeling yields intro card, its verses, and the closing card', async () => {
  render(<Feelings verses={store} onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: 'Anxious' }))
  await userEvent.click(screen.getByRole('button', { name: /show me verses/i }))
  const anxious = (feelings as { id: string; intro: string; refs: unknown[] }[]).find((f) => f.id === 'anxious')!
  expect(screen.getByText(anxious.intro)).toBeInTheDocument()
  const cards = document.querySelectorAll('.card')
  expect(cards.length).toBe(anxious.refs.length + 2) // intro + verses + closing
  expect(screen.getByText(/may these stay with you/i)).toBeInTheDocument()
})

test('multi-select dedupes overlapping refs, absorbs contained ranges, and Back returns to the picker', async () => {
  render(<Feelings verses={store} onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: 'Sad' }))
  await userEvent.click(screen.getByRole('button', { name: 'Grieving' }))
  await userEvent.click(screen.getByRole('button', { name: /show me verses/i }))
  const refs = document.querySelectorAll('.verse-ref-btn')
  const labels = [...refs].map((r) => r.textContent)
  expect(new Set(labels).size).toBe(labels.length) // deduped

  // Derive the expected surviving refs from feelings.json itself: exact-tuple
  // union, then containment absorption (drop spans fully inside a wider kept span).
  type FeelingsJson = { id: string; refs: [string, number, number, number?][] }[]
  const all = feelings as unknown as FeelingsJson
  const chosen = all.filter((f) => f.id === 'sad' || f.id === 'grieving')
  const seen = new Set<string>()
  const union: [string, number, number, number?][] = []
  for (const f of chosen) for (const r of f.refs) {
    const k = r.join(':')
    if (!seen.has(k)) { seen.add(k); union.push(r) }
  }
  const expectedRefs = union.filter((r) => !union.some((o) => {
    if (o === r || o[0] !== r[0] || o[1] !== r[1]) return false
    const oEnd = o[3] ?? o[2]
    const rEnd = r[3] ?? r[2]
    const contained = o[2] <= r[2] && oEnd >= rEnd
    const identical = o[2] === r[2] && oEnd === rEnd
    return contained && !identical
  }))

  const cards = document.querySelectorAll('.card')
  expect(cards.length).toBe(expectedRefs.length + 2) // intro + surviving verses + closing

  // JHN 11:35 is fully contained in JHN 11:32-35 (from Grieving) and must be absorbed.
  expect(labels).not.toContain('John 11:35 — WEB ›')
  expect(labels).toContain('John 11:32–35 — WEB ›')

  // LAM 3:22-23 (Sad) is fully contained in LAM 3:22-24 (Grieving) and must be absorbed.
  expect(labels).not.toContain('Lamentations 3:22–23 — WEB ›')
  expect(labels).toContain('Lamentations 3:22–24 — WEB ›')

  await userEvent.click(screen.getByRole('button', { name: /back to feelings/i }))
  expect(screen.getByText(/whatever you're carrying/i)).toBeInTheDocument()
})

test('feelings selections are never persisted', async () => {
  render(<Feelings verses={store} onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: 'Depressed' }))
  await userEvent.click(screen.getByRole('button', { name: /show me verses/i }))
  const keys = Object.keys(localStorage).filter((k) => k !== 'bs:seed')
  expect(keys.filter((k) => /feel/i.test(k))).toEqual([])
})
