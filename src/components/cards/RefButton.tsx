import { useContext } from 'react'
import { ChapterContext } from '../ChapterContext'
import { parseLooseRef } from '../../content/verseStore'

export function RefButton({ refString }: { refString: string }) {
  const { openChapter } = useContext(ChapterContext)
  const r = parseLooseRef(refString)
  return (
    <button className="verse-ref verse-ref-btn"
      onClick={() => { if (r) openChapter(r.b, r.c, r.v) }}>
      {refString} ›
    </button>
  )
}
