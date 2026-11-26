# UI-surface curation (generated)

Do not hand-edit the `.toml` here — regenerate:

```bash
pnpm --filter @spellkave/srd-cc run generate
```

## What lives here

This root holds ADR-0073 metadata that curates what a PLAYER-facing surface
shows and in what order — editorial membership, not SRD rulebook content.
Unlike `base/<chapter>/`, this root has no coverage report (nothing
SRD-sourced to cover): membership is an operator/author decision about the
`ui.*` namespace family, not a fact parsed from the SRD text.

It is a sibling to `base/`, `spatial/`, and `kavemouth/` — not a chapter —
because surface membership can span every chapter (a future `ui.scene` or
`ui.inventory` namespace, for instance, has no single "book chapter" owner)
and its ordering is global across the whole bundle, not local to one topic.
See `src/ui/` for the generator; `src/pipeline.ts` renders it after the
chapter walk and includes its fragment(s) in the root `manifest.toml` the
same way a chapter's own fragments are included.

## Contents

| File | Namespace | Purpose |
|---|---|---|
| [`self-summary.toml`](./self-summary.toml) | `ui.self_summary` (audience `public`) | `spellkave_self_summary`'s `vitals`/`quest` bucket membership + display order for this bundle's resources (HP/AC/Level, slot `vitals`; refs #2119) |

Refs: ADR-0073 (metadata attachments / world-behavior test), #2119 (this
namespace's introduction + this fixture root's relocation from
`base/playing-the-game/`).
