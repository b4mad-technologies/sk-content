# Authored flavor blurbs

Input to `srd-cc generate`, not fixtures. Website class cards read
`entity_definitions.description`, which the generator copies from here.

Layout: `authored/flavor/<locale>/<kind>/<slug>.md` (`classes`, `monsters`, `spells`, `items`, `backgrounds`, `species`, `feats`, `armor`, `gear`, `tools`, `resources`, `subclasses`, `class-features`, `capabilities`, `conditions`, `actions`, `weapons`, `natural-weapons`, `traits`, `eldritch-invocations`, `metamagic`, `expertise-options`).

Each file is YAML frontmatter plus the blurb body. Generate with
`skgen prose generate` (`openai/gpt-5.6-terra`; `flavor` / `flavor-creature` / `flavor-spell` / `flavor-item` / `flavor-background` / `flavor-species` / `flavor-feat` / `flavor-gear` / `flavor-resource` / `flavor-subclass` / `flavor-rule`),
review, then `pnpm --filter @spellkave/srd-cc exec tsx scripts/flavor-ingest.ts`.
Never call a model from `generate`.

Coverage vs identity leftovers is `src/flavor/completeness.ts`
(`FLAVOR_EXEMPTIONS`) plus `src/test/offline/flavor-completeness.test.ts`.
Do not grep fixtures to learn what is missing.

The blurbs are first-party Spellkave text under CC BY 4.0 (see the repository
`LICENSE.md`). `skgen` is not part of this repository; `pnpm run audit:flavor`
runs the deterministic spot check described in `PROVENANCE.md`.
