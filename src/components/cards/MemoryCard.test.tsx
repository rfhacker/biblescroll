import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildPuzzle, DISTRACTOR_TEXTS } from '../../lib/memory'
import { vi } from 'vitest'

const TEXT = 'The Lord is my shepherd: I shall lack nothing.'
const LABEL = 'Psalms 23:1'

// The card derives its puzzle from (text, seed); tests derive the same
// puzzle to know which chips are answers vs distractors.
function expectedPuzzle(seed: string) {
  return buildPuzzle(TEXT, DISTRACTOR_TEXTS, seed)
}

beforeEach(() => { localStorage.clear(); vi.resetModules() })

async function freshCard(seed = 'ms1') {
  const { MemoryCard } = await import('./MemoryCard')
  const storeLib = await import('../../lib/store')
  const onScore = vi.fn()
  render(<MemoryCard text={TEXT} label={LABEL} seed={seed} theme={0} onScore={onScore} />)
  return { onScore, storeLib }
}

test('renders blanks and a word bank; correct taps fill in order', async () => {
  const { storeLib } = await freshCard()
  const p = expectedPuzzle('ms1')
  expect(screen.getAllByText('______')).toHaveLength(p.blankIndexes.length)
  for (const a of p.answers) {
    await userEvent.click(screen.getByRole('button', { name: a }))
  }
  expect(screen.getByText(/hidden in your heart/i)).toBeInTheDocument()
  expect(storeLib.getScore()).toBe(1) // perfect fill
})

test('wrong chip stays, marks mistake, and prevents the perfect point', async () => {
  const { onScore, storeLib } = await freshCard()
  const p = expectedPuzzle('ms1')
  const wrong = p.bank.find((w) => !p.answers.includes(w))!
  await userEvent.click(screen.getByRole('button', { name: wrong }))
  expect(screen.getByRole('button', { name: wrong })).toBeInTheDocument() // stays
  for (const a of p.answers) await userEvent.click(screen.getByRole('button', { name: a }))
  expect(screen.getByText(/hidden in your heart/i)).toBeInTheDocument()
  expect(storeLib.getScore()).toBe(0)
  expect(onScore).not.toHaveBeenCalled()
})

test('completed card remounts completed and never re-awards', async () => {
  const { storeLib } = await freshCard()
  const p = expectedPuzzle('ms1')
  for (const a of p.answers) await userEvent.click(screen.getByRole('button', { name: a }))
  expect(storeLib.getScore()).toBe(1)
  const { cleanup } = await import('@testing-library/react')
  cleanup()
  const { MemoryCard } = await import('./MemoryCard')
  render(<MemoryCard text={TEXT} label={LABEL} seed="ms1" theme={0} onScore={() => {}} />)
  expect(screen.getByText(/hidden in your heart/i)).toBeInTheDocument()
  expect(screen.queryByText('______')).toBeNull()
  expect(storeLib.getScore()).toBe(1) // unchanged
})
