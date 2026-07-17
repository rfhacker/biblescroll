import { QuizCard } from './QuizCard'
import type { TriviaItem } from '../../content/types'

export function TriviaCard({ item, theme, onScore }: {
  item: TriviaItem; theme: number; onScore: () => void
}) {
  return (
    <QuizCard quiz={item} kicker={`Trivia · ${item.difficulty}`}
      prompt={<h2 className="trivia-q">{item.q}</h2>}
      shareText={`${item.q} (${item.ref})`}
      fav={{ kind: 'trivia', id: item.id, title: item.q, body: `${item.why} (${item.ref})` }}
      theme={theme} onScore={onScore} />
  )
}
