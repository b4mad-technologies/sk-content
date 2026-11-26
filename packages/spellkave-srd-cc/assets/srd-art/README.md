# SRD catalog sprites

PixelLab Pixen stills (entity-art-v1 pack, reduce-colors onto the pack
palette). Sidecars next to each `.webp` record prompt, seed, and hashes.
The included `LICENSE` is the repository proprietary license; authored
payloads use `LicenseRef-Spellkave-Proprietary`.

SRD 5.2.1 names and rules text remain CC-BY-4.0 (Wizards of the Coast);
these sprites are not Wizards material.

Generate via `pnpm --filter @spellkave/srd-cc run art-manifest` then
`just pixellab-live art-batch packages/spellkave-srd-cc/art/art-manifest.json --confirm-paid`.
Named magic weapon/armor variants wait for overlay compose (sk-jay0.3.5.24)
and are listed in `art/art-manifest.json` `skipped_entries`.
