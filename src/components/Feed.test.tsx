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
