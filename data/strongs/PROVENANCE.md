# Provenance: Strong's Hebrew and Greek Dictionaries

Fetch/verification date: 2026-07-18

## The underlying work

James Strong, S.T.D., LL.D., *The Exhaustive Concordance of the Bible* (1890,
Hunt & Eaton), including its appended Hebrew and Greek dictionaries. The 1890
text itself is public domain in the United States (published well before
1928 / author died 1894). That alone is not sufficient, though: the
*machine-readable digitization* we vendor must carry its own clear
public-domain-equivalent grant, independent of the underlying work's status.
Every candidate below was checked for that.

## Repo investigated and REJECTED: `github.com/openscriptures/HebrewLexicon`

`readme.md` (fetched via `gh api repos/openscriptures/HebrewLexicon/contents/readme.md`,
2026-07-18) states, in full:

> These files are released under the
> [Creative Commons Attribution 4.0 International](http://creativecommons.org/licenses/by/4.0/)
> license. The actual text of Brown, Driver, Briggs and Strong's Hebrew
> dictionary remain in the public domain. For attribution purposes, credit
> the Open Scriptures Hebrew Bible Project.

This is CC-BY 4.0 on the digitization (`HebrewStrong.xml`, `BrownDriverBriggs.xml`,
etc.) — an attribution requirement on the machine-readable files themselves,
regardless of the underlying 1890/BDB text's PD status. Per this project's
standing policy (previously applied to reject CC-BY cross-reference data in
favor of a public-domain TSK export), CC-BY digitizations are not vendored.
**Not used.**

## Repo used: `github.com/openscriptures/strongs`

- Repo URL: https://github.com/openscriptures/strongs
- Commit used: `0acd2f251c2d35ff8db2dece4e0593979d3ac223` (HEAD of `master` as
  of 2026-07-18; `pushed_at` 2021-07-15T14:50:54Z per GitHub API)
- The repo itself has no top-level `LICENSE` file and no `license` field in
  `package.json`. That is not the operative fact, though: **the individual
  dictionary data files each carry their own explicit public-domain
  declaration inline in their header/prologue text**, which is stronger and
  more specific than a repo-wide badge would be, and is what this vendoring
  actually relies on. Verified below file-by-file.

### Greek: `greek/StrongsGreekDictionaryXML_1.4/strongsgreek.xml`

Fetched from:
https://raw.githubusercontent.com/openscriptures/strongs/master/greek/StrongsGreekDictionaryXML_1.4/strongsgreek.xml

The file's own `<prologue>` element states, verbatim (appears twice, once per
title block):

> Dictionary of Greek Words taken from Strong's Exhaustive Concordance by
> James Strong, S.T.D., LL.D. 1890
>
> **Public Domain -- Copy Freely**

Full chain of custody per the same prologue:
- ASCII e-text produced by Michael Grier (mgrier@pdnt.com) in 1996, hosted at
  the Bible Foundation (bf@bf.org / www.bf.org).
- Converted to XML (with real Unicode Greek replacing the ASCII
  transliteration, plus an SBL-style `translit` attribute) by Ulrik Petersen
  in 2006, released as "Strong's Greek Dictionary in XML" v1.3/1.4
  (`greek/StrongsGreekDictionaryXML_1.4/README.txt`, dated 2007-09-14).

5,624 entries, Strong's numbers G1-G5624 contiguous, no gaps (verified by
parsing). 101 of these (e.g. G302, G687, G814, G3203-3221, ...) are numbers
Strong's dictionary itself marks "Not Used" (reserved/skipped numbers with no
headword) -- these are vendored as empty-lemma placeholder entries so the
key range stays contiguous; see Normalization below.

### Hebrew: `hebrew/StrongHebrewG.xml`

Fetched from:
https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/StrongHebrewG.xml

This is a different, OSIS-formatted edition from the HebrewLexicon repo's
`HebrewStrong.xml` (both live at OpenScriptures, but are distinct files with
distinct licensing histories). Its OSIS `<header>` declares, verbatim, three
`<work>` blocks with per-work `<rights>` tags:

