import { vi } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import { Feed } from './Feed'
import { buildStore } from '../content/verseStore'
import { dayKey } from '../lib/votd'
import { readFileSync } from 'node:fs'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

// The hint tests mutate the store's module-level mem cache (setHasScrolled), which
// localStorage.clear() cannot reset. Each hint test therefore uses vi.resetModules()
// + dynamic imports (the same idiom as store.test.ts / TriviaCard.test.tsx) so every
// test gets a fresh store instance and stays order-independent.
async function freshFeed() {
  vi.resetModules()
  localStorage.clear()
  const { Feed: FreshFeed } = await import('./Feed')
  const storeLib = await import('../lib/store')
  return { FreshFeed, storeLib }
}

test('renders VOTD as the first card and placeholders beyond the window', () => {
  const { container } = render(<Feed verses={store} day={dayKey()} sessionSeed="test-seed" onScore={() => {}} />)
  expect(screen.getByText(/Verse of the Day/i)).toBeInTheDocument()
  const sections = container.querySelectorAll('.slot')
  expect(sections.length).toBeGreaterThanOrEqual(40)
  // slots beyond the ±3 window are empty placeholders
  expect(sections[10].querySelector('.card')).toBeNull()
  expect(sections[0].querySelector('.card')).not.toBeNull()
})

test('changing the day prop remaps the feed (VOTD updates without remount)', () => {
  const { unmount: unmount1 } = render(<Feed verses={store} day="2026-07-09" sessionSeed="test-seed" onScore={() => {}} />)
  const firstDayRef = screen.getByText(/Verse of the Day/i).closest('.card')?.textContent
  unmount1()
  cleanup()

  render(<Feed verses={store} day="2026-07-10" sessionSeed="test-seed" onScore={() => {}} />)
  const secondDayRef = screen.getByText(/Verse of the Day/i).closest('.card')?.textContent
  expect(secondDayRef).not.toBe(firstDayRef)
})

test('scroll hint shows on the first card for a first-time visitor', async () => {
  const { FreshFeed } = await freshFeed()
  render(<FreshFeed verses={store} day={dayKey()} sessionSeed="test-seed" onScore={() => {}} />)
  expect(screen.getByText(/swipe up for the next card/i)).toBeInTheDocument()
  cleanup()
})

test('scroll hint is absent for someone who has scrolled before', async () => {
  vi.resetModules()
  localStorage.clear()
  localStorage.setItem('bs:scrolled', '1')
  const { Feed: FreshFeed } = await import('./Feed')
  render(<FreshFeed verses={store} day={dayKey()} sessionSeed="test-seed" onScore={() => {}} />)
  expect(screen.queryByText(/swipe up/i)).toBeNull()
  cleanup()
})

test('sideways slide engagement dismisses the hint and persists it', async () => {
  const { FreshFeed, storeLib } = await freshFeed()
  render(<FreshFeed verses={store} day={dayKey()} sessionSeed="test-seed" onScore={() => {}} />)
  expect(screen.getByText(/swipe up for the next card/i)).toBeInTheDocument()
  act(() => {
    window.dispatchEvent(new CustomEvent('bs:slide-engaged'))
  })
  expect(screen.queryByText(/swipe up/i)).toBeNull()
  expect(storeLib.getHasScrolled()).toBe(true)
  cleanup()
})

test('scrolling hides the hint and remembers it', async () => {
  const { FreshFeed, storeLib } = await freshFeed()
  const { container } = render(<FreshFeed verses={store} day={dayKey()} sessionSeed="test-seed" onScore={() => {}} />)
  expect(screen.getByText(/swipe up for the next card/i)).toBeInTheDocument()
  const feed = container.querySelector('.feed') as HTMLElement
  Object.defineProperty(feed, 'clientHeight', { value: 800, configurable: true })
  feed.scrollTop = 800
  fireEvent.scroll(feed)
  expect(screen.queryByText(/swipe up/i)).toBeNull()
  expect(storeLib.getHasScrolled()).toBe(true)
  cleanup()
})

test('verse slots are three-pane slides with chips; no commentary/crossrefs fetch before engagement beyond prefetch', () => {
  localStorage.clear()
  localStorage.setItem('bs:scrolled', '1')
  const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }))
  const { container } = render(<Feed verses={store} day={dayKey()} sessionSeed="test-seed" onScore={() => {}} />)
  expect(container.querySelector('.vslide')).not.toBeNull()
  expect(container.querySelector('.commentary-pane')).toBeNull()
  for (const [url] of spy.mock.calls) {
    // only commentary/crossrefs prefetches, no other fetches
    expect(String(url)).toMatch(/\/(commentary|crossrefs)\//)
  }
  spy.mockRestore()
  cleanup()
})

test('a new session seed remaps the feed and returns to the top', () => {
  localStorage.clear()
  localStorage.setItem('bs:scrolled', '1')
  const { container, rerender } = render(
    <Feed verses={store} day="2026-07-16" sessionSeed="seed-aaaa" onScore={() => {}} />,
  )
  const firstOrder = container.querySelectorAll('.slot')[1].textContent
  const feed = container.querySelector('.feed') as HTMLElement
  feed.scrollTop = 500
  rerender(<Feed verses={store} day="2026-07-16" sessionSeed="seed-bbbb" onScore={() => {}} />)
  expect(container.querySelectorAll('.slot')[1].textContent).not.toBe(firstOrder)
  expect(feed.scrollTop).toBe(0)
  cleanup()
})
