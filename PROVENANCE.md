# Extraction provenance

The initial content tree comes from Spellkave monorepo snapshot
`686a27e90a3330216ebc1a11d1a3b7b762bcbf11`. The source cache retains fork
pins and byte hashes. The map directory identifies the artist, CC release,
distributed variant and checksum for each image. See [NOTICE.md](NOTICE.md).

This cut retains the committed example manifests, generators, SRD source
cache and CC BY backdrops. The manifests were adapted to remove the
supplemental flavor descriptions. It omits paid generation workdirs,
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
  fingerprint inputs stay in the monorepo. Claims that read held inputs
  are skipped with a reason.

Still held: SRD flavor texts (`authored/flavor/en`) pending the provider
terms and copied-expression review in the audit; the Elven Mini outdoor
PMTiles (an image-model composite over Elven Tower sheets whose archive
carries no credits); map renders, live deltas and story captures.

The four public bundle roots are checked with the grimoire Wasm validator.
The content files state their manifest schema version.
