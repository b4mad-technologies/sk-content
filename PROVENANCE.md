# Extraction provenance

The initial content tree comes from Spellkave monorepo snapshot
`686a27e90a3330216ebc1a11d1a3b7b762bcbf11`. The source cache retains fork
pins and byte hashes. See [NOTICE.md](NOTICE.md).

This cut retains the committed example manifests, generators and SRD
source cache, and until 2026-11-26 the Elven Tower map backdrops. The
manifests were adapted to remove the supplemental flavor descriptions. It omits paid generation workdirs,
outdoor tiles, captured live stories, evidence products, screenshots and
the historical Playtest Mini authoring transcript. It also omits monorepo
CI routing, operations tests, design history and private NPC-host tooling.

## Art and offline tests (2026-11-26)

A second import came from monorepo `origin/main`
`e9e078d5bb8290c2d985c42bfa0dc8164df5542a`. These paths are byte-identical
to the first snapshot.

- **Sprites.** SRD `assets/srd-art/` (1,441 WebP with sidecars), SRD
  `art/` (art manifest, 12 badges), Elven Mini `assets/elven-mini-art/`
  (50 WebP) and `art/` (catalogue, art manifest). All were generated with
  PixelLab or composited from PixelLab output. The owner approved their
  publication under CC BY 4.0. Sidecar and attachment licence fields read
  `CC-BY-4.0`; the image bytes are unchanged. The generators re-attach the
  art, and the content check verifies each attachment's path, SHA-256 and
  licence.
- **Offline tests.** SRD `src/test/offline`, `src/test/shared`,
  `src/test/srd-coverage`, `src/docs` tests and Elven Mini `tests/offline`.
  Tests that need NPC-host, operations, live-test, server or pipeline
  fingerprint inputs stay in the monorepo. Six claims that read held or
  monorepo-only inputs are skipped with a reason.

### Flavor texts

SRD `authored/flavor/` (4,686 blurbs, prompt manifests and one reviewed
run) came over from the same commit after the owner approved it on
2026-11-26, following a spot check:

- **Script.** `pnpm run audit:flavor` (`scripts/audit-flavor.mjs`) flags
  12-word runs shared with the SRD cache or with another blurb, sentences
  repeated in five or more blurbs, non-SRD product identity names,
  refusals and generation artefacts, and very short blurbs. It found no
  product identity names and no refusals or artefacts. The 14 SRD overlaps
  are rule summaries of CC BY SRD text. The shared runs and repeated
  sentences are first-party rule templates (class level, multiattack,
  spell slot wording); among the descriptive blurbs only two items share
  a run (longsword and scimitar of sharpness).
- **Reading.** A seeded random sample of 150 blurbs, every blurb flagged
  for SRD overlap, product identity or length, and each distinct shared
  run and repeated sentence. No passage read like copied published
  non-SRD text. One blurb repeated its own phrase and was fixed
  (`gear/truth-serum.md`).
- **Models** (frontmatter `model`, else `author`): 4,019
  `openai/gpt-5.6-terra`; 459 `agent-session:task_ced7b6ae70b1` (rule and
  DM text; the monorepo commit names Codex gpt-6.1-sol, the file does not);
  159 grok-4.7 agent sessions; 21 Codex; 20 Claude; 8 bead-labelled
  agent sessions. All are marked `reviewed: true`.

The regenerated SRD fixtures equal the monorepo fixtures apart from the
licence strings and the fixed blurb.

### Elven Tower maps removed (2026-11-26)

The owner removed the 20 Elven Tower map JPEGs, their attribution file and
the backdrop map layers, to be replaced by original maps. The public site
states CC BY-NC for its maps and the CC BY posts could not be verified.
The files remain in git history (commit `28607e6` and earlier). The place
graphs keep node positions that were traced from those sheets; their
author-only provenance notes still name the source maps. A spot check
found no adventure prose copied from the Elven Tower pages (no shared
7-word run; the only shared 5-word run is the map title "Shrine of the Sun
and Moon").

Still held: the Elven Mini outdoor PMTiles (an image-model composite over
Elven Tower sheets whose archive carries no credits); map renders, live
deltas and story captures.

The four public bundle roots are checked with the grimoire Wasm validator.
The content files state their manifest schema version.
