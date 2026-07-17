import { render, screen } from '@testing-library/react'
import { PrayerCard } from './PrayerCard'
import { NamesCard } from './NamesCard'
import prayer from '../../content/prayer.json'
import names from '../../content/names.json'
import type { PrayerItem, NamesItem } from '../../content/types'

const pr = (prayer as PrayerItem[])[0]
const ng = (names as NamesItem[])[0]

test('PrayerCard: kicker, prompt, tappable ref — and NO save/share actions', () => {
  const { container } = render(<PrayerCard item={pr} theme={0} />)
  expect(screen.getByText('A moment of prayer')).toBeInTheDocument()
  expect(screen.getByText(pr.prompt)).toBeInTheDocument()
  expect(container.querySelector('.card-actions')).toBeNull()
})

test('NamesCard: name, original script, meaning, body, refs, favoritable', () => {
  const { container } = render(<NamesCard item={ng} theme={0} />)
  expect(screen.getByText('Names of God')).toBeInTheDocument()
  expect(screen.getByText(ng.name)).toBeInTheDocument()
  expect(screen.getByText((c) => c.includes(ng.meaning))).toBeInTheDocument()
  expect(container.querySelector('.card-actions')).not.toBeNull()
})

test('favorites accept whosaid/continue/names kinds', async () => {
  localStorage.clear()
  const { toggleFavorite, isFavorite } = await import('../../lib/store')
  for (const kind of ['whosaid', 'continue', 'names'] as const) {
    toggleFavorite({ kind, id: `x-${kind}`, title: 't', body: 'b' })
    expect(isFavorite(kind, `x-${kind}`)).toBe(true)
  }
})
