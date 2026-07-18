import { render, screen } from '@testing-library/react'
import { WordCard } from './WordCard'
import words from '../../content/words.json'
import type { WordItem } from '../../content/types'

const wd = (words as WordItem[])[0]

test('WordCard renders script, byline, gloss, body, refs', () => {
  const { container } = render(<WordCard item={wd} theme={0} />)
  expect(screen.getByText('Word Study')).toBeInTheDocument()
  expect(screen.getByText(wd.word)).toBeInTheDocument()
  // Pin the exact byline (U+00B7 dots, U+2019 apostrophe) — a loose substring
  // check let an ASCII apostrophe ship past review once.
  expect(screen.getByText(`${wd.translit} · ${wd.language} · Strong’s ${wd.strongs}`)).toBeInTheDocument()
  expect(screen.getByText(wd.gloss)).toBeInTheDocument()
  expect(screen.getByText(wd.body)).toBeInTheDocument()
  expect(container.querySelectorAll('.verse-ref-btn').length).toBe(wd.refs.length)
})
