import { vi } from 'vitest'
import { commentaryFor, loadCommentary, type CommentaryEntry } from './commentary'

const ENTRIES: CommentaryEntry[] = [
  [1, 1, 8, 'first section'],
  [1, 9, 13, 'second section'],
  [2, 1, 25, 'chapter two'],
]

test('commentaryFor finds the covering entry', () => {
  expect(commentaryFor(ENTRIES, 1, 1)![3]).toBe('first section')
  expect(commentaryFor(ENTRIES, 1, 8)![3]).toBe('first section')
  expect(commentaryFor(ENTRIES, 1, 9)![3]).toBe('second section')
  expect(commentaryFor(ENTRIES, 2, 20)![3]).toBe('chapter two')
  expect(commentaryFor(ENTRIES, 3, 1)).toBeNull()
  expect(commentaryFor(ENTRIES, 1, 14)).toBeNull()
})

test('loadCommentary fetches once per source:book and caches', async () => {
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
    () => Promise.resolve(new Response(JSON.stringify(ENTRIES), { status: 200 })),
  )
  const a = await loadCommentary('mhcc', 'GEN')
  const b = await loadCommentary('mhcc', 'GEN')
  expect(a).toEqual(ENTRIES)
  expect(b).toBe(a)
  expect(spy).toHaveBeenCalledTimes(1)
  await loadCommentary('jfb', 'GEN')
  expect(spy).toHaveBeenCalledTimes(2)
  spy.mockRestore()
})

test('loadCommentary dedupes concurrent in-flight requests for the same source:book', async () => {
  let resolveFetch!: (r: Response) => void
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
    () => new Promise((resolve) => { resolveFetch = resolve }),
  )
  const p1 = loadCommentary('mhcc', 'REV')
  const p2 = loadCommentary('mhcc', 'REV')
  resolveFetch(new Response(JSON.stringify(ENTRIES), { status: 200 }))
  const [a, b] = await Promise.all([p1, p2])
  expect(spy).toHaveBeenCalledTimes(1)
  expect(a).toBe(b)
  spy.mockRestore()
})

test('loadCommentary rejects on HTTP failure and malformed payloads, without caching them', async () => {
  const spy = vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockResolvedValueOnce(new Response('{"not":"array"}', { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(ENTRIES), { status: 200 }))
  await expect(loadCommentary('mhcc', 'EXO')).rejects.toThrow()
  await expect(loadCommentary('mhcc', 'EXO')).rejects.toThrow()
  await expect(loadCommentary('mhcc', 'EXO')).resolves.toEqual(ENTRIES)
  spy.mockRestore()
})
