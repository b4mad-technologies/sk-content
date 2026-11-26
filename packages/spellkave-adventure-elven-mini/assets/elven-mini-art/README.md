# Elven Mini character and item images

These existing PixelLab-generated images were moved unchanged from the shared
UI package into their owning adventure. The `.webp.json` sidecars preserve
the generation prompt and timestamp. The included `LICENSE` records the
2026-09-07 PixelLab output-rights finding (subscriber-owned commercial use,
no required attribution, no training other models) and points at the root
proprietary grant. The authored reference `LicenseRef-Spellkave-Proprietary`
names that grant; this is not an OSS license. Map assets have their own
separate CC-BY attribution in `../ccc3-maps/`.

The adventure OCI image includes these files. UI-lab's build-time catalog is
`../../art/index.ts`; runtime clients use authorized `art.image` references
and the installed per-world asset route. No PixelLab call occurs at runtime.
