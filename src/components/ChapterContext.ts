import { createContext } from 'react'

export const ChapterContext = createContext<{
  openChapter: (b: string, c: number, v?: number) => void
}>({ openChapter: () => {} })
