import { describe, test, expect, vi } from 'vitest'
import { crossRefsFor, loadCrossRefs, type CrossRefEntry } from './crossrefs'

const ENTRIES: CrossRefEntry[] = [
  [3, 16, [['ROM', 5, 8], ['1JN', 4, 9, 10]]],
  [3, 17, [['JHN', 12, 47]]],
]

describe('crossrefs', () => {
  test('crossRefsFor exact-verse lookup', () => {
    expect(crossRefsFor(ENTRIES, 3, 16)).toEqual([['ROM', 5, 8], ['1JN', 4, 9, 10]])
    expect(crossRefsFor(ENTRIES, 3, 18)).toBeNull()
    expect(crossRefsFor(ENTRIES, 4, 16)).toBeNull()
  })

  test('loadCrossRefs caches results and dedups in-flight calls', async () => {
    let resolveFetch!: (r: Response) => void
    const spy = vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolveFetch = res }) as Promise<Response>)
    const p1 = loadCrossRefs('GEN')
    const p2 = loadCrossRefs('GEN')
    resolveFetch(new Response(JSON.stringify(ENTRIES), { status: 200 }))
    const [a, b] = await Promise.all([p1, p2])
    expect(a).toBe(b)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(await loadCrossRefs('GEN')).toBe(a)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  test('failures are not cached', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(ENTRIES), { status: 200 }))
    await expect(loadCrossRefs('EXO')).rejects.toThrow()
    await expect(loadCrossRefs('EXO')).resolves.toEqual(ENTRIES)
    vi.restoreAllMocks()
  })
})
