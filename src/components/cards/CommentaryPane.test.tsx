import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommentaryPane } from './CommentaryPane'
import { describe, it, test, expect, beforeEach, vi } from 'vitest'

const ENTRIES = [[3, 14, 18, 'For God so loved the world — herein is love indeed.\n\nSecond paragraph.']]

function mockFetchOk() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(ENTRIES), { status: 200 }),
    )
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

test('inactive pane fetches and renders nothing', () => {
  const spy = mockFetchOk()
  render(<CommentaryPane book="JHN" c={3} v={16} active={false} />)
  expect(spy).not.toHaveBeenCalled()
  expect(screen.queryByText(/Matthew Henry/)).toBeNull()
})

// NOTE: loadCommentary's module-level cache persists across tests in this file —
// every test uses a DIFFERENT book so cached entries can't leak between tests.

test('active pane loads and shows source, covered range, and paragraphs', async () => {
  mockFetchOk()
  render(<CommentaryPane book="JHN" c={3} v={16} active={true} />)
  // Default source is the unabridged Henry (Full).
  await waitFor(() => expect(screen.getByText(/Matthew Henry \(Complete\) · John 3:14–18/)).toBeInTheDocument())
  expect(screen.getByText('Bible Commentary')).toBeInTheDocument()
  expect(screen.getByText(/herein is love indeed/)).toBeInTheDocument()
  expect(screen.getByText(/Second paragraph/)).toBeInTheDocument()
})

test('three toggle chips render with aria-pressed reflecting the selected source', async () => {
  mockFetchOk()
  render(<CommentaryPane book="1CH" c={3} v={16} active={true} />)
  await waitFor(() => screen.getByText(/Matthew Henry \(Complete\)/))
  const concise = screen.getByRole('button', { name: 'Concise' })
  const full = screen.getByRole('button', { name: 'Full' })
  const jfb = screen.getByRole('button', { name: 'JFB' })
  expect(full).toHaveAttribute('aria-pressed', 'true')
  expect(concise).toHaveAttribute('aria-pressed', 'false')
  expect(jfb).toHaveAttribute('aria-pressed', 'false')
  // Chip order: Full, then Concise, then JFB.
  const chips = screen.getAllByRole('button').map((b) => b.textContent)
  expect(chips.slice(0, 3)).toEqual(['Full', 'Concise', 'JFB'])
})

test('toggle switches source, persists, and refetches', async () => {
  const spy = mockFetchOk()
  render(<CommentaryPane book="GEN" c={3} v={16} active={true} />)
  await waitFor(() => screen.getByText(/Matthew Henry \(Complete\) · Genesis/))
  await userEvent.click(screen.getByRole('button', { name: 'JFB' }))
  await waitFor(() => expect(screen.getByText(/Jamieson-Fausset-Brown/)).toBeInTheDocument())
  expect(spy.mock.calls.some(([url]) => String(url).includes('/jfb/'))).toBe(true)
  const { getCommentarySource } = await import('../../lib/store')
  expect(getCommentarySource()).toBe('jfb')
})

test('selecting Full loads mhc and shows the Matthew Henry (Complete) header', async () => {
  const { setCommentarySource } = await import('../../lib/store')
  setCommentarySource('mhcc')
  const spy = mockFetchOk()
  render(<CommentaryPane book="2CH" c={3} v={16} active={true} />)
  await waitFor(() => screen.getByText(/Matthew Henry \(Concise\) · 2 Chronicles/))
  await userEvent.click(screen.getByRole('button', { name: 'Full' }))
  await waitFor(() => expect(screen.getByText(/Matthew Henry \(Complete\) · 2 Chronicles/)).toBeInTheDocument())
  expect(spy.mock.calls.some(([url]) => String(url).includes('/mhc/'))).toBe(true)
  const { getCommentarySource } = await import('../../lib/store')
  expect(getCommentarySource()).toBe('mhc')
})

test('gap in JFB offers the Concise switch', async () => {
  const { setCommentarySource } = await import('../../lib/store')
  setCommentarySource('jfb')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify([[99, 1, 2, 'elsewhere']]), { status: 200 }),
  )
  render(<CommentaryPane book="PSA" c={3} v={16} active={true} />)
  await waitFor(() => expect(screen.getByText(/Jamieson-Fausset-Brown doesn't comment on this verse/)).toBeInTheDocument())
  expect(screen.getByRole('button', { name: /read Matthew Henry \(Concise\)/i })).toBeInTheDocument()
})

test('gap in mhc offers the Concise switch', async () => {
  const { setCommentarySource } = await import('../../lib/store')
  setCommentarySource('mhc')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify([[99, 1, 2, 'elsewhere']]), { status: 200 }),
  )
  render(<CommentaryPane book="OBA" c={3} v={16} active={true} />)
  await waitFor(() => expect(screen.getByText(/Matthew Henry \(Complete\) doesn't comment on this verse/)).toBeInTheDocument())
  expect(screen.getByRole('button', { name: /read Matthew Henry \(Concise\)/i })).toBeInTheDocument()
})

test('fetch failure on jfb shows the offline-tier message', async () => {
  const { setCommentarySource } = await import('../../lib/store')
  setCommentarySource('jfb')
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('failed to fetch'))
  render(<CommentaryPane book="ISA" c={3} v={16} active={true} />)
  await waitFor(() =>
    expect(screen.getByText(
      "Jamieson-Fausset-Brown for this book isn't downloaded yet — Matthew Henry (Concise) is always available offline.",
    )).toBeInTheDocument())
})

test('fetch failure on mhc shows the offline-tier message, exact copy', async () => {
  const { setCommentarySource } = await import('../../lib/store')
  setCommentarySource('mhc')
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('failed to fetch'))
  render(<CommentaryPane book="NAM" c={3} v={16} active={true} />)
  await waitFor(() =>
    expect(screen.getByText(
      "Matthew Henry (Complete) for this book isn't downloaded yet — Matthew Henry (Concise) is always available offline.",
    )).toBeInTheDocument())
  expect(screen.getByRole('button', { name: /read Matthew Henry \(Concise\)/i })).toBeInTheDocument()
})

test('retry on mhcc failure refetches and succeeds', async () => {
  const { setCommentarySource } = await import('../../lib/store')
  setCommentarySource('mhcc')
  const spy = vi.spyOn(globalThis, 'fetch')
  spy.mockRejectedValueOnce(new TypeError('failed to fetch'))
  spy.mockResolvedValueOnce(
    new Response(JSON.stringify([[3, 16, 16, 'after retry']]), { status: 200 }),
  )
  render(<CommentaryPane book="EXO" c={3} v={16} active={true} />)
  await waitFor(() => expect(screen.getByText(/Commentary couldn’t load\./)).toBeInTheDocument())
  const tryAgainBtn = screen.getByRole('button', { name: /Try again/i })
  await userEvent.click(tryAgainBtn)
  await screen.findByText(/after retry/)
})
