import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VerseCard } from './VerseCard'
import { FactCard } from './FactCard'
import { getFavorites } from '../../lib/store'

beforeEach(() => localStorage.clear())

test('VerseCard shows text, reference, and WEB attribution', () => {
  render(<VerseCard text="For God so loved the world…" label="John 3:16" theme={0} />)
  expect(screen.getByText(/God so loved/)).toBeInTheDocument()
  expect(screen.getByText(/John 3:16/)).toBeInTheDocument()
  expect(screen.getByText(/WEB/)).toBeInTheDocument()
})

test('VerseCard shows VOTD badge only when votd', () => {
  const { rerender } = render(<VerseCard text="t" label="l" votd theme={0} />)
  expect(screen.getByText(/Verse of the Day/i)).toBeInTheDocument()
  rerender(<VerseCard text="t" label="l" theme={0} />)
  expect(screen.queryByText(/Verse of the Day/i)).toBeNull()
})

test('long verse text is collapsed behind Read more', async () => {
  render(<VerseCard text={'word '.repeat(120)} label="Psalms 119:1" theme={1} />)
  await userEvent.click(screen.getByRole('button', { name: /read more/i }))
  expect(screen.queryByRole('button', { name: /read more/i })).toBeNull()
})

test('heart button saves a favorite', async () => {
  render(<VerseCard text="abc" label="Genesis 1:1" theme={0} />)
  await userEvent.click(screen.getByRole('button', { name: /save/i }))
  expect(getFavorites()).toHaveLength(1)
  expect(getFavorites()[0]).toMatchObject({ kind: 'verse', id: 'Genesis 1:1' })
})

test('FactCard renders title, body, ref', () => {
  render(<FactCard theme={2} fact={{ id: 'f001', title: 'A title here', body: 'Body text long enough to be a fact body for sure.', ref: 'John 11:35' }} />)
  expect(screen.getByText('A title here')).toBeInTheDocument()
  expect(screen.getByText(/John 11:35/)).toBeInTheDocument()
})
