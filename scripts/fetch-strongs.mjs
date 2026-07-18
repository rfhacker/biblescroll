#!/usr/bin/env node
// Vendors the public-domain Strong's Hebrew and Greek dictionaries from
// github.com/openscriptures/strongs and normalizes them into
// data/strongs/{hebrew,greek}.json.
//
// Output shape: Record<"H####"|"G####", { lemma: string, translit: string,
//   definition: string }>, keys H1..H8674 / G1..G5624 (contiguous, no gaps).
//
// PROVENANCE (see data/strongs/PROVENANCE.md for full detail/quotes):
// The sibling repo openscriptures/HebrewLexicon (HebrewStrong.xml etc.) is
// CC-BY 4.0 per its readme.md and was REJECTED -- per this project's
// standing policy, CC-BY digitizations are not vendored even when the
// underlying 1890 work is PD. Both files used here instead each carry their
// own explicit public-domain declaration inline in their own header/prologue
// text (independent of openscriptures/strongs' repo-level license, which is
// absent):
//   - greek/StrongsGreekDictionaryXML_1.4/strongsgreek.xml: prologue states
//     "Public Domain -- Copy Freely" (ASCII e-text by Michael Grier 1996,
//     XML conversion by Ulrik Petersen 2006).
//   - hebrew/StrongHebrewG.xml: OSIS header's Strong/Greek <work> blocks each
//     declare <rights>Public Domain</rights> (ed. David Troidl & David
//     Instone-Brewer). A third <work> block for TWOT is separately marked
//     copyright Moody 1980, but TWOT is referenced only via numeric `gloss`
//     codes in this file, never as embedded prose -- no TWOT text is read or
//     written by this script.
//
// Commit used: 0acd2f251c2d35ff8db2dece4e0593979d3ac223 (master HEAD,
// verified 2026-07-18).
//
// Re-running this script re-uses cached downloads (system temp dir) and is
// deterministic given the same cached inputs.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const CACHE_DIR = join(tmpdir(), "biblescroll-strongs-cache");
const OUT_DIR = join(REPO_ROOT, "data", "strongs");

const GREEK_URL =
  "https://raw.githubusercontent.com/openscriptures/strongs/0acd2f251c2d35ff8db2dece4e0593979d3ac223/greek/StrongsGreekDictionaryXML_1.4/strongsgreek.xml";
const HEBREW_URL =
  "https://raw.githubusercontent.com/openscriptures/strongs/0acd2f251c2d35ff8db2dece4e0593979d3ac223/hebrew/StrongHebrewG.xml";

// ---------------------------------------------------------------------------
// Download (cached)
// ---------------------------------------------------------------------------
async function fetchCached(name, url, cacheFile) {
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
// Text hygiene (same approach as scripts/fetch-commentary-data.mjs)
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

function stripTags(xml) {
  const noTags = xml.replace(/<[^>]*>/g, " ");
  const decoded = decodeEntities(noTags);
  const collapsed = decoded.replace(/[ \t\r\n]+/g, " ").trim();
  // Tag removal above turns e.g. "<hi>kindness</hi>; by implication" into
  // "kindness ; by implication" (a real space now sits before the
  // punctuation that immediately followed the closing tag in the source).
  // Tidy that up so punctuation hugs the preceding word, as a human editor
  // would type it.
  return collapsed.replace(/ +([,.;:!?])/g, "$1");
}

// Attribute-order-agnostic parse of a tag's attribute string
// (e.g. `BETA="*A" unicode="Α" translit="A"`) into a plain object.
function parseAttrs(attrString) {
  const attrs = {};
  const re = /([\w:.-]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(attrString))) attrs[m[1]] = m[2];
  return attrs;
}

