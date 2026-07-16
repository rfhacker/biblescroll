#!/usr/bin/env node
// Vendors two public-domain commentaries (Matthew Henry's Concise Commentary,
// and Jamieson-Fausset-Brown) from CCEL's ThML/XML editions and normalizes
// them into data/commentary/{mhcc,jfb}-raw.json.
//
// Output shape: Array<{ book: string /* USFM code */, c: number, vStart: number,
//   vEnd: number, text: string }>, sorted by canonical book order then (c, vStart).
//
// Source decision (see .superpowers/sdd/comm-task-1-report.md for full detail):
// Step 1 of the brief's decision tree (CCEL ThML/XML single-file downloads)
// succeeded outright for both works, so Steps 2/3 (TheologAI SQLite, HTML
// scrape) were never needed.
//
//   MHCC: https://www.ccel.org/ccel/henry/mhcc.xml
//   JFB:  https://www.ccel.org/ccel/jamieson/jfb.xml
//
// Re-running this script re-uses cached downloads (system temp dir) and is
// deterministic given the same cached inputs.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const CACHE_DIR = join(tmpdir(), "biblescroll-commentary-cache");
const OUT_DIR = join(REPO_ROOT, "data", "commentary");

const SOURCES = {
  mhcc: {
    url: "https://www.ccel.org/ccel/henry/mhcc.xml",
    cacheFile: join(CACHE_DIR, "mhcc.xml"),
    outFile: join(OUT_DIR, "mhcc-raw.json"),
    minEntries: 2000,
    requireAllBooks: true,
  },
  jfb: {
    url: "https://www.ccel.org/ccel/jamieson/jfb.xml",
    cacheFile: join(CACHE_DIR, "jfb.xml"),
    outFile: join(OUT_DIR, "jfb-raw.json"),
    minEntries: 10000,
    requireAllBooks: false, // >= 60 required
  },
};

// ---------------------------------------------------------------------------
// 66-entry book-abbreviation -> USFM map.
//
// The brief anticipated needing to map English book *titles* (as they'd
// appear in section headings like "Verses 1-8") by inverting src/content/books.ts.
// In practice, both CCEL ThML editions tag every commentary section with a
// machine-readable `parsed="|<Abbrev>|<cStart>|<vStart>|<cEnd>|<vEnd>|"`
// attribute on <scripCom>/<scripRef> elements, using a fixed set of Logos-style
// abbreviations. That is both more precise and more robust than title parsing
// (no ambiguity between "Psalm"/"Psalms" etc.), so this map targets those
// abbreviations directly. It still covers exactly the 66 canonical books.
// ---------------------------------------------------------------------------
const BOOK_MAP = {
  Gen: "GEN", Exod: "EXO", Lev: "LEV", Num: "NUM", Deut: "DEU",
  Josh: "JOS", Judg: "JDG", Ruth: "RUT", "1Sam": "1SA", "2Sam": "2SA",
  "1Kgs": "1KI", "2Kgs": "2KI", "1Chr": "1CH", "2Chr": "2CH",
  Ezra: "EZR", Neh: "NEH", Esth: "EST", Job: "JOB", Ps: "PSA", Prov: "PRO",
  Eccl: "ECC", Song: "SNG", Isa: "ISA", Jer: "JER",
  Lam: "LAM", Ezek: "EZK", Dan: "DAN", Hos: "HOS", Joel: "JOL",
  Amos: "AMO", Obad: "OBA", Jonah: "JON", Mic: "MIC", Nah: "NAM", Hab: "HAB",
  Zeph: "ZEP", Hag: "HAG", Zech: "ZEC", Mal: "MAL",
  Matt: "MAT", Mark: "MRK", Luke: "LUK", John: "JHN", Acts: "ACT", Rom: "ROM",
  "1Cor": "1CO", "2Cor": "2CO", Gal: "GAL", Eph: "EPH",
  Phil: "PHP", Col: "COL", "1Thess": "1TH", "2Thess": "2TH",
  "1Tim": "1TI", "2Tim": "2TI", Titus: "TIT", Phlm: "PHM", Heb: "HEB",
  Jas: "JAS", "1Pet": "1PE", "2Pet": "2PE", "1John": "1JN", "2John": "2JN",
  "3John": "3JN", Jude: "JUD", Rev: "REV",
};

