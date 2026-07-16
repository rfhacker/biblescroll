import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Menu } from './Menu'

test('menu lists the four destinations and navigates', async () => {
  const onNavigate = vi.fn(); const onClose = vi.fn()
  render(<Menu onNavigate={onNavigate} onClose={onClose} />)
  for (const label of [/how are you feeling/i, /search/i, /saved/i, /about/i]) {
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
  }
  await userEvent.click(screen.getByRole('button', { name: /how are you feeling/i }))
  expect(onNavigate).toHaveBeenCalledWith('feelings')
})

test('tapping the scrim closes the menu', async () => {
  const onClose = vi.fn()
  const { container } = render(<Menu onNavigate={() => {}} onClose={onClose} />)
  await userEvent.click(container.querySelector('.menu-scrim')!)
  expect(onClose).toHaveBeenCalled()
})
