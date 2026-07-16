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

test('matching terms are bolded within a result snippet', async () => {
  const { container } = render(<Search verses={store} onClose={() => {}} />)
  await userEvent.type(screen.getByRole('searchbox'), 'eagles wings')
  await waitFor(() => expect(screen.getByText(/Isaiah 40:31/)).toBeInTheDocument(), { timeout: 2000 })
  const strongEls = container.querySelectorAll('.search-row strong')
  expect(strongEls.length).toBeGreaterThan(0)
  expect(Array.from(strongEls).some((el) => /eagle|wing/i.test(el.textContent ?? ''))).toBe(true)
})

test('apostrophe words highlight against a normalized query', async () => {
  const { container } = render(<Search verses={store} onClose={() => {}} />)
  await userEvent.type(screen.getByRole('searchbox'), 'dont be afraid')
  await waitFor(() => expect(screen.queryAllByText(/don.?t/i).length).toBeGreaterThan(0), { timeout: 2000 })
  const rows = Array.from(container.querySelectorAll('.search-row'))
  const rowWithContraction = rows.find((row) => /don['’]t/i.test(row.textContent ?? ''))
  expect(rowWithContraction).toBeTruthy()
  const strong = rowWithContraction!.querySelector('strong')
  expect(strong).toBeTruthy()
  expect(/don['’]t/i.test(strong!.textContent ?? '')).toBe(true)
})
