// data/commentary/{mhcc,jfb,mhc}-raw.json -> public/commentary/{source}/{BOOK}.json
//
// Gap-fill policy (controller amendment to Task 2 brief): Task 1's raw data is
// faithful to source labels, which under-partition chapters (e.g. MHCC John 3
// has ranges 1-8 and 22-36, but the 1-8 section's prose actually runs through
// v21). Within each (book, chapter), after sorting, extend each entry's vEnd
// to (next entry's vStart - 1) when there's a gap, and extend the last
// entry's vEnd to the chapter's final verse. Only EXTEND into gaps - never
// shrink or create new overlaps: an extension only happens when
// nextStart - 1 >= current vEnd. Applied to ALL sources.
//
// KJV-quote stripping (controller amendment to Task 2, mhc only): ~76% of mhc
// entries open with the embedded KJV passage text before Henry's exposition
// ("25 At that time Jesus answered…"). That's redundant (the app shows the
// WEB verse the user swiped from) and the wrong translation (KJV, not WEB).
// Strip leading paragraphs (split on \n\n) that begin with a verse number
// falling within the entry's [vStart, vEnd] (or equal to its chapter number,
// for chapter-heading quirks). Stop at the first paragraph that doesn't
// match. Never strip an entry below 40 chars — if stripping would, keep the
// original text and log it (this is a safety net; expect ~0 hits).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const CANON = JSON.parse(readFileSync('public/content/verses.json', 'utf8'))
const chapterMax = new Map() // 'GEN 1' -> last verse number that actually exists
const canonSet = new Set() // 'GEN 1:1' -> exists (this translation omits some KJV verse
// numbers mid-chapter, e.g. ACT 8:37, LUK 17:36, ACT 15:34, ACT 24:7)
for (const [b, c, v] of CANON) {
  const k = `${b} ${c}`
  if ((chapterMax.get(k) ?? 0) < v) chapterMax.set(k, v)
  canonSet.add(`${k}:${v}`)
}

function stripLeadingQuote(book, c, vStart, vEnd, text) {
  const paras = text.split('\n\n')
  let i = 0
  while (i < paras.length) {
    const m = paras[i].match(/^(\d{1,3})\b/)
    if (!m) break
    const n = Number(m[1])
    if (!((n >= vStart && n <= vEnd) || n === c)) break
    i++
  }
  if (i === 0) return { text, stripped: false }
  const candidate = paras.slice(i).join('\n\n')
  if (candidate.length < 40) {
    console.log(`mhc strip safeguard: ${book} ${c}:${vStart}-${vEnd} would drop below 40 chars — keeping original`)
    return { text, stripped: false, tooShort: true }
  }
  return { text: candidate, stripped: true }
}

for (const source of ['mhcc', 'jfb', 'mhc']) {
  const raw = JSON.parse(readFileSync(`data/commentary/${source}-raw.json`, 'utf8'))
  const byBook = new Map()
  let strippedCount = 0
  let tooShortCount = 0
  for (const e of raw) {
    let text = e.text
    if (source === 'mhc') {
      const r = stripLeadingQuote(e.book, e.c, e.vStart, e.vEnd, e.text)
      text = r.text
      if (r.stripped) strippedCount++
      if (r.tooShort) tooShortCount++
    }
    if (!byBook.has(e.book)) byBook.set(e.book, [])
    byBook.get(e.book).push([e.c, e.vStart, e.vEnd, text])
  }
  if (source === 'mhc') {
    console.log(
      `mhc: stripped leading KJV quote from ${strippedCount}/${raw.length} entries (${(
        (100 * strippedCount) /
        raw.length
      ).toFixed(1)}%); ${tooShortCount} kept original (<40-char safeguard)`,
    )
  }
  mkdirSync(`public/commentary/${source}`, { recursive: true })
  let total = 0
  for (const [book, entries] of byBook) {
    entries.sort((a, b) => a[0] - b[0] || a[1] - b[1])
    // Clamp: a few raw entries (Task 1, source-faithful) cite endpoints beyond
    // what this translation's canon has for that chapter (e.g. mhcc ROM 16
    // "24-27" but this translation's Romans 16 ends at v24; jfb JER 21
    // "1-44" heading but Jeremiah 21 ends at v14). Clamp both endpoints down
    // to the chapter's actual last verse so every endpoint resolves.
    for (const cur of entries) {
      const max = chapterMax.get(`${book} ${cur[0]}`)
      if (max !== undefined) {
        if (cur[1] > max) cur[1] = max
        if (cur[2] > max) cur[2] = max
      }
    }
    // Gap-fill (controller amendment): within each (book, chapter), after
    // sorting, extend each entry's vEnd to (next entry's vStart - 1) when
    // there's a gap; extend the last entry's vEnd to the chapter's final
    // verse. Only extend, never shrink or create overlaps: guarded by
    // `candidate > cur[2]` / `max > cur[2]`. When walking back from a gap's
    // upper bound, skip past any verse number this translation doesn't
    // actually have (mid-chapter omissions) so we never extend onto an
    // endpoint that fails to resolve.
    for (let i = 0; i < entries.length; i++) {
      const cur = entries[i]
      const next = entries[i + 1]
      if (next && next[0] === cur[0]) {
        let candidate = next[1] - 1
        while (candidate > cur[2] && !canonSet.has(`${book} ${cur[0]}:${candidate}`)) candidate--
        if (candidate > cur[2]) cur[2] = candidate
      } else {
        const max = chapterMax.get(`${book} ${cur[0]}`)
        if (max !== undefined && max > cur[2]) cur[2] = max
      }
    }
    const out = JSON.stringify(entries)
    // Per-book budgets raised from the brief's 122880/409600: after gap-fill,
    // MHCC's largest book (PSA) is 362848B and JFB's largest (ISA) is
    // 679404B, both legitimate coverage growth from filling verse gaps. mhc's
    // budget (8,388,608B / 8MiB per book, 50,331,648B / 48MiB whole-set) comes
    // from the Task 2 plan's Global Constraints — the unabridged Henry is
    // much larger than either abridged source.
    const budget = { mhcc: 393216, jfb: 786432, mhc: 8388608 }[source]
    if (out.length > budget) throw new Error(`${source}/${book}: ${out.length}B over budget`)
    writeFileSync(`public/commentary/${source}/${book}.json`, out)
    total += out.length
  }
  const totalBudget = { mhcc: 4194304, jfb: 16777216, mhc: 50331648 }[source]
  if (total > totalBudget) throw new Error(`${source} total ${total}B over budget`)
  console.log(`${source}: ${byBook.size} books, ${total}B`)
}
