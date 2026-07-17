import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import type { HymnItem } from '../../content/types'

export function HymnCard({ item, theme }: { item: HymnItem; theme: number }) {
  return (
    <CardShell theme={theme}
      shareText={`${item.title} (${item.author}, ${item.year}): ${item.story} (${item.ref})`}
      fav={{ kind: 'hymn', id: item.id, title: item.title, body: `${item.story} (${item.ref})` }}>
      <div className="kicker">Hymn Story</div>
      <h2 className="fact-title">{item.title}</h2>
      <p className="hymn-byline">{item.author} · {item.year}</p>
      <blockquote className="quote-text hymn-stanza">{item.stanza}</blockquote>
      <p className="fact-body">{item.story}</p>
      <RefButton refString={item.ref} />
    </CardShell>
  )
}
