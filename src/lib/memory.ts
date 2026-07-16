import { seededShuffle } from './rng'

const STOPWORDS = new Set([
  'the', 'and', 'that', 'with', 'your', 'shall', 'will', 'from', 'unto', 'them',
  'they', 'this', 'have', 'were', 'when', 'their', 'been', 'over', 'into', 'upon',
  'which', 'there', 'because', 'therefore', 'before', 'after', 'about', 'against',
])

export interface MemoryPuzzle {
  words: string[]
  blankIndexes: number[]
  answers: string[]
  bank: string[]
}

export function cleanWord(w: string): string {
  return w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}'']+$/gu, '')
}

function isSignificant(w: string): boolean {
  const c = cleanWord(w)
  return c.length >= 4 && !STOPWORDS.has(c.toLowerCase())
}

function blankCount(wordCount: number): number {
  if (wordCount < 15) return 2
  if (wordCount <= 28) return 3
  return 4
}

export function buildPuzzle(text: string, distractorSource: string[], seed: string): MemoryPuzzle {
  const words = text.split(/\s+/).filter(Boolean)
  const candidates = words.map((w, i) => ({ w, i })).filter(({ w }) => isSignificant(w))
  const want = Math.min(blankCount(words.length), candidates.length)

  // Seeded pick, enforcing non-adjacency greedily.
  const shuffled = seededShuffle(candidates, `${seed}:blanks`)
  const chosen: number[] = []
  for (const { i } of shuffled) {
    if (chosen.length >= want) break
    if (chosen.some((c) => Math.abs(c - i) <= 1)) continue
    chosen.push(i)
  }
  if (chosen.length === 0 && candidates.length > 0) chosen.push(candidates[0].i)
  chosen.sort((a, b) => a - b)

  const answers = chosen.map((i) => cleanWord(words[i]))
  const answerSet = new Set(answers.map((a) => a.toLowerCase()))

  const pool: string[] = []
  const poolSeen = new Set<string>()
  for (const t of distractorSource) {
    for (const w of t.split(/\s+/)) {
      if (!isSignificant(w)) continue
      const c = cleanWord(w)
      const lower = c.toLowerCase()
      if (answerSet.has(lower) || poolSeen.has(lower)) continue
      poolSeen.add(lower)
      pool.push(c)
    }
  }
  const distractors = seededShuffle(pool, `${seed}:bank`).slice(0, answers.length + 2)
  const bank = seededShuffle([...answers, ...distractors], `${seed}:mix`)
  return { words, blankIndexes: chosen, answers, bank }
}

export const DISTRACTOR_TEXTS: string[] = [
  'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.',
  'A Psalm by David. Yahweh is my shepherd; I shall lack nothing.',
  'Trust in Yahweh with all your heart, and don’t lean on your own understanding.',
  'but those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.',
  'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
  'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.',
  'Now faith is assurance of things hoped for, proof of things not seen.',
  '“Come to me, all you who labor and are heavily burdened, and I will give you rest.',
  'For the Chief Musician. By the sons of Korah. According to Alamoth. God is our refuge and strength, a very present help in trouble.',
  'For I know the thoughts that I think toward you,” says Yahweh, “thoughts of peace, and not of evil, to give you hope and a future.',
  'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith,',
  'for by grace you have been saved through faith, and that not of yourselves; it is the gift of God,',
  'NUN Your word is a lamp to my feet, and a light for my path.',
  'Love is patient and is kind. Love doesn’t envy. Love doesn’t brag, is not proud,',
  'Jesus said to him, “I am the way, the truth, and the life. No one comes to the Father, except through me.',
]
