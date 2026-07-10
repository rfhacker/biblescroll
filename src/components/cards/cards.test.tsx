import { vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VerseCard } from './VerseCard'
import { FactCard } from './FactCard'
import { getFavorites, toggleFavorite } from '../../lib/store'

beforeEach(() => localStorage.clear())

test('VerseCard shows text, reference, and WEB attribution', () => {
  render(<VerseCard text="For God so loved the world…" label="John 3:16" theme={0} />)
  expect(screen.getByText(/God so loved/)).toBeInTheDocument()
  expect(screen.getByText(/John 3:16/)).toBeInTheDocument()
  expect(screen.getByText(/WEB/)).toBeInTheDocument()
})

test('VerseCard shows VOTD badge only when votd', () => {
  const { rerender } = render(<VerseCard text="t" label="l" votd theme={0} />)
  expect(screen.getByText(/Verse of the Day/i)).toBeInTheDocument()
  rerender(<VerseCard text="t" label="l" theme={0} />)
  expect(screen.queryByText(/Verse of the Day/i)).toBeNull()
})

test('long verse text is collapsed behind Read more', async () => {
  const full = 'word '.repeat(120).trimEnd() + ' tailmarker'
  const { container } = render(<VerseCard text={full} label="Psalms 119:1" theme={1} />)
  await userEvent.click(screen.getByRole('button', { name: /read more/i }))
  expect(screen.queryByRole('button', { name: /read more/i })).toBeNull()
  expect(screen.getByText(/tailmarker/)).toBeInTheDocument()
  expect(container.querySelector('.verse-text')?.textContent).toBe(full)
})

test('collapsed verse text never cuts a word mid-way', () => {
  const full = 'word '.repeat(120).trimEnd()
  render(<VerseCard text={full} label="Psalms 119:1" theme={1} />)
  const shown = screen.getByText(/word/).textContent ?? ''
  expect(shown.endsWith('…')).toBe(true)
  const withoutEllipsis = shown.slice(0, -1)
  expect(withoutEllipsis.endsWith(' ')).toBe(false)
  expect(full.startsWith(withoutEllipsis)).toBe(true)
  const nextChar = full[withoutEllipsis.length]
  expect(nextChar === ' ' || nextChar === undefined).toBe(true)
})

test('heart button saves a favorite', async () => {
  render(<VerseCard text="abc" label="Genesis 1:1" theme={0} />)
  await userEvent.click(screen.getByRole('button', { name: /save/i }))
  expect(getFavorites()).toHaveLength(1)
  expect(getFavorites()[0]).toMatchObject({ kind: 'verse', id: 'Genesis 1:1' })
})

test('FactCard renders title, body, ref', () => {
  render(<FactCard theme={2} fact={{ id: 'f001', title: 'A title here', body: 'Body text long enough to be a fact body for sure.', ref: 'John 11:35' }} />)
  expect(screen.getByText('A title here')).toBeInTheDocument()
  expect(screen.getByText(/John 11:35/)).toBeInTheDocument()
})

test('Share uses navigator.share when available', async () => {
  const shareMock = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true })
  try {
    render(<VerseCard text="For God so loved the world" label="John 3:16" theme={0} />)
    await userEvent.click(screen.getByRole('button', { name: /share/i }))
    expect(shareMock).toHaveBeenCalledTimes(1)
    const arg = shareMock.mock.calls[0][0]
    expect(arg.text).toContain('John 3:16')
  } finally {
    delete (navigator as { share?: unknown }).share
  }
})

test('Share falls back to clipboard and shows Copied! when navigator.share is unavailable', async () => {
  delete (navigator as { share?: unknown }).share
  const writeTextMock = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeTextMock }, configurable: true })
  try {
    render(<VerseCard text="For God so loved the world" label="John 3:16" theme={0} />)
    await userEvent.click(screen.getByRole('button', { name: /share/i }))
    expect(writeTextMock).toHaveBeenCalledTimes(1)
    expect(writeTextMock.mock.calls[0][0]).toContain('John 3:16')
    expect(await screen.findByText('Copied!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
  } finally {
    delete (navigator as { clipboard?: unknown }).clipboard
  }
})

test('heart stays in sync when a favorite is removed elsewhere', async () => {
  const fav = { kind: 'verse' as const, id: 'Numbers 1:1', title: 'Numbers 1:1', body: 'xyz' }
  render(<VerseCard text="xyz" label="Numbers 1:1" theme={0} />)
  await userEvent.click(screen.getByRole('button', { name: /save/i }))
  expect(screen.getByRole('button', { name: /unsave/i })).toBeInTheDocument()

  act(() => { toggleFavorite(fav) })

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
  })
})
