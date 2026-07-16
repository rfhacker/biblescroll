#!/usr/bin/env node
// Vendors the Treasury of Scripture Knowledge (TSK) cross-reference dataset
// and normalizes it into data/crossrefs-raw.json.
//
// Output shape: Array<{ book: string /* USFM code */, c: number, v: number,
//   refs: [string, number, number, number?][] }>, sorted canonically by
//   (book, c, v); refs preserve TSK's own order within each anchor verse.
//
// Source decision (see .superpowers/sdd/xr-task-1-report.md for full detail):
// Step (a) of the brief's decision tree succeeded: a machine-readable,
// public-domain TSK export is vendored on GitHub at
//   https://github.com/ariseshinestudio/TSK  (mirrored byte-identically at
//   https://github.com/narthur/tsk-cli)
// Both repos ship the same `tskxref.txt` (JustVerses.com's ~2011 TSK export,
// described by ariseshinestudio/TSK as "Treasury of Scripture Knowledge
// (original), Provider: JustVerses.com, License: Public Domain, References:
// ~382,000") plus a readme.txt documenting the exact column layout and the
// 66-entry book_key/abbreviation tables reproduced below. This is genuinely
// the classic 1880 Canne/Browne/Blayney/Scott TSK compilation (matching the
// same public-domain work CrossWire separately packages as its SWORD "TSK"
// module -- crosswire.org/sword/modules/ModInfo.jsp?modName=TSK -- which
// independently confirms provenance/public-domain status), NOT the
// differently-licensed openbible.info cross-reference set (CC-BY; several
// other repos, e.g. scrollmapper/bible_databases, vendor *that* dataset
// instead and explicitly credit openbible.info -- rejected as a fallback
// per the brief's provenance requirement, so this script never touches it).
// The CrossWire SWORD module itself was fetched too (as decision-tree step
// (b)) and confirmed real, but is a compressed zCom module (BlockType=BOOK,
// SourceType=ThML) requiring a bespoke binary-block decompressor -- since
// step (a) already produced a clean, directly-parseable, better-provenance
// text file, the SWORD module was not needed and is not used here.
//
// tskxref.txt is TAB-delimited, one row per TSK *phrase* annotation (not
// one row per anchor verse -- a verse with N annotated phrases has N rows,
// each carrying that phrase's own reference list; sort_order gives their
// display order). Columns: book_key(1-66) \t chapter \t verse \t sort_order
// \t word/phrase (ignored -- ref texts come from the WEB store at render
// time, per the plan) \t reference_list. reference_list is a lowercase,
// semicolon-delimited list of citations in the dataset's own compact
// abbreviation form, e.g. "ps 34:8;isa 40:26;isa 40:28" or with per-chapter
// comma/hyphen verse lists, e.g. "ps 33:6,9;job 38:22-26".
//
// Re-running this script reuses the cached download (system temp dir) and
// is deterministic given the same cached input.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const CACHE_DIR = join(tmpdir(), "biblescroll-commentary-cache");
const CACHE_FILE = join(CACHE_DIR, "tskxref.txt");
const OUT_FILE = join(REPO_ROOT, "data", "crossrefs-raw.json");
const SOURCE_URL = "https://raw.githubusercontent.com/ariseshinestudio/TSK/main/tskxref.txt";

// ---------------------------------------------------------------------------
// Canonical book order + book_key (1-66, Genesis..Revelation) -> USFM.
// tskxref.txt's book_key column uses exactly this order (see readme.txt);
// deuterocanonical/apocryphal books, if any ever appeared, would number
// starting after 66 -- the brief's "apocryphal" drop bucket below guards
// that even though none are present in the vendored file today.
// ---------------------------------------------------------------------------
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

