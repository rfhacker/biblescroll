import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import type { WordItem } from '../../content/types'

export function WordCard({ item, theme }: { item: WordItem; theme: number }) {
  return (
    <CardShell theme={theme}
      shareText={`${item.translit} (${item.word}) — ${item.gloss}. ${item.body} (${item.refs.join('; ')})`}
      fav={{ kind: 'word', id: item.id, title: `${item.translit} — ${item.gloss}`, body: `${item.body} (${item.refs.join('; ')})` }}>
      <div className="kicker">Word Study</div>
      <h2 className="word-original" lang={item.language === 'Greek' ? 'el' : 'he'}>{item.word}</h2>
      <p className="word-byline">{item.translit} · {item.language} · Strong's {item.strongs}</p>
      <p className="word-gloss">{item.gloss}</p>
      <p className="fact-body">{item.body}</p>
      <p className="names-refs">{item.refs.map((r) => <RefButton key={r} refString={r} />)}</p>
    </CardShell>
  )
}
