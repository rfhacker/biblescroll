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
