// src/components/cards/VerseSlide.test.tsx
// NOTE: distinct books per test — loadCommentary's module cache persists across tests.
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VerseSlide } from './VerseSlide'
import { beforeEach, test, expect, vi } from 'vitest'

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks() })

test('renders the card, a Commentary chip, and an empty second pane initially', () => {
  const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }))
  const { container } = render(
    <VerseSlide book="JHN" c={3} v={16}><article className="card">verse here</article></VerseSlide>,
  )
  expect(screen.getByText('verse here')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /commentary/i })).toBeInTheDocument()
  const panes = container.querySelectorAll('.vpane')
  expect(panes).toHaveLength(2)
  expect(panes[1].querySelector('.commentary-pane')).toBeNull() // lazy until engaged
  expect(spy).toHaveBeenCalledTimes(1) // prefetch of the book file on mount
})

test('horizontal scroll engages the commentary pane', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify([[3, 16, 16, 'comment text']]), { status: 200 }),
  )
  const { container } = render(
    <VerseSlide book="EXO" c={3} v={16}><article className="card">v</article></VerseSlide>,
  )
  await waitFor(() => expect(screen.getByRole('button', { name: /commentary/i })).toBeInTheDocument())
  const track = container.querySelector('.vslide') as HTMLElement
  Object.defineProperty(track, 'scrollLeft', { value: 120, configurable: true })
  fireEvent.scroll(track)
  await waitFor(() => expect(screen.getByText(/comment text/)).toBeInTheDocument())
})

test('tapping the chip engages the pane', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify([[3, 16, 16, 'chip engaged']]), { status: 200 }),
  )
  render(<VerseSlide book="RUT" c={3} v={16}><article className="card">v</article></VerseSlide>)
  await userEvent.click(screen.getByRole('button', { name: /commentary/i }))
  await screen.findByText(/chip engaged/)
})
