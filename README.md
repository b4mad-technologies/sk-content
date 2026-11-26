# Spellkave content

Executable fifth-edition SRD rules and two example adventures for Spellkave's
manifest language 1.0.0. The authored material is licensed under CC BY 4.0.
See [LICENSE.md](LICENSE.md) and [NOTICE.md](NOTICE.md) for the code licence,
third-party credits and source changes.

| Bundle | Entry point | Dependencies |
| --- | --- | --- |
| SRD | `packages/spellkave-srd-cc/fixtures/manifest.toml` | — |
| Shared DM | `packages/spellkave-srd-cc/fixtures/dm/manifest.toml` | SRD |
| Elven Mini | `packages/spellkave-adventure-elven-mini/fixtures/adventure.manifest.toml` | SRD, Shared DM |
| Playtest Mini | `packages/spellkave-adventure-playtest-mini/fixtures/manifest.toml` | SRD |

Use Node 24 and pnpm 11.13.1. The manifests and the asset paths can be checked
offline with the grimoire Wasm validator. The compendium build projects
committed TOML to JSON and puts the licence and credits beside the outputs.

```sh
pnpm install --frozen-lockfile
export SPELLKAVE_CORE_FIXTURES=../sk-grimoire/packages/spellkave-mechanics/fixtures/core
pnpm test
pnpm run typecheck
pnpm run build
```

The package manifests pin the grimoire and SDK APIs. The SDK stack pins
`@spellkave/bindings@2.1.0` for its world API. Static validation requires
the content language only. Live compatibility and staging require a
matching world API release.

The lockfile resolves the published SDK packages at 0.1.2 and the
validator and authoring Wasm packages at 0.1.0 from npm. The SRD,
Adventure Runtime and Elven Mini packages link within this workspace.

## Authoring

The SRD cache contains pinned input hashes. Fixture generators and the
standalone compendium export consume committed inputs. Refreshing the
cache requires the two pinned upstream forks. The grimoire authoring
Wasm comes through the SDK authoring tools. Elven Mini's generator also
needs the sk-grimoire mechanics core fixture at the path supplied in
`SPELLKAVE_CORE_FIXTURES`.

The offline tests and the Elven Mini generator read the sk-grimoire
mechanics core fixture from `SPELLKAVE_CORE_FIXTURES`.

Publish the raw bundles with this tree's notices or the built compendium
directories with their attached notices. Elven Mini backdrops are under
`assets/ccc3-maps` in that package. The sprites are under `assets/srd-art`
and `assets/elven-mini-art`; Elven Mini exports a build-time catalogue as
`@spellkave/adventure-elven-mini/art`.
