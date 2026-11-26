# Elven Mini character and item images

PixelLab-generated sprites for the Elven Mini cast, creatures and items.
The `.webp.json` sidecars record the generation prompt and timestamp; the
fourteen pilot images without a full sidecar have their hashes in
`../../art/art-manifest.json`. The images are licensed under CC BY 4.0; see
[LICENSE](LICENSE). Map backdrops have their own CC BY attribution in
`../ccc3-maps/`.

`../../art/index.ts` is the build-time catalogue (`@spellkave/adventure-elven-mini/art`).
Runtime clients use the authored `art.image` references. No PixelLab call
occurs at runtime.