// tskxref.txt's own reference-list abbreviations (from readme.txt's table),
// lowercase -> USFM. These are NOT OSIS/USFM abbreviations (e.g. Judges is
// "jud" while Jude is "jude"; Song of Solomon is "so") -- this table is the
// "internal table incl. TSK's abbreviation quirks" the brief calls for.
const ABBR_TO_USFM = {
  ge: "GEN", ex: "EXO", le: "LEV", nu: "NUM", de: "DEU", jos: "JOS", jud: "JDG", ru: "RUT",
  "1sa": "1SA", "2sa": "2SA", "1ki": "1KI", "2ki": "2KI", "1ch": "1CH", "2ch": "2CH",
  ezr: "EZR", ne: "NEH", es: "EST", job: "JOB", ps: "PSA", pr: "PRO", ec: "ECC", so: "SNG",
  isa: "ISA", jer: "JER", la: "LAM", eze: "EZK", da: "DAN", ho: "HOS", joe: "JOL", am: "AMO",
  ob: "OBA", jon: "JON", mic: "MIC", na: "NAM", hab: "HAB", zep: "ZEP", hag: "HAG", zec: "ZEC",
  mal: "MAL", mt: "MAT", mr: "MRK", lu: "LUK", joh: "JHN", ac: "ACT", ro: "ROM",
  "1co": "1CO", "2co": "2CO", ga: "GAL", eph: "EPH", php: "PHP", col: "COL",
  "1th": "1TH", "2th": "2TH", "1ti": "1TI", "2ti": "2TI", tit: "TIT", phm: "PHM", heb: "HEB",
  jas: "JAS", "1pe": "1PE", "2pe": "2PE", "1jo": "1JN", "2jo": "2JN", "3jo": "3JN",
  jude: "JUD", re: "REV",
};

// The 5 KJV/TR variant verses this app's canonical verse numbering omits
// outright (verses.json has no row for them, and Romans 16 stops at v24 --
// the whole disputed doxology unit is absent, not just v25). Per the brief,
// these must never appear as anchors or targets -- dropped either way, never
// remapped/widened (unlike the commentary vendoring task, which widens
// range endpoints; this task's brief says DROP, not invent an adjustment).
const OMITTED_VARIANTS = new Set(["LUK|17|36", "ACT|8|37", "ACT|15|34", "ACT|24|7", "ROM|16|25"]);
const omittedKey = (b, c, v) => `${b}|${c}|${v}`;

