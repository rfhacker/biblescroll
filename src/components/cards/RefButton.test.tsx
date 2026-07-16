import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { RefButton } from './RefButton'
import { ChapterContext } from '../ChapterContext'

test('opens the chapter at the first cited verse', async () => {
  const openChapter = vi.fn()
  render(
    <ChapterContext.Provider value={{ openChapter }}>
      <RefButton refString="Acts 10:44-48; 11:17-18" />
    </ChapterContext.Provider>,
  )
  await userEvent.click(screen.getByRole('button', { name: /Acts 10:44-48/ }))
  expect(openChapter).toHaveBeenCalledWith('ACT', 10, 44)
})

test('unparseable ref renders but no-ops', async () => {
  const openChapter = vi.fn()
  render(
    <ChapterContext.Provider value={{ openChapter }}>
      <RefButton refString="Traditional saying" />
    </ChapterContext.Provider>,
  )
  await userEvent.click(screen.getByRole('button', { name: /Traditional saying/ }))
  expect(openChapter).not.toHaveBeenCalled()
})
