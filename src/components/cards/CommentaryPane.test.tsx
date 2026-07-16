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
  await waitFor(() => expect(screen.getByText(/Matthew Henry · John 3:14–18/)).toBeInTheDocument())
  expect(screen.getByText(/herein is love indeed/)).toBeInTheDocument()
  expect(screen.getByText(/Second paragraph/)).toBeInTheDocument()
})

test('toggle switches source, persists, and refetches', async () => {
  const spy = mockFetchOk()
  render(<CommentaryPane book="GEN" c={3} v={16} active={true} />)
  await waitFor(() => screen.getByText(/Matthew Henry · Genesis/))
  await userEvent.click(screen.getByRole('button', { name: 'JFB' }))
  await waitFor(() => expect(screen.getByText(/Jamieson-Fausset-Brown/)).toBeInTheDocument())
  expect(spy.mock.calls.some(([url]) => String(url).includes('/jfb/'))).toBe(true)
  const { getCommentarySource } = await import('../../lib/store')
  expect(getCommentarySource()).toBe('jfb')
})

test('gap in JFB offers the Henry switch', async () => {
  localStorage.setItem('bs:commentary', 'jfb')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify([[99, 1, 2, 'elsewhere']]), { status: 200 }),
  )
  render(<CommentaryPane book="PSA" c={3} v={16} active={true} />)
  await waitFor(() => expect(screen.getByText(/JFB doesn't comment on this verse/)).toBeInTheDocument())
  expect(screen.getByRole('button', { name: /read Matthew Henry/i })).toBeInTheDocument()
})

test('fetch failure on jfb shows the offline-tier message', async () => {
  localStorage.setItem('bs:commentary', 'jfb')
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('failed to fetch'))
  render(<CommentaryPane book="ISA" c={3} v={16} active={true} />)
  await waitFor(() =>
    expect(screen.getByText(/isn't downloaded yet — Matthew Henry is always available offline/)).toBeInTheDocument())
})
