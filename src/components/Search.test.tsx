import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { Search } from './Search'
import { ChapterContext } from './ChapterContext'
import { buildStore } from '../content/verseStore'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

test('short query shows guidance, real query shows ranked results with count', async () => {
  render(<Search verses={store} onClose={() => {}} />)
  expect(screen.getByText(/type a few letters/i)).toBeInTheDocument()
  await userEvent.type(screen.getByRole('searchbox'), 'eagles wings')
  await waitFor(() => expect(screen.getByText(/verses?$/i)).toBeInTheDocument(), { timeout: 2000 })
  expect(screen.getByText(/Isaiah 40:31/)).toBeInTheDocument()
})

test('no matches shows the warm empty state', async () => {
  render(<Search verses={store} onClose={() => {}} />)
  await userEvent.type(screen.getByRole('searchbox'), 'zxqvw')
  await waitFor(() => expect(screen.getByText(/no verses match yet/i)).toBeInTheDocument(), { timeout: 2000 })
})

test('tapping a result opens the chapter at that verse', async () => {
  const openChapter = vi.fn()
  render(
    <ChapterContext.Provider value={{ openChapter }}>
      <Search verses={store} onClose={() => {}} />
    </ChapterContext.Provider>,
  )
  await userEvent.type(screen.getByRole('searchbox'), 'eagles wings')
  await waitFor(() => screen.getByText(/Isaiah 40:31/), { timeout: 2000 })
  await userEvent.click(screen.getByText(/Isaiah 40:31/))
  expect(openChapter).toHaveBeenCalledWith('ISA', 40, 31)
})
