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

test('imperfect completion persists but never awards, even after remount', async () => {
  const { onScore, storeLib } = await freshCard()
  const p = expectedPuzzle('ms1')
  const wrong = p.bank.find((w) => !p.answers.includes(w))!
  await userEvent.click(screen.getByRole('button', { name: wrong }))
  for (const a of p.answers) await userEvent.click(screen.getByRole('button', { name: a }))
  expect(storeLib.getScore()).toBe(0)
  const { cleanup } = await import('@testing-library/react')
  cleanup()
  const { MemoryCard } = await import('./MemoryCard')
  render(<MemoryCard text={TEXT} label={LABEL} seed="ms1" theme={0} onScore={onScore} />)
  expect(screen.getByText(/hidden in your heart/i)).toBeInTheDocument() // completed state kept
  expect(storeLib.getScore()).toBe(0) // no late award
  expect(onScore).not.toHaveBeenCalled()
})

// This text+seed pair yields answers ['rejoice','rejoice'] and a bank with two
// identical 'rejoice' chips — removal must be by chip index, not by value.
const DUP_TEXT = 'Rejoice always, rejoice again; give thanks and rejoice evermore today.'

test('duplicate identical chips are consumed one at a time', async () => {
  const { MemoryCard } = await import('./MemoryCard')
  const dup = buildPuzzle(DUP_TEXT, DISTRACTOR_TEXTS, 'd9')
  expect(dup.answers).toEqual(['rejoice', 'rejoice']) // guard: pair still holds
  render(<MemoryCard text={DUP_TEXT} label="Philippians 4:4" seed="d9" theme={0} onScore={() => {}} />)
  expect(screen.getAllByRole('button', { name: 'rejoice' })).toHaveLength(2)
  await userEvent.click(screen.getAllByRole('button', { name: 'rejoice' })[0])
  expect(screen.getAllByRole('button', { name: 'rejoice' })).toHaveLength(1) // only one removed
  await userEvent.click(screen.getByRole('button', { name: 'rejoice' }))
  expect(screen.getByText(/hidden in your heart/i)).toBeInTheDocument()
})

// Smoke check for a long-ish (near the 280-char memory-pool cap) text: jsdom
// can't verify layout/overflow, but this guards against render-time crashes
// (e.g. puzzle building or blank-index math) on texts near the threshold.
const LONG_TEXT =
  "The Lord is my shepherd: I shall lack nothing. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul: he leadeth me in the paths of righteousness for his names sake. Yea though I walk through the valley of the shadow of death I will fear"

test('renders and shows bank buttons for a long (~270 char) verse', async () => {
  const { MemoryCard } = await import('./MemoryCard')
  const puzzle = buildPuzzle(LONG_TEXT, DISTRACTOR_TEXTS, 'long1')
  render(<MemoryCard text={LONG_TEXT} label="Psalms 23:1-4" seed="long1" theme={0} onScore={() => {}} />)
  expect(screen.getAllByText('______')).toHaveLength(puzzle.blankIndexes.length)
  expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
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