> \<work osisWork="Strong" ...\>
>   \<title\>A Concise Dictionary of the Words in the Hebrew Bible\</title\>
>   ...
>   \<contributor role="edt"\>David Troidl\</contributor\>
>   \<contributor role="edt"\>David Instone-Brewer\</contributor\>
>   \<creator role="aut"\>James Strong, LL.D., S.T.D.\</creator\>
>   ...
>   \<rights\>Public Domain\</rights\>
> \</work\>
> \<work osisWork="G" ...\>
>   \<title\>A Concise Dictionary of the Words in the Greek/New Testament\</title\>
>   ...
>   \<rights\>Public Domain\</rights\>
> \</work\>

(A third `<work osisWork="TWOT">` block, for the *Theological Wordbook of the
Old Testament*, is explicitly marked `<rights type="x-copyright">Copyright
© 1980 by the Moody Bible Institute.</rights>` -- TWOT is used in this file
only as cross-reference *numbers* attached via a `gloss` attribute (e.g.
`gloss="4a"`), never as embedded TWOT prose. No TWOT copyrighted text is
present in or extracted from this file.)

Revision history in the same header records incremental cleanup by "dt"
(David Troidl) through 2010.05.24, building on data originally sourced from
www.2LetterLookup.com and cross-checked against multiple PD sources.

8,674 entries, Strong's numbers H1-H8674 contiguous, no gaps (verified by
parsing). Every entry has a non-empty pointed Hebrew `lemma`, transliteration
(`xlit`), and both a sense-list (`<list>`) and a prose `explanation` note --
no Hebrew placeholder/"not used" entries exist in this file.

## Verification method

- `gh api repos/openscriptures/HebrewLexicon/contents/readme.md` and
  `gh api repos/openscriptures/strongs/contents/...` / raw.githubusercontent.com
  fetches performed directly, 2026-07-18.
- Confirmed no separate top-level `LICENSE` exists in `openscriptures/strongs`
  (`license` field is `null` via `gh api repos/openscriptures/strongs`) --
  reliance is placed entirely on the two data files' own inline declarations
  quoted above, not on repo metadata.
- Entry counts, key contiguity (no gaps in H1-H8674 / G1-G5624), and presence
  of the "Not Used" Greek placeholders were verified programmatically against
  the raw XML before writing `scripts/fetch-strongs.mjs`'s hard assertions.

## Normalization decisions (see `scripts/fetch-strongs.mjs` for the code)

- **Hebrew** `lemma`: the headword `<w>` element's `lemma` attribute (pointed/
  vocalized Hebrew, e.g. `חֵסֵד` for H2617), not its unpointed element text
  content (`חסד`) -- the attribute is the fuller "original script" form.
- **Hebrew** `translit`: the same element's `xlit` attribute verbatim.
- **Hebrew** `definition`: the `<note type="explanation">` text, tags
  stripped and whitespace-normalized (this is the free-prose gloss, the
  closest Hebrew-side analog to Greek's `<strongs_def>`). Present on all
  8,674 entries.
- **Greek** `lemma`/`translit`: the `<greek unicode="..." translit="..."/>`
  attributes verbatim, when present.
- **Greek** `definition`: `<strongs_def>` text, tags stripped and
  whitespace-normalized, when present and non-blank (5,503 of 5,624
  entries). Falls back to the derivation text joined with the
  KJV-definition text for: the 19 entries that have a
  `<strongs_derivation>`/`<kjv_def>` but no `<strongs_def>` at all (e.g.
  G302 "ἄν", G687 "ἆρα", G814 "ἀτάκτως" -- particles defined only by
  derivation + KJV rendering), plus one entry (G2022 "ἐπιχέω") whose
  `<strongs_def>` element is present but contains only whitespace in the
  source XML.
- **Greek "Not Used" placeholders** (101 entries, e.g. G2717, G3203-3221):
  Strong's dictionary itself reserves these numbers without assigning a
  headword. Vendored with `lemma: ""`, `translit: ""`, and
  `definition: "Not used in the Greek New Testament (reserved Strong's number)."`
  so the key range stays the full contiguous G1-G5624 the interface promises
  (Task 2's verse-to-Strong's-number lookups should never actually hit one of
  these, since a "not used" number by definition appears in no KJV verse).
- All tag-stripped text run through the same entity-decode +
  whitespace-collapse hygiene pass `scripts/fetch-commentary-data.mjs`
  already uses (`&amp;`/`&lt;`/etc. decoded, runs of whitespace collapsed to
  a single space, trimmed).