// ---------------------------------------------------------------------------
// Download (cached)
// ---------------------------------------------------------------------------
async function fetchCached() {
  if (existsSync(CACHE_FILE)) {
    console.log(`using cached download: ${CACHE_FILE}`);
    return readFileSync(CACHE_FILE);
  }
  console.log(`fetching ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, buf);
  console.log(`downloaded ${buf.length.toLocaleString()} bytes -> cached at ${CACHE_FILE}`);
  return buf;
}

// ---------------------------------------------------------------------------
// Corpus (public/content/verses.json) -- resolution source of truth.
// ---------------------------------------------------------------------------
function loadCorpus() {
  const rows = JSON.parse(readFileSync(join(REPO_ROOT, "public", "content", "verses.json"), "utf8"));
  const set = new Set();
  for (const [book, c, v] of rows) set.add(`${book}|${c}|${v}`);
  return set;
}

// ---------------------------------------------------------------------------
// Citation parsing
//
// Two forms appear in reference_list:
//  - standard: "<abbrev><space?><chapter>:<versepart>" e.g. "ps 34:8",
//    "isa 40:26,28", "job 38:22-26" (versepart is a comma-separated list of
//    single verse numbers and/or same-chapter hyphen ranges).
//  - a rare (12 occurrences) mixed-case, no-separator quirk that drops the
//    space and uses an underscore instead of a colon, e.g. "Ge8_16",
//    "1Sa17_32" -- unambiguous (book+chapter+verse, single verse only), so
//    treated as a recognized alternate delimiter rather than invented data.
// Anything else (6 occurrences: stray HTML/CSS remnants like "SIZE=" and
// "it is:", plus one comma-for-colon cross-chapter-range typo "le
// 12,1-13:59" that our schema couldn't represent as a single ref even if
// parsed) is unparseable and dropped as malformed -- never guessed at.
// One further source quirk: a handful of degenerate ranges like "31-31"
// (start === end) appear verbatim in the source (e.g. "lu 1:15,31-31") --
// these are collapsed to a plain single-verse ref rather than dropped or
// kept as a zero-width "range", since they unambiguously name one verse.
// ---------------------------------------------------------------------------
const STD_CITE_RE = /^([1-3]?[A-Za-z]+)\s*(\d+):(.+)$/;
const QUIRK_CITE_RE = /^([1-3]?[A-Za-z]+)(\d+)_(\d+)$/;

/** @returns {{ refs: Array<[string,number,number,number?]>, drop(reason: string): void }} */
function parseReferenceList(refstr, stats) {
  const refs = [];
  for (const raw of refstr.split(";")) {
    const cite = raw.trim();
    if (!cite) continue;

    const std = STD_CITE_RE.exec(cite);
    if (std) {
      const abbr = std[1].toLowerCase();
      const chapter = parseInt(std[2], 10);
      const book = ABBR_TO_USFM[abbr];
      if (!book) {
        stats.unknownAbbrev++;
        continue;
      }
      const versepart = std[3].replace(/\s+/g, "");
      for (const seg of versepart.split(",")) {
        if (!seg) {
          stats.malformed++;
          continue;
        }
        if (seg.includes("-")) {
          const bits = seg.split("-");
          const vs = bits.length === 2 ? parseInt(bits[0], 10) : NaN;
          const ve = bits.length === 2 ? parseInt(bits[1], 10) : NaN;
          if (!Number.isFinite(vs) || !Number.isFinite(ve) || ve < vs) {
            // Includes the descending-range typos (e.g. "heb 9:21-15") that
            // are corrupted cross-chapter ranges in the source -- our
            // schema only supports same-chapter ranges anyway, so these
            // could not be faithfully represented even if repaired.
            stats.malformed++;
            continue;
          }
          if (ve === vs) {
            // Degenerate "range" (e.g. source typo "31-31") -- not a real
            // range, just this one verse.
            stats.degenerateRangeCollapsed++;
            refs.push([book, chapter, vs]);
          } else {
            refs.push([book, chapter, vs, ve]);
          }
        } else {
          if (!/^\d+$/.test(seg)) {
            stats.malformed++;
            continue;
          }
          refs.push([book, chapter, parseInt(seg, 10)]);
        }
      }
      continue;
    }

    const quirk = QUIRK_CITE_RE.exec(cite);
    if (quirk) {
      const abbr = quirk[1].toLowerCase();
      const book = ABBR_TO_USFM[abbr];
      if (!book) {
        stats.unknownAbbrev++;
        continue;
      }
      stats.quirkUnderscore++;
      refs.push([book, parseInt(quirk[2], 10), parseInt(quirk[3], 10)]);
      continue;
    }

    stats.malformed++;
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const buf = await fetchCached();
  const text = new TextDecoder("windows-1252").decode(buf); // source has stray Latin-1/cp1252 bytes (e.g. "Shemuël")
  const lines = text.split(/\r\n|\r|\n/);
  const corpus = loadCorpus();

  const stats = {
    malformedRows: 0,
    apocryphalAnchors: 0,
    omittedVariantAnchors: 0,
    anchorNotInCorpus: 0,
    unknownAbbrev: 0,
    malformed: 0,
    quirkUnderscore: 0,
    degenerateRangeCollapsed: 0,
    targetOmittedVariant: 0,
    targetNotInCorpus: 0,
    emptyAfterDrop: 0,
  };

  // Group phrase-level rows into per-verse anchors (preserving both file
  // order and each row's own reference order -- "refs in TSK order").
  const anchors = new Map(); // "BOOK|c|v" -> { book, c, v, refs: [] }
  const anchorOrder = [];

  for (const line of lines) {
    if (!line) continue;
    const parts = line.split("\t");
    if (parts.length !== 6) {
      stats.malformedRows++;
      continue;
    }
    const bookKey = parseInt(parts[0], 10);
    const c = parseInt(parts[1], 10);
    const v = parseInt(parts[2], 10);
    if (!Number.isFinite(bookKey) || !Number.isFinite(c) || !Number.isFinite(v)) {
      stats.malformedRows++;
      continue;
    }
    if (bookKey < 1 || bookKey > CANONICAL_ORDER.length) {
      stats.apocryphalAnchors++;
      continue;
    }
    const book = CANONICAL_ORDER[bookKey - 1];
    const key = `${book}|${c}|${v}`;
    if (OMITTED_VARIANTS.has(key)) {
      stats.omittedVariantAnchors++;
      continue;
    }
    if (!corpus.has(key)) {
      stats.anchorNotInCorpus++;
      continue;
    }

    const lineRefs = parseReferenceList(parts[5], stats);

    let entry = anchors.get(key);
    if (!entry) {
      entry = { book, c, v, refs: [] };
      anchors.set(key, entry);
      anchorOrder.push(key);
    }
    entry.refs.push(...lineRefs);
  }

  // Resolve/drop targets, drop anchors left with no refs.
  const final = [];
  for (const key of anchorOrder) {
    const entry = anchors.get(key);
    const kept = [];
    for (const ref of entry.refs) {
      const [b, c, v, end] = ref;
      if (end === undefined) {
        const k = omittedKey(b, c, v);
        if (OMITTED_VARIANTS.has(k)) { stats.targetOmittedVariant++; continue; }
        if (!corpus.has(k)) { stats.targetNotInCorpus++; continue; }
        kept.push(ref);
      } else {
        const kStart = omittedKey(b, c, v);
        const kEnd = omittedKey(b, c, end);
        if (OMITTED_VARIANTS.has(kStart) || OMITTED_VARIANTS.has(kEnd)) { stats.targetOmittedVariant++; continue; }
        if (!corpus.has(kStart) || !corpus.has(kEnd)) { stats.targetNotInCorpus++; continue; }
        kept.push(ref);
      }
    }
    if (kept.length === 0) {
      stats.emptyAfterDrop++;
      continue;
    }
    final.push({ book: entry.book, c: entry.c, v: entry.v, refs: kept });
  }

  // Canonical sort (book rank, then c, then v).
  final.sort((a, b) => {
    const rb = BOOK_RANK.get(a.book) - BOOK_RANK.get(b.book);
    if (rb !== 0) return rb;
    if (a.c !== b.c) return a.c - b.c;
    return a.v - b.v;
  });

  // -------------------------------------------------------------------------
  // Assertions
  // -------------------------------------------------------------------------
  const booksPresent = new Set(final.map((e) => e.book));
  const totalRefs = final.reduce((n, e) => n + e.refs.length, 0);

  console.log("\n=== parse stats ===");
  console.log(stats);
  console.log(`\nanchors: ${final.length}, books with anchors: ${booksPresent.size}/66, total refs: ${totalRefs}`);

  console.log("\nper-book anchor counts:");
  const counts = new Map();
  for (const e of final) counts.set(e.book, (counts.get(e.book) ?? 0) + 1);
  for (const b of CANONICAL_ORDER) {
    if (counts.has(b)) console.log(`  ${b}: ${counts.get(b)}`);
  }
  const missingBooks = CANONICAL_ORDER.filter((b) => !counts.has(b));
  if (missingBooks.length) console.log(`  (no anchors: ${missingBooks.join(", ")})`);

  if (booksPresent.size < 55) {
    throw new Error(`only ${booksPresent.size} books have anchors (need >= 55)`);
  }
  if (final.length < 20000) {
    throw new Error(`only ${final.length} anchors (need >= 20000)`);
  }
  if (totalRefs < 300000) {
    throw new Error(`only ${totalRefs} total refs (need >= 300000)`);
  }
  for (const e of final) {
    if (e.refs.length === 0) throw new Error(`empty ref list: ${e.book} ${e.c}:${e.v}`);
    const anchorKey = omittedKey(e.book, e.c, e.v);
    if (!corpus.has(anchorKey)) throw new Error(`anchor does not resolve: ${e.book} ${e.c}:${e.v}`);
    if (OMITTED_VARIANTS.has(anchorKey)) throw new Error(`anchor is an omitted variant: ${e.book} ${e.c}:${e.v}`);
    for (const [b, c, v, end] of e.refs) {
      if (!corpus.has(omittedKey(b, c, v))) throw new Error(`target does not resolve: ${e.book} ${e.c}:${e.v} -> ${b} ${c}:${v}`);
      if (end !== undefined) {
        if (end <= v) throw new Error(`non-increasing range end: ${e.book} ${e.c}:${e.v} -> ${b} ${c}:${v}-${end}`);
        if (!corpus.has(omittedKey(b, c, end))) throw new Error(`range end does not resolve: ${e.book} ${e.c}:${e.v} -> ${b} ${c}:${end}`);
      }
    }
  }
  for (let i = 1; i < final.length; i++) {
    const a = final[i - 1], b = final[i];
    const ra = BOOK_RANK.get(a.book), rb = BOOK_RANK.get(b.book);
    const ok = ra < rb || (ra === rb && (a.c < b.c || (a.c === b.c && a.v < b.v)));
    if (!ok) throw new Error(`canonical sort violated at index ${i}: ${a.book} ${a.c}:${a.v} then ${b.book} ${b.c}:${b.v}`);
  }
  console.log("\nall assertions passed.");

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  const json = JSON.stringify(final);
  writeFileSync(OUT_FILE, json, "utf8");
  console.log(`\nwrote ${OUT_FILE} (${(json.length / 1024 / 1024).toFixed(2)} MB, ${final.length} anchors, ${totalRefs} refs)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
