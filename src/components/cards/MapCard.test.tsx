import { render, screen } from '@testing-library/react'
import { MapCard } from './MapCard'

const story = {
  id: 'm01', title: 'Jonah runs the wrong way', route: true,
  body: 'Called east to Nineveh, Jonah sailed west from Joppa instead — toward the far edge of the known world.',
  ref: 'Jonah 1:1-3',
  places: [
    { name: 'Joppa', lat: 32.05, lon: 34.75 },
    { name: 'Nineveh', lat: 36.36, lon: 43.15 },
  ],
}

test('renders title, place labels, route line, and ref', () => {
  const { container } = render(<MapCard story={story} theme={0} />)
  expect(screen.getByText('Jonah runs the wrong way')).toBeInTheDocument()
  expect(screen.getByText('Joppa')).toBeInTheDocument()
  expect(screen.getByText('Nineveh')).toBeInTheDocument()
  expect(screen.getByText(/Jonah 1:1-3/)).toBeInTheDocument()
  expect(container.querySelectorAll('circle')).toHaveLength(2)
  expect(container.querySelector('polyline')).not.toBeNull()
})

test('does not render a route line when route is false', () => {
  const noRouteStory = { ...story, route: false }
  const { container } = render(<MapCard story={noRouteStory} theme={0} />)
  expect(container.querySelector('polyline')).toBeNull()
})

test('clamps a near-top-edge label below the marker and anchors a near-left-edge label to start', () => {
  const romeStory = {
    id: 'm12', title: "Paul's shipwreck voyage to Rome", route: false,
    body: 'Paul reaches Rome.', ref: 'Acts 27:1-28:16',
    places: [{ name: 'Rome', lat: 41.90, lon: 12.49 }],
  }
  const { container } = render(<MapCard story={romeStory} theme={0} />)
  const circle = container.querySelector('circle')!
  const text = screen.getByText('Rome')
  expect(Number(text.getAttribute('y'))).toBeGreaterThan(Number(circle.getAttribute('cy')))
  expect(text.getAttribute('text-anchor')).toBe('start')
})