// ---------------------------------------------------------------------------
// Greek: greek/StrongsGreekDictionaryXML_1.4/strongsgreek.xml
// ---------------------------------------------------------------------------
function extractGreek(xml) {
  const out = {};
  const stats = { total: 0, notUsed: 0, fallbackDef: 0, missingDef: 0 };

  const entryRe = /<entry strongs="(\d+)">([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    stats.total++;
    const num = parseInt(m[1], 10);
    const body = m[2];
    const key = `G${num}`;

    const greekMatch = /<greek\b([^>]*)\/>/.exec(body);
    if (!greekMatch) {
      // Strong's dictionary itself marks these numbers "Not Used" (reserved,
      // no headword) -- see PROVENANCE.md. Vendor as an empty placeholder so
      // the key range stays contiguous G1..G5624.
      stats.notUsed++;
      out[key] = {
        lemma: "",
        translit: "",
        definition: "Not used in the Greek New Testament (reserved Strong's number).",
      };
      continue;
    }
    const greekAttrs = parseAttrs(greekMatch[1]);
    const lemma = greekAttrs.unicode ?? "";
    const translit = greekAttrs.translit ?? "";

    const defMatch = /<strongs_def>([\s\S]*?)<\/strongs_def>/.exec(body);
    let definition = defMatch ? stripTags(defMatch[1]) : "";
    if (!definition) {
      // 19 entries (particles etc.) have no <strongs_def>, and one
      // (G2022) has a <strongs_def> that is present but blank -- fall back
      // to derivation + KJV rendering in both cases (see PROVENANCE.md).
      const derivMatch = /<strongs_derivation>([\s\S]*?)<\/strongs_derivation>/.exec(body);
      const kjvMatch = /<kjv_def>([\s\S]*?)<\/kjv_def>/.exec(body);
      const parts = [derivMatch ? stripTags(derivMatch[1]) : "", kjvMatch ? stripTags(kjvMatch[1]) : ""].filter(Boolean);
      definition = parts.join("; ");
      stats.fallbackDef++;
    }
    if (!definition) stats.missingDef++;

    out[key] = { lemma, translit, definition };
  }

  return { entries: out, stats };
}

// ---------------------------------------------------------------------------
// Hebrew: hebrew/StrongHebrewG.xml (OSIS)
// ---------------------------------------------------------------------------
function extractHebrew(xml) {
  const out = {};
  const stats = { total: 0, missingLemma: 0, missingTranslit: 0, missingDef: 0 };

  const entryRe = /<div type="entry" n="\d+">([\s\S]*?)<\/div>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    stats.total++;
    const body = m[1];

    // Headword <w> is the only non-self-closing <w> in the entry and the
    // only one carrying an ID attribute (cross-reference <w/> tags inside
    // <note type="exegesis"> are self-closing and lack ID) -- match on that.
    const headwordRe = /<w\b([^>]*)\bID="(H\d+)"[^>]*>/;
    const headMatch = headwordRe.exec(body);
    if (!headMatch) {
      throw new Error(`[hebrew] entry with no headword <w ID="..."> found: ${body.slice(0, 120)}`);
    }
    const attrs = parseAttrs(headMatch[1] + ` ID="${headMatch[2]}"`);
    const key = attrs.ID;
    const lemma = attrs.lemma ?? "";
    const translit = attrs.xlit ?? "";
    if (!lemma) stats.missingLemma++;
    if (!translit) stats.missingTranslit++;

    const explMatch = /<note type="explanation">([\s\S]*?)<\/note>/.exec(body);
    const definition = explMatch ? stripTags(explMatch[1]) : "";
    if (!definition) stats.missingDef++;

    out[key] = { lemma, translit, definition };
  }

  return { entries: out, stats };
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------
function assertContiguous(name, entries, prefix, expectedMax) {
  const keys = Object.keys(entries);
  console.log(`[${name}] ${keys.length} entries`);
  if (keys.length !== expectedMax) {
    throw new Error(`[${name}] expected exactly ${expectedMax} entries, got ${keys.length}`);
  }
  for (let i = 1; i <= expectedMax; i++) {
    const key = `${prefix}${i}`;
    if (!(key in entries)) throw new Error(`[${name}] missing key ${key} (gap in contiguous range)`);
  }
  for (const k of keys) {
    if (!new RegExp(`^${prefix}\\d{1,4}$`).test(k)) throw new Error(`[${name}] malformed key: ${k}`);
  }
}

function assertSpotChecks(name, entries, spotChecks) {
  for (const key of spotChecks) {
    const e = entries[key];
    if (!e) throw new Error(`[${name}] spot-check key missing: ${key}`);
    if (!e.translit || e.translit.length === 0) throw new Error(`[${name}] spot-check ${key} has empty translit`);
    if (!e.definition || e.definition.length === 0) throw new Error(`[${name}] spot-check ${key} has empty definition`);
    if (!e.lemma || e.lemma.length === 0) throw new Error(`[${name}] spot-check ${key} has empty lemma`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const greekXml = await fetchCached("greek", GREEK_URL, join(CACHE_DIR, "strongsgreek.xml"));
  const { entries: greek, stats: greekStats } = extractGreek(greekXml);
  console.log("[greek] stats:", greekStats);
  assertContiguous("greek", greek, "G", 5624);
  assertSpotChecks("greek", greek, ["G26", "G3056", "G5485"]);
  // "Not Used" placeholders should never appear as a spot-check target, but
  // confirm the count matches what PROVENANCE.md documents (regression guard
  // against a parsing change silently reclassifying real entries).
  if (greekStats.notUsed !== 101) {
    throw new Error(`[greek] expected exactly 101 "Not Used" placeholder entries, got ${greekStats.notUsed}`);
  }
  if (greekStats.missingDef !== 0) {
    throw new Error(`[greek] ${greekStats.missingDef} entries ended up with an empty definition`);
  }

  await new Promise((r) => setTimeout(r, 300));

  const hebrewXml = await fetchCached("hebrew", HEBREW_URL, join(CACHE_DIR, "strongshebrew.xml"));
  const { entries: hebrew, stats: hebrewStats } = extractHebrew(hebrewXml);
  console.log("[hebrew] stats:", hebrewStats);
  assertContiguous("hebrew", hebrew, "H", 8674);
  assertSpotChecks("hebrew", hebrew, ["H2617", "H7965"]);
  if (hebrewStats.missingLemma !== 0 || hebrewStats.missingTranslit !== 0 || hebrewStats.missingDef !== 0) {
    throw new Error(
      `[hebrew] unexpected missing fields: lemma=${hebrewStats.missingLemma} translit=${hebrewStats.missingTranslit} definition=${hebrewStats.missingDef}`
    );
  }

  const greekJson = JSON.stringify(greek);
  const hebrewJson = JSON.stringify(hebrew);
  writeFileSync(join(OUT_DIR, "greek.json"), greekJson, "utf8");
  writeFileSync(join(OUT_DIR, "hebrew.json"), hebrewJson, "utf8");
  console.log(`[greek] wrote data/strongs/greek.json (${(greekJson.length / 1024).toFixed(0)} KB, ${Object.keys(greek).length} entries)`);
  console.log(`[hebrew] wrote data/strongs/hebrew.json (${(hebrewJson.length / 1024).toFixed(0)} KB, ${Object.keys(hebrew).length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
