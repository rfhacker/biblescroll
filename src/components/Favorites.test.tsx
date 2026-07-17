import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Favorites } from './Favorites'
import { toggleFavorite } from '../lib/store'

beforeEach(() => localStorage.clear())

test('empty state message', () => {
  render(<Favorites onClose={() => {}} />)
  expect(screen.getByText(/nothing saved yet/i)).toBeInTheDocument()
})

test('lists saved items grouped by kind and removes on unheart', async () => {
  toggleFavorite({ kind: 'verse', id: 'John 3:16', title: 'John 3:16', body: 'For God so loved…' })
  toggleFavorite({ kind: 'fact', id: 'f001', title: 'Shortest verse', body: 'Jesus wept.' })
  render(<Favorites onClose={() => {}} />)
  expect(screen.getByText('Verses')).toBeInTheDocument()
  expect(screen.getByText('Facts')).toBeInTheDocument()
  expect(screen.getByText('John 3:16')).toBeInTheDocument()
  await userEvent.click(screen.getAllByRole('button', { name: /remove/i })[0])
  expect(screen.queryByText('John 3:16')).toBeNull()
})

test('lists newer card kinds under their own headings and removes on unheart', async () => {
  toggleFavorite({ kind: 'whosaid', id: 'ws001', title: 'Let there be light', body: 'God, at creation' })
  toggleFavorite({ kind: 'continue', id: 'c001', title: 'The Lord is my shepherd…', body: 'Psalm 23' })
  toggleFavorite({ kind: 'names', id: 'n001', title: 'Elohim', body: 'God, the mighty creator' })
  render(<Favorites onClose={() => {}} />)
  expect(screen.getByText('Who said it?')).toBeInTheDocument()
  expect(screen.getByText('Continue the verse')).toBeInTheDocument()
  expect(screen.getByText('Names of God')).toBeInTheDocument()
  expect(screen.getByText('Let there be light')).toBeInTheDocument()
  expect(screen.getByText('The Lord is my shepherd…')).toBeInTheDocument()
  expect(screen.getByText('Elohim')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /remove elohim/i }))
  expect(screen.queryByText('Elohim')).toBeNull()
})

test('close button fires onClose', async () => {
  const onClose = vi.fn()
  render(<Favorites onClose={onClose} />)
  await userEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(onClose).toHaveBeenCalled()
})

test('tapping a saved verse opens its chapter', async () => {
  const { ChapterContext } = await import('./ChapterContext')
  toggleFavorite({ kind: 'verse', id: 'John 3:16', title: 'John 3:16', body: 'For God so loved…' })
  const openChapter = vi.fn()
  render(
    <ChapterContext.Provider value={{ openChapter }}>
      <Favorites onClose={() => {}} />
    </ChapterContext.Provider>,
  )
  await userEvent.click(screen.getByText('John 3:16'))
  expect(openChapter).toHaveBeenCalledWith('JHN', 3, 16)
})
