import { buildPuzzle, cleanWord, DISTRACTOR_TEXTS } from './memory'

const VERSE = 'The Lord is my shepherd: I shall lack nothing.'          // 9 words → 2 blanks
const LONG = Array.from({ length: 30 }, (_, i) => `wonderful${i}`).join(' ') // 30 words → 4 blanks
const OTHERS = ['For God so loved the world that he gave his only Son.',
  'Trust in the Lord with all your heart and lean not on your own understanding.']

test('cleanWord strips edge punctuation, keeps inner apostrophes', () => {
  expect(cleanWord('shepherd:')).toBe('shepherd')
  expect(cleanWord('“Come,')).toBe('Come')
  expect(cleanWord("don’t")).toBe("don’t")
})

test('puzzle is deterministic per seed and differs across seeds', () => {
  const a = buildPuzzle(VERSE, OTHERS, 's1')
  const b = buildPuzzle(VERSE, OTHERS, 's1')
  expect(b).toEqual(a)
  const c = buildPuzzle(VERSE, OTHERS, 's2')
  expect(JSON.stringify(c)).not.toBe(JSON.stringify(a))
})

test('blanks are significant, non-adjacent, count follows length', () => {
  const p = buildPuzzle(VERSE, OTHERS, 's1')
  expect(p.blankIndexes).toHaveLength(2)
  for (let i = 1; i < p.blankIndexes.length; i++) {
    expect(p.blankIndexes[i] - p.blankIndexes[i - 1]).toBeGreaterThan(1)
  }
  for (const bi of p.blankIndexes) {
    const w = cleanWord(p.words[bi])
    expect(w.length).toBeGreaterThanOrEqual(4)
    expect(['the', 'that', 'with', 'your', 'shall']).not.toContain(w.toLowerCase())
  }
  expect(buildPuzzle(LONG, OTHERS, 's1').blankIndexes).toHaveLength(4)
})

test('bank contains all answers plus distractors, deduped case-insensitively', () => {
  const p = buildPuzzle(VERSE, OTHERS, 's1')
  // answers + up to (answers.length + 2) distractors, capped by available unique pool
  expect(p.bank.length).toBeGreaterThanOrEqual(p.answers.length + 2)
  expect(p.bank.length).toBeLessThanOrEqual(p.answers.length * 2 + 2)
  for (const a of p.answers) expect(p.bank).toContain(a)
  const lower = p.bank.map((w) => w.toLowerCase())
  expect(new Set(lower).size).toBe(lower.length)
  // distractors come from the other texts' significant words
  const sourceWords = new Set(OTHERS.join(' ').split(/\s+/).map((w) => cleanWord(w).toLowerCase()))
  for (const w of p.bank) {
    if (!p.answers.includes(w)) expect(sourceWords.has(w.toLowerCase())).toBe(true)
  }
})

test('verse with few significant words still yields at least one blank', () => {
  const p = buildPuzzle('And he said to me, it is done.', OTHERS, 's1')
  expect(p.blankIndexes.length).toBeGreaterThanOrEqual(1)
})

test('clustered significant candidates still reach the target blank count (maximal non-adjacent selection)', () => {
  const t = 'so much wonderful gracious blessing at it he up' // 9 words → want 2
  const words = t.split(/\s+/)
  const significant = words.filter((w) => cleanWord(w).length >= 4)
  // sanity: the significant words form a contiguous adjacent cluster
  expect(significant).toEqual(['much', 'wonderful', 'gracious', 'blessing'])
  for (let i = 0; i < 20; i++) {
    const p = buildPuzzle(t, OTHERS, `s${i}`)
    expect(p.blankIndexes.length).toBe(2)
    for (let j = 1; j < p.blankIndexes.length; j++) {
      expect(p.blankIndexes[j] - p.blankIndexes[j - 1]).toBeGreaterThan(1)
    }
  }
})

test('EXO 20:3 style verse with only one non-adjacent-capable pair yields exactly 1 blank', () => {
  const t = '“You shall have no other gods before me.'
  for (let i = 0; i < 10; i++) {
    const p = buildPuzzle(t, OTHERS, `s${i}`)
    expect(p.blankIndexes.length).toBe(1)
  }
})

test('zero significant words still yields exactly one blank (longest word chosen)', () => {
  const p = buildPuzzle('a is of it to in', [], 'x')
  expect(p.blankIndexes.length).toBe(1)
})

test('DISTRACTOR_TEXTS contains at least 15 entries, each with length > 20', () => {
  expect(DISTRACTOR_TEXTS.length).toBeGreaterThanOrEqual(15)
  for (const text of DISTRACTOR_TEXTS) {
    expect(text.length).toBeGreaterThan(20)
  }
})
