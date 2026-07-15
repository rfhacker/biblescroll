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
  const edgeStory = {
    id: 'm12', title: 'Edges of the known world', route: false,
    body: 'Places near the frame edges.', ref: 'Acts 27:1-28:16',
    places: [
      { name: 'Sinope', lat: 43.1, lon: 35.0 },
      { name: 'Carthage-ish', lat: 36.8, lon: 10.3 },
    ],
  }
  const { container } = render(<MapCard story={edgeStory} theme={0} />)
  const circles = container.querySelectorAll('circle')
  const sinopeText = screen.getByText('Sinope')
  const carthageText = screen.getByText('Carthage-ish')
  expect(Number(sinopeText.getAttribute('y'))).toBeGreaterThan(Number(circles[0].getAttribute('cy')))
  expect(carthageText.getAttribute('text-anchor')).toBe('start')
})
