// Making an Attack (playing-the-game.md § Combat > Making an Attack): the
// 3-step attack procedure that ties D20 Tests > Attack Rolls into Combat.
// Ledger row: "Making an Attack" (`ledger/playing-the-game.md`).
//
// SOURCE: `cache/open5e/Rule.json`, pk `srd-2024_combat_making-an-attack` —
// the desc IS the 3-step numbered list, cleanly present (confirmed by reading
// the raw JSON directly). NOTE THE FORMAT DIFFERENCE from the D20
// core-procedure unit's own steps: this record uses ordinary markdown
// numbered-list syntax (`N. **Title.** text`, e.g. `1. **Choose a Target.**
// ...`), NOT the `**N: Title.**` bold-run-in shape `d20-units.ts`'s
// `parseD20TestSteps` parses (colon, no list-marker digit) — so this unit
// needs its OWN parser, not a reuse of that one.
//
// PROVENANCE-ONLY VERDICT, NO NEW IDIOM: this procedure does not introduce
// new mechanic content of its own — it is the ORCHESTRATION of idioms this
// chapter already ships, applied in Combat's context:
//   1. "Choose a Target" — a targeting/eligibility concern (which target,
//      what range) already expressible via an affordance's own `range_m` +
//      niche predicate (the sister's `attack-melee.toml`/`attack-ranged.toml`
//      precedent this chapter's own attack-roll-units.ts module header cites).
//   2. "Determine Modifiers" — NAMES Cover explicitly ("the GM determines
//      whether the target has Cover... see the next section") and
//      Advantage/Disadvantage (finding #23's own gap) as the two
//      modifier axes applied BEFORE the roll. Cover is exactly this step,
//      made concrete: the DM applies a Cover condition (`index.ts`'s
//      `buildCoverConditionsFragment`, maxim-audit F1) to a target via
//      ApplyStatus, which widens the target's own `srd/ac` effective read
//      BEFORE `attackRollExpr` ever compares against it — proven composed
//      together in the live proof scene's `cover-grant`/`attack-roll-cover`
//      pair (this chapter's own compose-level deliverable for this step).
//   3. "Resolve the Attack" — literally `attackRollExpr` (attack-roll-units.ts),
//      already authored + offline-proven exhaustively + live-proven (battle-
//      test finding #24/#25). "On a hit, you roll damage" is a DIFFERENT,
//      not-yet-built chapter concern (Damage and Healing > Damage Rolls,
//      still `[ ]` on this ledger) — this unit does not reach into it.
// So the deliverable here is the parsed procedure (provenance table, same
// posture as the D20 core-procedure unit's own `d20TestSteps`) plus this
// mapping note — no new fixture rows, no new expression builder.
import { ruleByPk } from "../../open5e/rule";

export const MAKING_AN_ATTACK_RULE_PK = "srd-2024_combat_making-an-attack";

/** One parsed procedure step of the § Making an Attack numbered list. */
export interface AttackProcedureStep {
	ordinal: number;
	title: string;
	text: string;
}

/**
 * Parse the three numbered procedure steps out of the rule's own desc (the
 * `N. **Title.** text` markdown-numbered-list shape — see module header for
 * why this differs from `d20-units.ts`'s `parseD20TestSteps`). Throws loudly
 * on any shape surprise.
 */
export function parseAttackProcedureSteps(desc: string): AttackProcedureStep[] {
	const matches = [...desc.matchAll(/^(\d+)\.\s+\*\*([^*]+?)\.\*\*\s*(.+)$/gm)];
	if (matches.length === 0) {
		throw new Error(
			`making-an-attack-units: no 'N. **Title.** text' procedure steps parsed out of rule '${MAKING_AN_ATTACK_RULE_PK}'.`,
		);
	}
	return matches.map((match) => ({
		ordinal: Number.parseInt(match[1] ?? "", 10),
		title: (match[2] ?? "").trim(),
		text: (match[3] ?? "").trim(),
	}));
}

/** The parsed § Making an Attack procedure steps, read from the committed cache. */
export function attackProcedureSteps(): AttackProcedureStep[] {
	return parseAttackProcedureSteps(ruleByPk(MAKING_AN_ATTACK_RULE_PK).desc);
}
