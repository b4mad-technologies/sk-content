# Extraction provenance

The initial content tree comes from Spellkave monorepo snapshot
`686a27e90a3330216ebc1a11d1a3b7b762bcbf11`. The source cache retains fork
pins and byte hashes. The map directory identifies the artist, CC release,
distributed variant and checksum for each image. See [NOTICE.md](NOTICE.md).

This cut retains the committed example manifests, generators, SRD source
cache and CC BY backdrops. The manifests were adapted to remove the
excluded sprite attachments and supplemental flavor descriptions. It omits
paid generation workdirs, PixelLab sprites, outdoor tiles, captured live
stories, evidence products, screenshots and the historical Playtest Mini
authoring transcript. It also omits monorepo CI routing, operations tests,
design history and private NPC-host tooling.

The four public bundle roots are checked with the grimoire Wasm validator.
The content files state their manifest schema version.
