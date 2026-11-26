# Kavemouth place maps

One backdrop image per story place, licensed under CC BY 4.0; see
[LICENSE](LICENSE).

| Path | What it is |
| --- | --- |
| `plans/<place>.png` | The place's floor plan, painted by `scripts/build-map-inputs.ts` from `author/lib/layouts.ts`. Deterministic; `plans/index.json` lists the hashes. |
| `maps/<place>.png` | The backdrop, generated with PixelLab from the plan picture and the request in `art/maps/<place>.blueprint.json`. |
| `maps/<place>.png.json` | The sidecar: tool, request and prompt, source plan and its hash, time, image hash, licence. |

One plan cell is 5 ft and 16 pixels, so a backdrop is the plan at a fixed
scale and `author/backdrops.ts` takes the layer metrics from the plan.

## Making the maps again

```sh
pnpm --filter @spellkave/adventure-kavemouth run maps:inputs   # plans and requests, free
skgen image pixellab generate packages/spellkave-adventure-kavemouth/art/maps/<place>.blueprint.json --confirm-paid
pnpm --filter @spellkave/adventure-kavemouth run maps:ingest   # copy the image, write the sidecar
```

`skgen` is the design-time tool from `@spellkave/design-gen`. It needs a
PixelLab key and the generation is paid. Run it from this repository's
root: it writes to the ignored `pixellab-generations/` directory.
The content check (`pnpm run validate`) fails when a backdrop does not
match its sidecar, its plan or the size its map layer states.
