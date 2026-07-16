import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { CrossRefsPane } from './CrossRefsPane'
import { ChapterContext } from '../ChapterContext'
import { buildStore } from '../../content/verseStore'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const REFS_16 = Array.from({ length: 20 }, (_, i) => ['PSA', 1, i + 1])
const ENTRIES = [[3, 16, [['ROM', 5, 8], ['1JN', 4, 9, 10], ...REFS_16]]]

beforeEach(() => { vi.restoreAllMocks() })
const mockOk = (payload: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))

test('inactive renders and fetches nothing', () => {
  const spy = mockOk(ENTRIES)
  render(<CrossRefsPane book="JHN" c={3} v={16} verses={store} active={false} />)
  expect(spy).not.toHaveBeenCalled()
  expect(screen.queryByText(/cross references/i)).toBeNull()
})

test('active shows heading, ref labels with WEB text, cap 15 + Show all', async () => {
  mockOk(ENTRIES)
  render(<CrossRefsPane book="GEN" c={3} v={16} verses={store} active={true} />)
  await waitFor(() => expect(screen.getByText('Scripture on Genesis 3:16')).toBeInTheDocument())
  expect(screen.getByText('Romans 5:8')).toBeInTheDocument()
  expect(screen.getByText(/God commends his own love/)).toBeInTheDocument() // WEB text of ROM 5:8
  expect(screen.getByText('1 John 4:9–10')).toBeInTheDocument()
  const items = document.querySelectorAll('.xref-item')
  expect(items).toHaveLength(15)
  await userEvent.click(screen.getByRole('button', { name: /show all \(22\)/i }))
  expect(document.querySelectorAll('.xref-item')).toHaveLength(22)
})

test('ref label tap opens the chapter', async () => {
  mockOk(ENTRIES)
  const openChapter = vi.fn()
  render(
    <ChapterContext.Provider value={{ openChapter }}>
      <CrossRefsPane book="PSA" c={3} v={16} verses={store} active={true} />
    </ChapterContext.Provider>,
  )
  await waitFor(() => screen.getByText('Romans 5:8'))
  await userEvent.click(screen.getByText('Romans 5:8'))
  expect(openChapter).toHaveBeenCalledWith('ROM', 5, 8)
})

test('verse without an entry shows the empty state', async () => {
  mockOk([[99, 1, [['GEN', 1, 1]]]])
  render(<CrossRefsPane book="EXO" c={3} v={16} verses={store} active={true} />)
  await waitFor(() =>
    expect(screen.getByText('No cross-references recorded for this verse.')).toBeInTheDocument())
})

test('fetch failure shows the offline message with Try again', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockRejectedValueOnce(new TypeError('failed'))
    .mockResolvedValueOnce(new Response(JSON.stringify([[3, 16, [['ROM', 5, 8]]]]), { status: 200 }))
  render(<CrossRefsPane book="ISA" c={3} v={16} verses={store} active={true} />)
  await waitFor(() =>
    expect(screen.getByText(/references for this book aren’t downloaded yet/i)).toBeInTheDocument())
  await userEvent.click(screen.getByRole('button', { name: /try again/i }))
  await screen.findByText('Romans 5:8')
})