// Canonical book order (matches src/content/books.ts / verses.json order).
const CANONICAL_ORDER = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA",
  "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO",
  "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO",
  "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH",
  "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS",
  "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];
const BOOK_RANK = new Map(CANONICAL_ORDER.map((b, i) => [b, i]));

// CCEL's MHCC edition has a labeling bug: every <scripCom>/<scripRef> inside
// the "Jude" div1 uses the abbreviation "Judg" (Judges' abbreviation) instead
// of a distinct Jude token -- JFB does not have this bug (it uses "Jude").
// We detect this via the enclosing div's `title` attribute and override the
// abbreviation-derived book when they disagree for a known book title.
const TITLE_TO_BOOK = {
  Genesis: "GEN", Exodus: "EXO", Leviticus: "LEV", Numbers: "NUM", Deuteronomy: "DEU",
  Joshua: "JOS", Judges: "JDG", Ruth: "RUT",
  "1 Samuel": "1SA", "2 Samuel": "2SA", "First Samuel": "1SA", "Second Samuel": "2SA",
  "1 Kings": "1KI", "2 Kings": "2KI", "First Kings": "1KI", "Second Kings": "2KI",
  "1 Chronicles": "1CH", "2 Chronicles": "2CH", "First Chronicles": "1CH", "Second Chronicles": "2CH",
  Ezra: "EZR", Nehemiah: "NEH", Esther: "EST", Job: "JOB",
  Psalms: "PSA", Psalm: "PSA", Proverbs: "PRO", Ecclesiastes: "ECC",
  "Song of Solomon": "SNG", "Song of Songs": "SNG",
  Isaiah: "ISA", Jeremiah: "JER", Lamentations: "LAM", Ezekiel: "EZK", Daniel: "DAN",
  Hosea: "HOS", Joel: "JOL", Amos: "AMO", Obadiah: "OBA", Jonah: "JON", Micah: "MIC",
  Nahum: "NAM", Habakkuk: "HAB", Zephaniah: "ZEP", Haggai: "HAG", Zechariah: "ZEC", Malachi: "MAL",
  Matthew: "MAT", Mark: "MRK", Luke: "LUK", John: "JHN", Acts: "ACT", Romans: "ROM",
  "1 Corinthians": "1CO", "2 Corinthians": "2CO", "First Corinthians": "1CO", "Second Corinthians": "2CO",
  Galatians: "GAL", Ephesians: "EPH", Philippians: "PHP", Colossians: "COL",
  "1 Thessalonians": "1TH", "2 Thessalonians": "2TH", "First Thessalonians": "1TH", "Second Thessalonians": "2TH",
  "1 Timothy": "1TI", "2 Timothy": "2TI", "First Timothy": "1TI", "Second Timothy": "2TI",
  Titus: "TIT", Philemon: "PHM", Hebrews: "HEB", James: "JAS",
  "1 Peter": "1PE", "2 Peter": "2PE", "First Peter": "1PE", "Second Peter": "2PE",
  "1 John": "1JN", "2 John": "2JN", "3 John": "3JN",
  "First John": "1JN", "Second John": "2JN", "Third John": "3JN",
  Jude: "JUD", Revelation: "REV", "Revelation of John": "REV",
};

// The 5 KJV/TR variant verses that this app's canonical verse numbering
// omits outright (verses.json has no row for them). Source commentaries
// (written against the KJV/TR) sometimes cite these as range endpoints;
// per the brief, such endpoints must be widened by one verse so the omitted
// verse becomes an interior point, never a boundary.
const OMITTED_VARIANTS = new Set(["LUK|17|36", "ACT|8|37", "ACT|15|34", "ACT|24|7", "ROM|16|25"]);

