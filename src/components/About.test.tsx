import { render, screen } from '@testing-library/react'
import { About } from './About'

test('shows the contact email as a mailto link', () => {
  render(<About onClose={() => {}} />)
  const link = screen.getByRole('link', { name: 'info@jesusfeed.com' })
  expect(link).toHaveAttribute('href', 'mailto:info@jesusfeed.com')
})
