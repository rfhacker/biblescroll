import { QuizCard } from './QuizCard'
import type { ContinueItem } from '../../content/types'

export function ContinueCard({ item, theme, onScore }: {
  item: ContinueItem; theme: number; onScore: () => void
}) {
  return (
    <QuizCard quiz={{ id: item.id, choices: item.endings, answer: item.answer, why: item.why, ref: item.ref }}
      kicker="Continue the verse"
      prompt={<p className="verse-text">{item.stem} …</p>}
      shareText={`${item.stem} … (${item.ref})`}
      fav={{ kind: 'continue', id: item.id, title: `${item.stem} …`, body: `${item.endings[item.answer]} (${item.ref})` }}
      theme={theme} onScore={onScore} />
  )
}