// ---------------------------------------------------------------------------
// Download (cached)
// ---------------------------------------------------------------------------
async function fetchCached(name, { url, cacheFile }) {
  if (existsSync(cacheFile)) {
    console.log(`[${name}] using cached download: ${cacheFile}`);
    return readFileSync(cacheFile, "utf8");
  }
  console.log(`[${name}] fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`[${name}] fetch failed: HTTP ${res.status}`);
  const text = await res.text();
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, text, "utf8");
  console.log(`[${name}] downloaded ${text.length.toLocaleString()} chars -> cached at ${cacheFile}`);
  return text;
}

// ---------------------------------------------------------------------------
// Chapter-length lookup (from public/content/verses.json)
// ---------------------------------------------------------------------------
function buildLastVerseMap() {
  const raw = readFileSync(join(REPO_ROOT, "public", "content", "verses.json"), "utf8");
  /** @type {[string, number, number, string][]} */
  const rows = JSON.parse(raw);
  const map = new Map(); // "BOOK|c" -> maxVerse
  for (const [book, c, v] of rows) {
    const key = `${book}|${c}`;
    const prev = map.get(key) ?? 0;
    if (v > prev) map.set(key, v);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Text hygiene
// ---------------------------------------------------------------------------
const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’",
  ldquo: "“", rdquo: "”", hellip: "…",
};

function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, ent) => {
    if (ent[0] === "#") {
      const code = ent[1] === "x" || ent[1] === "X" ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      if (!Number.isNaN(code)) return String.fromCodePoint(code);
      return m;
    }
    return ENTITIES[ent] ?? m;
  });
}

function stripTags(html) {
  const noTags = html.replace(/<[^>]*>/g, " ");
  const decoded = decodeEntities(noTags);
  return decoded.replace(/[ \t\r\n]+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Range parsing / normalization
// ---------------------------------------------------------------------------
function parseRangeAttr(parsedAttr) {
  // format: "|Abbrev|cStart|vStart|cEnd|vEnd"
  const parts = parsedAttr.split("|");
  if (parts.length < 6) return null;
  const abbrev = parts[1];
  const book = BOOK_MAP[abbrev];
  if (!book) return null; // apocrypha or unrecognized token
  const cStart = parseInt(parts[2], 10);
  const vStart = parseInt(parts[3], 10);
  const cEnd = parseInt(parts[4], 10);
  const vEnd = parseInt(parts[5], 10);
  if (!Number.isFinite(cStart) || cStart <= 0) return null;
  return { book, cStart, vStart, cEnd, vEnd };
}

function normalizeRange(range, lastVerseMap, stats) {
  const { book, cStart } = range;
  let { vStart, cEnd, vEnd } = range;
  const effCEnd = cEnd === 0 ? cStart : cEnd;
  const crossChapter = effCEnd !== cStart;
  const lastVerse = (c) => lastVerseMap.get(`${book}|${c}`);

  const finalVStart = vStart === 0 ? 1 : vStart;
  let finalVEnd;
  if (crossChapter) {
    finalVEnd = lastVerse(cStart);
    stats.crossChapterClamps++;
  } else if (vEnd === 0) {
    finalVEnd = vStart === 0 ? lastVerse(cStart) : vStart;
  } else {
    finalVEnd = vEnd;
  }
  if (finalVEnd == null) return null; // unknown chapter (shouldn't happen for 66-book map)
  if (finalVEnd < finalVStart) finalVEnd = finalVStart;

  let out = { book, c: cStart, vStart: finalVStart, vEnd: finalVEnd };
  out = adjustOmittedVariantEndpoints(out, stats);
  return out;
}

function adjustOmittedVariantEndpoints(entry, stats) {
  const { book, c } = entry;
  let { vStart, vEnd } = entry;
  const startKey = `${book}|${c}|${vStart}`;
  const endKey = `${book}|${c}|${vEnd}`;
  const startOmitted = OMITTED_VARIANTS.has(startKey);
  const endOmitted = OMITTED_VARIANTS.has(endKey) && vEnd !== vStart;
  const soleOmitted = OMITTED_VARIANTS.has(startKey) && vStart === vEnd;
  if (soleOmitted) {
    vStart -= 1;
    vEnd += 1;
    stats.omittedVariantAdjustments.push(`${book} ${c}:${entry.vStart} (sole) -> ${vStart}-${vEnd}`);
  } else {
    if (startOmitted) {
      vStart -= 1;
      stats.omittedVariantAdjustments.push(`${book} ${c}:${entry.vStart} (start) -> ${vStart}`);
    }
    if (endOmitted) {
      vEnd += 1;
      stats.omittedVariantAdjustments.push(`${book} ${c}:${entry.vEnd} (end) -> ${vEnd}`);
    }
  }
  return { book, c, vStart, vEnd };
}

// ---------------------------------------------------------------------------
// Core ThML extraction
//
// Both editions use the same underlying convention: a self-closing
// <scripCom type="Commentary" parsed="|Book|c|v|c|v" /> tag announces the
// verse range for whatever <p>...</p> content comes next (regardless of
// whether that content is wrapped in its own <div class="Commentary"> or
// left as bare sibling paragraphs -- MHCC uses the div-wrapped style almost
// everywhere but falls back to bare paragraphs for a handful of books
// (e.g. Ecclesiastes); JFB uses bare paragraphs throughout, with scripCom
// markers sometimes trailing *inside* the previous div rather than
// preceding the next one). Div boundaries are therefore not load-bearing;
// what matters is: (a) scripCom always resets the "current range", (b) a
// paragraph whose content begins with a <scripRef> citation *also* resets
// the current range (this is how flat-style multi-paragraph sections such
// as MHCC's Ecclesiastes divide back into per-verse-range entries), and
// (c) crossing a <div1>/<div2>/<div3> boundary always flushes and clears
// the current range (so front-matter / book-title-page content preceding
// the first scripCom of a section is dropped rather than mis-attached to
// the previous chapter's last entry).
//
// Whole-chapter fallback (fixes a Critical review finding): both editions
// title every chapter-level div "Chapter N" (MHCC: div2 directly under a
// book's div1; JFB: div3 under a book-named div2). Some MHCC chapters have
// *no* scripCom tags anywhere in them (e.g. Psalm 23) -- every paragraph in
// them would previously have currentRange === null for the whole chapter
// and be silently discarded as "preface". We now track the enclosing
// chapter (book + chapter number, derived from the same div-title/TITLE_TO_BOOK
// tracking already used for the Jude/Judges fix) separately from the
// scripCom-derived currentRange. Any paragraph that arrives with
// currentRange === null *while inside a known chapter* accumulates into a
// whole-chapter entry {book, c, vStart: 1, vEnd: <last verse of c>} instead
// of being dropped -- this also correctly captures unlabeled *leading*
// paragraphs (chapter introductions) in chapters that otherwise do have
// scripCom-ranged entries, without mis-attaching them to the first range.
// True front matter (title-page prose etc. before any chapter div, or
// inside non-chapter divs such as book overviews/indexes) has no enclosing
// chapter and is still skipped as preface.
// ---------------------------------------------------------------------------
function extractEntries(xml, sourceName, lastVerseMap) {
  const stats = {
    crossChapterClamps: 0,
    omittedVariantAdjustments: [],
    apocryphaSkipped: 0,
    prefaceParagraphsSkipped: 0,
    droppedShort: 0,
    fallbackEntriesCreated: 0,
    chapterNumberOverrides: 0,
  };

  // Remove self-closed empty spacer paragraphs (<p id="..." />) up front --
  // otherwise the paragraph-capturing regex below would treat them as an
  // unclosed opening tag and swallow everything up to the next real </p>.
  let cleaned = xml.replace(/<p\b[^>]*\/>/g, "");

  // Exclude decorative <table>...</table> blocks (e.g. Genesis 1's creation-
  // week summary table) from paragraph capture -- these aren't tied to a
  // single verse range and would otherwise pollute whatever range happens
  // to be active.
  const tableRanges = [];
  {
    const tableRe = /<table\b[^>]*>[\s\S]*?<\/table>/g;
    let tm;
    while ((tm = tableRe.exec(cleaned))) {
      tableRanges.push([tm.index, tm.index + tm[0].length]);
    }
  }
  const inTable = (idx) => tableRanges.some(([s, e]) => idx >= s && idx < e);

  const events = [];

  // div1/div2/div3 open tags => hard boundary (flush + clear range).
  // Capture `title="..."` too, to detect/fix the MHCC Jude/Judges abbreviation collision.
  {
    const boundRe = /<div[123]\b([^>]*)>/g;
    let bm;
    while ((bm = boundRe.exec(cleaned))) {
      const titleMatch = /title="([^"]*)"/.exec(bm[1]);
      events.push({ pos: bm.index, type: "boundary", title: titleMatch ? titleMatch[1] : null });
    }
  }

  // scripCom => range reset.
  {
    const scRe = /<scripCom type="Commentary"[^>]*?parsed="([^"]*)"[^>]*\/>/g;
    let sm;
    while ((sm = scRe.exec(cleaned))) {
      events.push({ pos: sm.index, type: "scripCom", parsed: sm[1] });
    }
  }

  // paragraphs (non-nesting <p>...</p>), excluding those inside tables.
  {
    const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/g;
    let pm;
    while ((pm = pRe.exec(cleaned))) {
      if (inTable(pm.index)) continue;
      events.push({ pos: pm.index, type: "p", raw: pm[1] });
    }
  }

  events.sort((a, b) => a.pos - b.pos);

  const rawEntries = [];
  let currentRange = null; // {book,cStart,vStart,cEnd,vEnd}
  let sectionHasScripCom = false;
  let buffer = [];
  let currentTitleBook = null;
  let titleBookOverrides = 0;

  // Whole-chapter fallback state (see comment above extractEntries).
  let currentChapterBook = null;
  let currentChapterNum = null;
  let chapterBuffer = [];
  const chapterTitleRe = /^(?:Chapter|Psalm)\s+(\d+)$/i;

  // Book-level deferred buffer: MHCC's "2 Chronicles" (unlike every other
  // book, including its sibling "2 Kings") has no separate "Chapter 1" div
  // at all -- its chapter-1 prose sits directly under the book's own div1,
  // and the first div2 encountered is already titled "Chapter 2". We can't
  // tell, at the time we see bare paragraphs directly under a book's title
  // div, whether they are (a) genuine book-overview front matter (the
  // common case -- a real "Chapter 1" div follows) or (b) unwrapped
  // chapter-1 content (the "2 Chronicles" case -- the first chapter div is
  // "Chapter 2"). So we buffer them and resolve on seeing the book's first
  // chapter div: discard as preface if that div is "Chapter 1" (real
  // Chapter 1 owns its own content), else emit as the whole-chapter-1
  // fallback entry.
  let bookLevelBook = null;
  let bookLevelBuffer = [];
  let sawFirstChapterInBook = false;

  // NOTE: this override is intentionally narrow (Jude/Judges only). JFB
  // legitimately places Gospel-harmony commentary on a *parallel* passage
  // (e.g. discussing Luke 3 within a Matthew chapter, or Mark within John)
  // inside another book's div -- overriding book-from-abbreviation with
  // book-from-enclosing-title generally would silently mis-file those
  // (correctly-tagged) cross-references. MHCC's Jude div, by contrast, has
  // every single scripCom/scripRef inside it mistagged as "Judg" (Judges'
  // abbreviation) -- there is no legitimate Judges content inside a div
  // titled "Jude", so this one substitution is safe.
  const applyTitleOverride = (parsed) => {
    if (parsed && currentTitleBook === "JUD" && parsed.book === "JDG") {
      parsed = { ...parsed, book: "JUD" };
      titleBookOverrides++;
    }
    return parsed;
  };

  // Another narrow, source-typo override: MHCC's Isaiah 36 div (title
  // "Chapter 36") opens with a bare whole-chapter self-reference scripCom
  // (parsed="|Isa|26|0|0|0", vStart/cEnd/vEnd all 0) that cites chapter 26
  // instead of 36 -- a one-off transposition typo (verified: this exact
  // mismatch pattern occurs exactly once in the entire MHCC+JFB corpus).
  // Every OTHER chapter div's leading whole-chapter self-reference scripCom
  // correctly cites its own enclosing chapter (e.g. Isaiah 37's div opens
  // with parsed="|Isa|37|0|0|0"), so trusting the enclosing div's chapter
  // number over a same-book, first-in-chapter, whole-chapter scripCom is
  // safe and narrowly scoped -- it cannot touch legitimate cross-book or
  // cross-chapter citations (those aren't bare whole-chapter self-refs, or
  // aren't first in their chapter, or aren't same-book).
  const applyChapterNumberOverride = (parsed) => {
    if (
      parsed &&
      currentChapterBook &&
      currentChapterNum != null &&
      !sectionHasScripCom &&
      chapterBuffer.length === 0 &&
      parsed.book === currentChapterBook &&
      parsed.vStart === 0 &&
      parsed.cEnd === 0 &&
      parsed.vEnd === 0 &&
      parsed.cStart !== currentChapterNum
    ) {
      parsed = { ...parsed, cStart: currentChapterNum };
      stats.chapterNumberOverrides++;
    }
    return parsed;
  };

  const flush = () => {
    if (currentRange && buffer.length) {
      const normalized = normalizeRange(currentRange, lastVerseMap, stats);
      if (normalized) {
        rawEntries.push({ ...normalized, text: buffer.join("\n\n") });
      }
    }
    buffer = [];
  };

  const pushWholeChapterEntry = (book, c, textParts) => {
    if (!textParts.length) return;
    const vEnd = lastVerseMap.get(`${book}|${c}`);
    if (vEnd == null) {
      throw new Error(`[${sourceName}] whole-chapter fallback: unknown chapter ${book} ${c} (not in verses.json)`);
    }
    // Variant-endpoint rule: chapter lengths come from the corpus, which
    // already excludes the 5 omitted-variant verses, so neither endpoint
    // of a whole-chapter range should ever land on one -- assert it.
    if (OMITTED_VARIANTS.has(`${book}|${c}|1`) || OMITTED_VARIANTS.has(`${book}|${c}|${vEnd}`)) {
      throw new Error(`[${sourceName}] whole-chapter fallback ${book} ${c} (1-${vEnd}) ends on an omitted variant verse`);
    }
    rawEntries.push({ book, c, vStart: 1, vEnd, text: textParts.join("\n\n") });
    stats.fallbackEntriesCreated++;
  };

  const flushChapter = () => {
    if (currentChapterBook && currentChapterNum != null) {
      pushWholeChapterEntry(currentChapterBook, currentChapterNum, chapterBuffer);
    }
    chapterBuffer = [];
  };

  const leadingScripRefRe = /^\s*(?:<b>\s*)?<scripRef\b[^>]*\bparsed="([^"]*)"[^>]*>/;

  for (const ev of events) {
    if (ev.type === "boundary") {
      flush();
      flushChapter();
      currentRange = null;
      sectionHasScripCom = false;

      const isNewBookTitle = ev.title && TITLE_TO_BOOK[ev.title];
      if (isNewBookTitle) {
        // Entering a new book-level div. Any still-pending book-level
        // buffer from the previous book (shouldn't happen -- every book has
        // at least one chapter div) is unresolvable, so treat as preface.
        if (bookLevelBuffer.length) {
          stats.prefaceParagraphsSkipped += bookLevelBuffer.length;
          bookLevelBuffer = [];
        }
        currentTitleBook = TITLE_TO_BOOK[ev.title];
        bookLevelBook = currentTitleBook;
        sawFirstChapterInBook = false;
      }

      const chMatch = ev.title ? chapterTitleRe.exec(ev.title) : null;
      if (chMatch && currentTitleBook) {
        const chNum = parseInt(chMatch[1], 10);
        if (bookLevelBook === currentTitleBook && !sawFirstChapterInBook) {
          sawFirstChapterInBook = true;
          if (bookLevelBuffer.length) {
            if (chNum === 1) {
              // Real "Chapter 1" div follows -> the buffered book-level
              // paragraphs were genuine front matter/overview.
              stats.prefaceParagraphsSkipped += bookLevelBuffer.length;
            } else {
              // No separate "Chapter 1" div exists -- the buffered
              // book-level paragraphs ARE chapter 1's content.
              pushWholeChapterEntry(currentTitleBook, 1, bookLevelBuffer);
            }
            bookLevelBuffer = [];
          }
        }
        currentChapterBook = currentTitleBook;
        currentChapterNum = chNum;
      } else {
        currentChapterBook = null;
        currentChapterNum = null;
      }
      continue;
    }
    if (ev.type === "scripCom") {
      flush();
      let parsed = parseRangeAttr(ev.parsed);
      parsed = applyTitleOverride(parsed);
      parsed = applyChapterNumberOverride(parsed);
      if (parsed === null) {
        currentRange = null;
        stats.apocryphaSkipped++;
      } else {
        currentRange = parsed;
        sectionHasScripCom = true;
      }
      continue;
    }
    // paragraph
    const strippedProbe = stripTags(ev.raw);
    if (strippedProbe === "" || /^CHAPTER\s+\d+$/i.test(strippedProbe)) {
      continue; // blank spacer / decorative chapter-number heading
    }
    if (sectionHasScripCom) {
      const m = leadingScripRefRe.exec(ev.raw);
      if (m) {
        let parsed = parseRangeAttr(m[1]);
        parsed = applyTitleOverride(parsed);
        if (parsed) {
          flush();
          currentRange = parsed;
        }
      }
    }
    if (currentRange === null) {
      if (currentChapterBook && currentChapterNum != null) {
        chapterBuffer.push(strippedProbe);
      } else if (bookLevelBook && !sawFirstChapterInBook) {
        // Directly under a known book's title div, before its first
        // chapter div -- defer the decision (preface vs. unwrapped
        // chapter-1 content) to when that first chapter div is seen.
        bookLevelBuffer.push(strippedProbe);
      } else {
        stats.prefaceParagraphsSkipped++;
      }
      continue;
    }
    buffer.push(strippedProbe);
  }
  flush();
  flushChapter();
  // Any book-level buffer still pending at end-of-document (shouldn't
  // happen) is unresolvable -- count as preface rather than lose it silently.
  stats.prefaceParagraphsSkipped += bookLevelBuffer.length;
  stats.titleBookOverrides = titleBookOverrides;

  // Hygiene: drop anything that still has a stray '<' (shouldn't happen) or
  // is under the 40-char floor (can't invent text, so drop rather than pad).
  const hygienic = [];
  for (const e of rawEntries) {
    if (e.text.includes("<")) {
      throw new Error(`[${sourceName}] entry ${e.book} ${e.c}:${e.vStart}-${e.vEnd} still contains '<' after stripping`);
    }
    if (e.text.length < 40) {
      stats.droppedShort++;
      continue;
    }
    hygienic.push(e);
  }

  hygienic.sort((a, b) => {
    const rb = BOOK_RANK.get(a.book) - BOOK_RANK.get(b.book);
    if (rb !== 0) return rb;
    if (a.c !== b.c) return a.c - b.c;
    return a.vStart - b.vStart;
  });

  return { entries: hygienic, stats };
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------
function runAssertions(name, entries, cfg, chapterList) {
  const booksPresent = new Set(entries.map((e) => e.book));
  const missing = CANONICAL_ORDER.filter((b) => !booksPresent.has(b));

  console.log(`\n[${name}] entries: ${entries.length}, books present: ${booksPresent.size}/66`);

  // Whole-chapter fallback regression guard: every canonical chapter (per
  // public/content/verses.json) must be covered by at least one entry.
  // Before the fallback fix, chapters with no scripCom tags at all (e.g.
  // MHCC's Psalm 23) had zero entries and were silently dropped.
  const chaptersCovered = new Set(entries.map((e) => `${e.book}|${e.c}`));
  const missingChapters = chapterList.filter((key) => !chaptersCovered.has(key));
  if (missingChapters.length > 0) {
    throw new Error(
      `[${name}] ${missingChapters.length} canonical chapter(s) with zero entries: ${missingChapters.slice(0, 20).join(", ")}${missingChapters.length > 20 ? ", ..." : ""}`
    );
  }
  console.log(`[${name}] chapter coverage: 0/${chapterList.length} missing`);

  if (cfg.requireAllBooks) {
    if (missing.length > 0) {
      throw new Error(`[${name}] missing books: ${missing.join(", ")}`);
    }
  } else if (booksPresent.size < 60) {
    throw new Error(`[${name}] only ${booksPresent.size} books present (need >= 60); missing: ${missing.join(", ")}`);
  } else if (missing.length > 0) {
    console.log(`[${name}] missing ${missing.length} book(s) (allowed, >= 60 required): ${missing.join(", ")}`);
  }

  if (entries.length < cfg.minEntries) {
    throw new Error(`[${name}] only ${entries.length} entries (need >= ${cfg.minEntries})`);
  }

  for (const e of entries) {
    if (e.text.length < 40) throw new Error(`[${name}] entry text < 40 chars: ${e.book} ${e.c}:${e.vStart}`);
    if (e.text.includes("<")) throw new Error(`[${name}] entry text contains '<': ${e.book} ${e.c}:${e.vStart}`);
  }

  // per-book counts
  const counts = new Map();
  for (const e of entries) counts.set(e.book, (counts.get(e.book) ?? 0) + 1);
  console.log(`[${name}] per-book entry counts:`);
  for (const b of CANONICAL_ORDER) {
    if (counts.has(b)) console.log(`  ${b}: ${counts.get(b)}`);
  }
  if (missing.length) console.log(`  (missing: ${missing.join(", ")})`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const lastVerseMap = buildLastVerseMap();
  const chapterList = [...lastVerseMap.keys()];
  mkdirSync(OUT_DIR, { recursive: true });

  const results = {};
  const names = Object.keys(SOURCES);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const cfg = SOURCES[name];
    const xml = await fetchCached(name, cfg);
    const { entries, stats } = extractEntries(xml, name, lastVerseMap);
    console.log(`[${name}] stats:`, {
      crossChapterClamps: stats.crossChapterClamps,
      apocryphaSkipped: stats.apocryphaSkipped,
      prefaceParagraphsSkipped: stats.prefaceParagraphsSkipped,
      droppedShort: stats.droppedShort,
      titleBookOverrides: stats.titleBookOverrides,
      fallbackEntriesCreated: stats.fallbackEntriesCreated,
      chapterNumberOverrides: stats.chapterNumberOverrides,
      omittedVariantAdjustments: stats.omittedVariantAdjustments,
    });
    runAssertions(name, entries, cfg, chapterList);
    results[name] = entries;
    if (i < names.length - 1) await new Promise((r) => setTimeout(r, 300));
  }

  for (const name of names) {
    const cfg = SOURCES[name];
    const json = JSON.stringify(results[name]);
    writeFileSync(cfg.outFile, json, "utf8");
    console.log(`[${name}] wrote ${cfg.outFile} (${(json.length / 1024).toFixed(0)} KB, ${results[name].length} entries)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
