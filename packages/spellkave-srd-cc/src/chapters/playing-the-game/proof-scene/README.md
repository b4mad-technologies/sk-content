# Playing the Game proof scene

The live proof is split by the test concern a reviewer recognizes:

- `shared.ts`: proof bundle, two-node graph, and directed edge ids.
- `identity.ts`: hero, training targets, ability/skill seeds, and modifier boundaries.
- `checks.ts`: generic-check grants and proof-authored check specifications.
- `combat.ts`: attack, cover, the pressure-plate save, Advantage, Guard, and
  Unarmed Strike values.
- `initiative.ts`: combatants and scheduler/session ids.

`calls/` groups the authoring calls by the same concerns;
`../proof-scene-calls.ts` preserves their required execution order.
`../proof-scene-generator.ts` renders that plan, and
`../proof-scene-layout.ts` only partitions the verb-rendered TOML for review.
Historical decisions live in `ledger/playing-the-game.md` and
`ledger/designs/`.
