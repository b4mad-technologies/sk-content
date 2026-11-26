# SRD catalogue sprites

PixelLab Pixen stills (entity-art-v1 pack, colours reduced onto the pack
palette), plus composites of a base sprite and a badge for named magic
weapon and armour variants. The sidecar next to each `.webp` records the
prompt, seed or overlay inputs, and hashes. The images are licensed under
CC BY 4.0; see [LICENSE](LICENSE).

The SRD 5.2.1 names and rules text remain CC BY 4.0 (Wizards of the Coast);
these sprites are not Wizards material.

`src/art/generate.ts` turns the sidecars into the
`fixtures/base/playing-the-game/srd-art.toml` attachments. The batch list is
`../../art/art-manifest.json` (`pnpm --filter @spellkave/srd-cc run
art-manifest`). The paid generation runner is not part of this repository.
