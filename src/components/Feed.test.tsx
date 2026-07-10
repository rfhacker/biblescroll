import { render, screen } from '@testing-library/react'
import { Feed } from './Feed'
import { buildStore } from '../content/verseStore'
import { readFileSync } from 'node:fs'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

test('renders VOTD as the first card and placeholders beyond the window', () => {
  const { container } = render(<Feed verses={store} onScore={() => {}} />)
  expect(screen.getByText(/Verse of the Day/i)).toBeInTheDocument()
  const sections = container.querySelectorAll('.slot')
  expect(sections.length).toBeGreaterThanOrEqual(40)
  // slots beyond the ±3 window are empty placeholders
  expect(sections[10].querySelector('.card')).toBeNull()
  expect(sections[0].querySelector('.card')).not.toBeNull()
})
