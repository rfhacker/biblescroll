import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { buildStore } from '../../content/verseStore'
import { ProphecyCard } from './ProphecyCard'
import { HymnCard } from './HymnCard'
import { TimelineCard } from './TimelineCard'
import prophecy from '../../content/prophecy.json'
import hymns from '../../content/hymns.json'
import timeline from '../../content/timeline.json'
import type { ProphecyItem, HymnItem, TimelineItem } from '../../content/types'

const store = buildStore(JSON.parse(readFileSync('public/content/verses.json', 'utf8')))
const pf = (prophecy as ProphecyItem[])[0]
const hy = (hymns as HymnItem[])[0]
const tl = (timeline as TimelineItem[])[0]

test('ProphecyCard renders both passages with labels and refs', () => {
  render(<ProphecyCard item={pf} verses={store} theme={0} />)
  expect(screen.getByText('Prophecy · Fulfilled')).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(`Foretold — ${pf.prophecyRef}`))).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(`Fulfilled — ${pf.fulfillmentRef}`))).toBeInTheDocument()
  expect(screen.getByText(pf.note)).toBeInTheDocument()
})

test('HymnCard renders title, byline, stanza with line breaks, story', () => {
  const { container } = render(<HymnCard item={hy} theme={0} />)
  expect(screen.getByText('Hymn Story')).toBeInTheDocument()
  expect(screen.getByText(hy.title)).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(hy.author) && c.includes(String(hy.year)))).toBeInTheDocument()
  const stanza = container.querySelector('.hymn-stanza')!
  expect(stanza.textContent).toBe(hy.stanza)
})

test('TimelineCard renders era labels and the gold marker', () => {
  const { container } = render(<TimelineCard item={tl} theme={0} />)
  expect(screen.getByText('Biblical Timeline')).toBeInTheDocument()
  for (const era of ['Abraham', 'Exodus', 'David', 'Exile', 'Jesus', 'Paul']) {
    expect(screen.getByText(era)).toBeInTheDocument()
  }
  expect(screen.getByText(tl.when)).toBeInTheDocument()
  expect(container.querySelectorAll('circle[fill="var(--accent)"]')).toHaveLength(1)
})
