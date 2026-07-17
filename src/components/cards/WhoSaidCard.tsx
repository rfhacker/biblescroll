import { QuizCard } from './QuizCard'
import type { WhoSaidItem } from '../../content/types'

export function WhoSaidCard({ item, theme, onScore }: {
  item: WhoSaidItem; theme: number; onScore: () => void
}) {
  return (
    <QuizCard quiz={item} kicker="Who said it?"
      prompt={<blockquote className="quote-text">{"“"}{item.quote}{"”"}</blockquote>}
      shareText={`${"“"}${item.quote}${"”"} — who said it? (${item.ref})`}
      fav={{ kind: 'whosaid', id: item.id, title: `${"“"}${item.quote}${"”"}`, body: `${item.why} (${item.ref})` }}
      theme={theme} onScore={onScore} />
  )
}
