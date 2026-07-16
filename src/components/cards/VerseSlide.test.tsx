// src/components/cards/VerseSlide.test.tsx
// NOTE: distinct books per test — loadCommentary's module cache persists across tests.
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { VerseSlide } from './VerseSlide'
import { buildStore } from '../../content/verseStore'
import { beforeEach, test, expect, vi } from 'vitest'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks() })

// jsdom clientWidth is 0; for centering/scroll tests, mock it on the prototype:
function withClientWidth(width: number, fn: () => void | Promise<void>) {
  const proto = HTMLDivElement.prototype
  Object.defineProperty(proto, 'clientWidth', { configurable: true, get: () => width })
  return Promise.resolve(fn()).finally(() => { delete (proto as any).clientWidth })
}

test('renders the card, both chips, and empty side panes initially', () => {
  const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }))
  const { container } = render(
    <VerseSlide book="JHN" c={3} v={16} verses={store}><article className="card">verse here</article></VerseSlide>,
  )
  expect(screen.getByText('verse here')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /references/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /commentary/i })).toBeInTheDocument()
  const panes = container.querySelectorAll('.vpane')
  expect(panes).toHaveLength(3)
  expect(container.querySelector('.commentary-pane')).toBeNull() // both sides lazy until engaged
  expect(spy).toHaveBeenCalledTimes(2) // prefetch of commentary + crossrefs on mount
  const urls = spy.mock.calls.map((c) => String(c[0]))
  expect(urls.some((u) => u.includes('/commentary/'))).toBe(true)
  expect(urls.some((u) => u.includes('/crossrefs/'))).toBe(true)
})

test('mounts centered on the verse card pane', async () => {
  await withClientWidth(300, () => {
    const { container } = render(
      <VerseSlide book="JHN" c={3} v={16} verses={store}><article className="card">v</article></VerseSlide>,
    )
    const track = container.querySelector('.vslide') as HTMLElement
    expect(track.scrollLeft).toBe(300) // one pane width = centered on pane 2 of 3
    expect(container.querySelectorAll('.vpane')).toHaveLength(3)
    expect(container.querySelector('.commentary-pane')).toBeNull() // both sides lazy
  })
})

test('scrolling right of center engages the commentary pane', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify([[3, 16, 16, 'comment text']]), { status: 200 }),
  )
  await withClientWidth(300, async () => {
    const { container } = render(
      <VerseSlide book="EXO" c={3} v={16} verses={store}><article className="card">v</article></VerseSlide>,
    )
    const track = container.querySelector('.vslide') as HTMLElement
    track.scrollLeft = 480 // right of the 300 center
    fireEvent.scroll(track)
    await waitFor(() => expect(screen.getByText(/comment text/)).toBeInTheDocument())
  })
})

test('scrolling left of center engages cross-references', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify([[3, 16, [['ROM', 5, 8]]]]), { status: 200 }))
  await withClientWidth(300, async () => {
    const { container } = render(
      <VerseSlide book="GEN" c={3} v={16} verses={store}><article className="card">v</article></VerseSlide>,
    )
    const track = container.querySelector('.vslide') as HTMLElement
    track.scrollLeft = 120 // left of the 300 center
    fireEvent.scroll(track)
    await screen.findByText(/cross references/i)
  })
})

test('chip halves navigate to each side', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }))
  render(<VerseSlide book="NUM" c={3} v={16} verses={store}><article className="card">v</article></VerseSlide>)
  await userEvent.click(screen.getByRole('button', { name: /references/i }))
  await screen.findByText(/cross references/i)
  await userEvent.click(screen.getByRole('button', { name: /commentary/i }))
  await screen.findByText(/bible commentary/i)
})

test('tapping the commentary chip engages the right pane', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify([[3, 16, 16, 'chip engaged']]), { status: 200 }),
  )
  render(<VerseSlide book="RUT" c={3} v={16} verses={store}><article className="card">v</article></VerseSlide>)
  await userEvent.click(screen.getByRole('button', { name: /commentary/i }))
  await screen.findByText(/chip engaged/)
})
