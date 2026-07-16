import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import type { FactItem } from '../../content/types'

export function FactCard({ fact, theme }: { fact: FactItem; theme: number }) {
  return (
    <CardShell theme={theme} shareText={`${fact.title} — ${fact.body} (${fact.ref})`}
      fav={{ kind: 'fact', id: fact.id, title: fact.title, body: fact.body }}>
      <div className="kicker">Did you know?</div>
      <h2 className="fact-title">{fact.title}</h2>
      <p className="fact-body">{fact.body}</p>
      <RefButton refString={fact.ref} />
    </CardShell>
  )
}
