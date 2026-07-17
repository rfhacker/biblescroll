import { RefButton } from './RefButton'
import type { PrayerItem } from '../../content/types'

export function PrayerCard({ item, theme }: { item: PrayerItem; theme: number }) {
  return (
    <article className={`card theme-${theme}`}>
      <div className="card-body">
        <div className="kicker">A moment of prayer</div>
        <p className="prayer-text">{item.prompt}</p>
        <RefButton refString={item.ref} />
      </div>
    </article>
  )
}
