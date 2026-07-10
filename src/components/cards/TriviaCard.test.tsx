// src/components/cards/TriviaCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { TriviaCard } from './TriviaCard'

const item = {
  id: 't001', q: 'How many stones did David take?', choices: ['Three', 'Five', 'Seven'],
  answer: 1, why: 'He chose five smooth stones from the brook.', ref: '1 Samuel 17:40',
  difficulty: 'easy' as const,
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

test('correct answer scores a point and reveals explanation', async () => {
  const { getScore } = await import('../../lib/store')
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
  const onScore = vi.fn()
  render(<TriviaCard item={item} theme={0} onScore={onScore} />)
  await userEvent.click(screen.getByRole('button', { name: 'Three' }))
  expect(getScore()).toBe(0)
  expect(onScore).not.toHaveBeenCalled()
  expect(screen.getByText(/smooth stones/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Five' }))
  expect(getScore()).toBe(0) // locked after first answer
})
