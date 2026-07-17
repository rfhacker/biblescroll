// src/components/cards/QuizCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import whosaid from '../../content/whosaid.json'
import cont from '../../content/continue.json'
import type { WhoSaidItem, ContinueItem } from '../../content/types'

const ws = (whosaid as WhoSaidItem[])[0]
const cv = (cont as ContinueItem[])[0]

beforeEach(() => { localStorage.clear(); vi.resetModules() })

test('WhoSaidCard: correct pick scores once ever; kicker and quote render', async () => {
  const { WhoSaidCard } = await import('./WhoSaidCard')
  const store = await import('../../lib/store')
  const onScore = vi.fn()
  render(<WhoSaidCard item={ws} theme={0} onScore={onScore} />)
  expect(screen.getByText('Who said it?')).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(ws.quote.slice(0, 20)))).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: ws.choices[ws.answer] }))
  expect(store.getScore()).toBe(1)
  expect(onScore).toHaveBeenCalledTimes(1)
  // remount: answered state persists, no re-award
  const { cleanup } = await import('@testing-library/react')
  cleanup()
  const { WhoSaidCard: W2 } = await import('./WhoSaidCard')
  render(<W2 item={ws} theme={0} onScore={onScore} />)
  expect(screen.getByText((c) => c.includes(ws.why.slice(0, 15)))).toBeInTheDocument()
  expect(store.getScore()).toBe(1)
})

test('WhoSaidCard: wrong pick locks the mount without persisting', async () => {
  const { WhoSaidCard } = await import('./WhoSaidCard')
  const store = await import('../../lib/store')
  const wrongIdx = ws.answer === 0 ? 1 : 0
  render(<WhoSaidCard item={ws} theme={0} onScore={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: ws.choices[wrongIdx] }))
  expect(store.getScore()).toBe(0)
  expect(store.getAnsweredPick(ws.id)).toBeNull()
  // locked: clicking the right answer now does nothing
  await userEvent.click(screen.getByRole('button', { name: `✓ ${ws.choices[ws.answer]}` }))
  expect(store.getScore()).toBe(0)
})

test('ContinueCard: renders stem with ellipsis and real endings; correct scores', async () => {
  const { ContinueCard } = await import('./ContinueCard')
  const store = await import('../../lib/store')
  render(<ContinueCard item={cv} theme={0} onScore={() => {}} />)
  expect(screen.getByText('Continue the verse')).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(cv.stem.slice(0, 20)))).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: cv.endings[cv.answer] }))
  expect(store.getScore()).toBe(1)
  expect(screen.getByText((c) => c.includes(cv.why.slice(0, 15)))).toBeInTheDocument()
})
