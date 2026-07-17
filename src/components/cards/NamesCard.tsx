import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import type { NamesItem } from '../../content/types'

export function NamesCard({ item, theme }: { item: NamesItem; theme: number }) {
  return (
    <CardShell theme={theme}
      shareText={`${item.name} — ${item.meaning}. ${item.body} (${item.refs.join('; ')})`}
      fav={{ kind: 'names', id: item.id, title: `${item.name} — ${item.meaning}`, body: `${item.body} (${item.refs.join('; ')})` }}>
      <div className="kicker">Names of God</div>
      <h2 className="names-title">{item.name}</h2>
      <p className="names-original">{item.original} · {item.language}</p>
      <p className="names-meaning">{item.meaning}</p>
      <p className="fact-body">{item.body}</p>
      <p className="names-refs">{item.refs.map((r) => <RefButton key={r} refString={r} />)}</p>
    </CardShell>
  )
}
