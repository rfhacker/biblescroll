import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
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
  toggleFavorite({ kind: 'prophecy', id: 'p001', title: 'Isaiah 53 → Christ', body: 'The Suffering Servant' })
  toggleFavorite({ kind: 'hymn', id: 'h001', title: 'Amazing Grace', body: 'John Newton, 1779' })
  toggleFavorite({ kind: 'timeline', id: 't001', title: 'Birth of Jesus', body: '4 BC - Bethlehem' })
  toggleFavorite({ kind: 'word', id: 'wd001', title: 'chêçêd — Loving-kindness', body: 'Chesed is loyalty in action' })
  render(<Favorites onClose={() => {}} />)
  expect(screen.getByText('Who said it?')).toBeInTheDocument()
  expect(screen.getByText('Continue the verse')).toBeInTheDocument()
  expect(screen.getByText('Names of God')).toBeInTheDocument()
  expect(screen.getByText('Prophecy & Fulfillment')).toBeInTheDocument()
  expect(screen.getByText('Hymn Stories')).toBeInTheDocument()
  expect(screen.getByText('Timeline')).toBeInTheDocument()
  expect(screen.getByText('Word Studies')).toBeInTheDocument()
  expect(screen.getByText('Let there be light')).toBeInTheDocument()
  expect(screen.getByText('The Lord is my shepherd…')).toBeInTheDocument()
  expect(screen.getByText('Elohim')).toBeInTheDocument()
  expect(screen.getByText('Isaiah 53 → Christ')).toBeInTheDocument()
  expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
  expect(screen.getByText('Birth of Jesus')).toBeInTheDocument()
  expect(screen.getByText('chêçêd — Loving-kindness')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /remove birth of jesus/i }))
  expect(screen.queryByText('Birth of Jesus')).toBeNull()
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
