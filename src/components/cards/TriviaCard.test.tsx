// src/components/cards/TriviaCard.test.tsx
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

const item = {
  id: 't001', q: 'How many stones did David take?', choices: ['Three', 'Five', 'Seven'],
  answer: 1, why: 'He chose five smooth stones from the brook.', ref: '1 Samuel 17:40',
  difficulty: 'easy' as const,
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

afterEach(() => {
  cleanup()
})

test('correct answer scores a point and reveals explanation', async () => {
  const { getScore } = await import('../../lib/store')
  const { TriviaCard } = await import('./TriviaCard')
  const onScore = vi.fn()
  render(<TriviaCard item={item} theme={0} onScore={onScore} />)
  expect(screen.queryByText(/smooth stones/)).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Five' }))
  expect(getScore()).toBe(1)
  expect(onScore).toHaveBeenCalledTimes(1)
  expect(screen.getByText(/smooth stones/)).toBeInTheDocument()
  expect(screen.getByText(/1 Samuel 17:40/)).toBeInTheDocument()
})

test('wrong answer reveals correct one, no point, no double answering', async () => {
  const { getScore } = await import('../../lib/store')
  const { TriviaCard } = await import('./TriviaCard')
  const onScore = vi.fn()
  render(<TriviaCard item={item} theme={0} onScore={onScore} />)
  await userEvent.click(screen.getByRole('button', { name: 'Three' }))
  expect(getScore()).toBe(0)
  expect(onScore).not.toHaveBeenCalled()
  expect(screen.getByText(/smooth stones/)).toBeInTheDocument()
  // once answered, the correct choice is marked with a ✓ prefix (not color-only)
  await userEvent.click(screen.getByRole('button', { name: /Five/ }))
  expect(getScore()).toBe(0) // locked after first answer
})

test('answered pick persists across remount: locked and no re-scoring', async () => {
  const { getScore } = await import('../../lib/store')
  const { TriviaCard } = await import('./TriviaCard')
  const onScore = vi.fn()
  const { unmount } = render(<TriviaCard item={item} theme={0} onScore={onScore} />)
  await userEvent.click(screen.getByRole('button', { name: 'Five' }))
  expect(getScore()).toBe(1)
  expect(onScore).toHaveBeenCalledTimes(1)
  unmount()

  // Fresh mount of the same item, sharing the same (already-reset) store instance.
  const onScore2 = vi.fn()
  render(<TriviaCard item={item} theme={0} onScore={onScore2} />)
  expect(screen.getByText(/smooth stones/)).toBeInTheDocument()
  expect(screen.getByText(/1 Samuel 17:40/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Three' }))
  expect(onScore2).not.toHaveBeenCalled()
  expect(getScore()).toBe(1) // unchanged, no re-scoring
})

test('a wrong answer does NOT persist: remounted card is answerable again, and scores exactly once when then answered correctly', async () => {
  const { getScore } = await import('../../lib/store')
  const { TriviaCard } = await import('./TriviaCard')
  const onScore = vi.fn()
  const { unmount } = render(<TriviaCard item={item} theme={0} onScore={onScore} />)
  await userEvent.click(screen.getByRole('button', { name: 'Three' })) // wrong
  expect(getScore()).toBe(0)
  expect(onScore).not.toHaveBeenCalled()
  unmount()

  // Fresh mount: the wrong pick was never persisted, so the question is unanswered again.
  const onScore2 = vi.fn()
  render(<TriviaCard item={item} theme={0} onScore={onScore2} />)
  expect(screen.queryByText(/smooth stones/)).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Five' })) // correct, this time
  expect(getScore()).toBe(1)
  expect(onScore2).toHaveBeenCalledTimes(1)
})

