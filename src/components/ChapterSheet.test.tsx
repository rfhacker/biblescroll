import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { ChapterSheet } from './ChapterSheet'
import { buildStore } from '../content/verseStore'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))

test('renders the chapter with heading, verse numbers, and highlight', () => {
  const { container } = render(
    <ChapterSheet store={store} b="JHN" c={3} highlight={16} onClose={() => {}} onOpen={() => {}} />,
  )
  expect(screen.getByText('John 3')).toBeInTheDocument()
  expect(screen.getByText(/God so loved the world/)).toBeInTheDocument()
  const hl = container.querySelector('.ch-highlight')
  expect(hl).not.toBeNull()
  expect(hl!.textContent).toMatch(/God so loved/)
})

test('prev/next navigate and clamp at canon edges', async () => {
  const onOpen = vi.fn()
  const { rerender } = render(
    <ChapterSheet store={store} b="GEN" c={50} onClose={() => {}} onOpen={onOpen} />,
  )
  await userEvent.click(screen.getByRole('button', { name: /next chapter/i }))
  expect(onOpen).toHaveBeenCalledWith('EXO', 1)
  rerender(<ChapterSheet store={store} b="GEN" c={1} onClose={() => {}} onOpen={onOpen} />)
  expect(screen.queryByRole('button', { name: /previous chapter/i })).toBeNull()
  rerender(<ChapterSheet store={store} b="REV" c={22} onClose={() => {}} onOpen={onOpen} />)
  expect(screen.queryByRole('button', { name: /next chapter/i })).toBeNull()
})
