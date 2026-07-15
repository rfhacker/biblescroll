import { render } from '@testing-library/react'
import { BaseMap } from './BaseMap'
import { VIEW } from '../../lib/geo'

const FULL = { x: 0, y: 0, w: VIEW.w, h: VIEW.h }

test('renders real geometry with the requested viewBox', () => {
  const { container } = render(<BaseMap view={FULL} />)
  const svg = container.querySelector('svg')!
  expect(svg.getAttribute('viewBox')).toBe('0 0 800 600')
  expect(container.querySelectorAll('path.bm-land').length).toBeGreaterThanOrEqual(3)
  expect(container.querySelectorAll('path.bm-lake').length).toBeGreaterThanOrEqual(2)
  expect(container.querySelectorAll('path.bm-river').length).toBeGreaterThanOrEqual(4)
})

test('caps context labels at 6, rank-ordered', () => {
  const { container } = render(<BaseMap view={FULL} />)
  const labels = container.querySelectorAll('text.bm-label')
  expect(labels.length).toBeLessThanOrEqual(6)
  expect([...labels].some((t) => t.textContent === 'Great Sea (Mediterranean)')).toBe(true)
})

test('filters labels to the current window', () => {
  // Levant window: Galilee visible, Macedonia not
  const { container } = render(<BaseMap view={{ x: 480, y: 320, w: 180, h: 135 }} />)
  const texts = [...container.querySelectorAll('text.bm-label')].map((t) => t.textContent)
  expect(texts).toContain('Galilee')
  expect(texts).not.toContain('Macedonia')
})
