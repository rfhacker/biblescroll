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

test('multi-select dedupes overlapping refs and Back returns to the picker', async () => {
  render(<Feelings verses={store} onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: 'Sad' }))
  await userEvent.click(screen.getByRole('button', { name: 'Grieving' }))
  await userEvent.click(screen.getByRole('button', { name: /show me verses/i }))
  const refs = document.querySelectorAll('.verse-ref-btn')
  const labels = [...refs].map((r) => r.textContent)
  expect(new Set(labels).size).toBe(labels.length) // deduped
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
