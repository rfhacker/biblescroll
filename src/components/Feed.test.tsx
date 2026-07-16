import { vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Feed } from './Feed'
import { buildStore } from '../content/verseStore'
import { dayKey } from '../lib/votd'
import { readFileSync } from 'node:fs'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

test('renders VOTD as the first card and placeholders beyond the window', () => {
  const { container } = render(<Feed verses={store} day={dayKey()} onScore={() => {}} />)
  expect(screen.getByText(/Verse of the Day/i)).toBeInTheDocument()
  const sections = container.querySelectorAll('.slot')
  expect(sections.length).toBeGreaterThanOrEqual(40)
  // slots beyond the ±3 window are empty placeholders
  expect(sections[10].querySelector('.card')).toBeNull()
  expect(sections[0].querySelector('.card')).not.toBeNull()
})

test('changing the day prop remaps the feed (VOTD updates without remount)', () => {
  const { unmount: unmount1 } = render(<Feed verses={store} day="2026-07-09" onScore={() => {}} />)
  const firstDayRef = screen.getByText(/Verse of the Day/i).closest('.card')?.textContent
  unmount1()
  cleanup()

  render(<Feed verses={store} day="2026-07-10" onScore={() => {}} />)
  const secondDayRef = screen.getByText(/Verse of the Day/i).closest('.card')?.textContent
  expect(secondDayRef).not.toBe(firstDayRef)
})

test('scroll hint shows on the first card for a first-time visitor', () => {
  localStorage.clear()
  render(<Feed verses={store} day={dayKey()} onScore={() => {}} />)
  expect(screen.getByText(/swipe up for the next card/i)).toBeInTheDocument()
  cleanup()
})

test('scroll hint is absent for someone who has scrolled before', () => {
  localStorage.clear()
  localStorage.setItem('bs:scrolled', '1')
  render(<Feed verses={store} day={dayKey()} onScore={() => {}} />)
  expect(screen.queryByText(/swipe up/i)).toBeNull()
  cleanup()
})

test('scrolling hides the hint and remembers it', async () => {
  localStorage.clear()
  const { container } = render(<Feed verses={store} day={dayKey()} onScore={() => {}} />)
  const feed = container.querySelector('.feed') as HTMLElement
  Object.defineProperty(feed, 'clientHeight', { value: 800, configurable: true })
  feed.scrollTop = 800
  const { fireEvent } = await import('@testing-library/react')
  fireEvent.scroll(feed)
  expect(screen.queryByText(/swipe up/i)).toBeNull()
  const { getHasScrolled } = await import('../lib/store')
  expect(getHasScrolled()).toBe(true)
  cleanup()
})

test('verse slots are two-pane slides with a commentary chip; no commentary fetch before engagement beyond prefetch', () => {
  localStorage.clear()
  localStorage.setItem('bs:scrolled', '1')
  const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }))
  const { container } = render(<Feed verses={store} day={dayKey()} onScore={() => {}} />)
  expect(container.querySelector('.vslide')).not.toBeNull()
  expect(container.querySelector('.commentary-pane')).toBeNull()
  for (const [url] of spy.mock.calls) {
    expect(String(url)).toMatch(/\/commentary\//) // only commentary prefetches, no other fetches
  }
  spy.mockRestore()
  cleanup()
})
