import { CardShell } from './CardShell'
import { RefButton } from './RefButton'
import { looseRefText, type VerseStore } from '../../content/verseStore'
import type { ProphecyItem } from '../../content/types'

export function ProphecyCard({ item, verses, theme }: {
  item: ProphecyItem; verses: VerseStore; theme: number
}) {
  return (
    <CardShell theme={theme}
      shareText={`Foretold (${item.prophecyRef}) and fulfilled (${item.fulfillmentRef}): ${item.note}`}
      fav={{ kind: 'prophecy', id: item.id, title: `${item.prophecyRef} → ${item.fulfillmentRef}`, body: item.note }}>
      <div className="kicker">Prophecy · Fulfilled</div>
      <div className="pf-block">
        <div className="pf-label">Foretold — {item.prophecyRef}</div>
        <p className="pf-text">{looseRefText(verses, item.prophecyRef)}</p>
      </div>
      <div className="pf-block">
        <div className="pf-label">Fulfilled — {item.fulfillmentRef}</div>
        <p className="pf-text">{looseRefText(verses, item.fulfillmentRef)}</p>
      </div>
      <p className="pf-note">{item.note}</p>
      <p className="names-refs">
        <RefButton refString={item.prophecyRef} />
        <RefButton refString={item.fulfillmentRef} />
      </p>
    </CardShell>
  )
}
