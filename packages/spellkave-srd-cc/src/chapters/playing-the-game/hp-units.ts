// DOC-IMPL: derived-values#storage-conventions-for-the-numbers-themselves
// Hit Points (playing-the-game.md § Damage and Healing > Hit Points): the
// foundational resource this whole chapter's damage/save/heal machinery
// drains and restores. Ledger row: `ledger/playing-the-game.md` "Hit Points
// (max, current, Bloodied)".
//
// SOURCE: the cached chapter markdown (no open5e Rule.json record isolates
// this H3 — the "Damage and Healing" bundle is a dense multi-record chapter
// where each H3 gets its own `Rule.json` pk EXCEPT this one's exact identity
// text, which reads cleanly straight from the markdown; same fallback posture
// `d20-units.ts`/`attack-roll-units.ts` already established for this
// chapter's other markdown-only lines).
//
// SISTER PRECEDENT (AGENTS.md "question, never copy" — grounded, then
// diverged where warranted): `world-fixtures/srd/base/resources.toml` ships
// `srd/hp`: `min_value = 0`, `initial_value = 999`, `max_value = 999`,
// `recovery_rule = "long_rest"`. Read CAREFULLY, not copied blind: 999 is NOT
// a real per-creature Hit Point maximum (no such value exists in the SRD —
// max HP varies per class/level/CON) — it is a SAFETY-BOUND ceiling, high
// enough that no real creature's current HP ever approaches it. The sister's
// OWN `advancement.toml` header says so explicitly: "There is no authored
// per-actor HP-maximum surface today; the global resource-definition
// max_value is only a safety bound, not an actor's maximum." Every concrete
// actor (ds1-victim at 4, the fighter demo at higher values, …) seeds its OWN
// starting `srd/hp` via an explicit `object_state`/`entity_definition_
// initial_state` row — `resource_definitions.initial_value` is never read as
// a per-instance default (the same "id, not identity" caution `level-units.ts`
// and `advancement.toml` both document for `srd/level`).
//
// CONSEQUENCE FOR THIS UNIT'S "Bloodied" HALF: `bloodiedExpr` below therefore
// takes the creature's Hit Point MAXIMUM as a caller-supplied DSL
// subexpression, exactly like `attack-roll-units.ts`'s `acExpr` (AC deferred
// to an Equipment-chapter unit) — there is no `target.stat('srd/hp_max')` (or
// equivalent) to read today; a per-creature max is Character-Creation/
// Monster-statblock material this chapter does not own. Recorded honestly as
// a substrate gap, not silently patched over with an invented resource this
// chapter has no sourcing authority to define — see `ledger/findings.md`
// finding #30.
//
// BOUNDS ADOPTED (999/999/0/long_rest): this package reaches the SAME
// conclusion the sister did independently — a generous safety-bound ceiling,
// not a per-creature cap — so the numbers are kept identical, but the
// REASONING is this package's own (documented above), not a blind copy.
// `recovery_rule = "long_rest"` matches this chapter's own "Resting" pointer
// row (§ Damage and Healing > Hit Points' own sidebar: "Regaining Hit Points
// is one of the main benefits of a rest").
import { readFileSync } from "node:fs";
import path from "node:path";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";

export const HP_ID = "hp";
export const HP_DISPLAY_NAME = "Hit Points";
export const MIN_HP = 0;
/** Safety-bound ceiling — NOT a per-creature Hit Point maximum. See module header. */
export const HP_SAFETY_MAX = 999;
export const INITIAL_HP = 999;
export const HP_RECOVERY_RULE = "long_rest";

const HP_DEFINITION_SENTENCE =
	"Your Hit Point maximum is the number of Hit Points you have when uninjured. " +
	"Your current Hit Points can be any number from that maximum down to 0, " +
	"which is the lowest Hit Points can go.";

const BLOODIED_SENTENCE =
	"If you have half your Hit Points or fewer, you're Bloodied, which has no " +
	"game effect on its own but which might trigger other game effects.";

/**
 * Confirm both sourcing sentences are still present, verbatim, in the cached
 * chapter markdown's § Hit Points section — a loud-fail guard so a fork
 * re-sync that rewords either line is caught here rather than silently
 * leaving this unit's own provenance claim un-grounded (same posture as
 * `level-units.ts`'s `assertLevelProvenanceSource`).
 */
export function assertHpProvenanceSource(): void {
	const markdown = readFileSync(path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md"), "utf8");
	if (!markdown.includes(HP_DEFINITION_SENTENCE)) {
		throw new Error(
			`hp-units: expected Hit Points definition sentence '${HP_DEFINITION_SENTENCE}' not ` +
				"found in cached playing-the-game.md — the § Hit Points section may have been reworded.",
		);
	}
	if (!markdown.includes(BLOODIED_SENTENCE)) {
		throw new Error(
			`hp-units: expected Bloodied sentence '${BLOODIED_SENTENCE}' not found in cached ` +
				"playing-the-game.md — the § Hit Points section may have been reworded.",
		);
	}
}

/**
 * Build the Bloodied predicate: `<current> <= <max> / 2`.
 *
 * SIGN/TRUNCATION NOTE (worked, not assumed — contrast `modifier-units.ts`'s
 * own warning that the DSL's truncating-toward-zero `/` breaks floor
 * semantics for NEGATIVE operands): a creature's Hit Point maximum is always
 * >= 0 (SRD: "0, which is the lowest Hit Points can go" — the FLOOR of the
 * pool, and a maximum is never smaller than that floor), so `maxExpr / 2`
 * never divides a negative operand. Truncation-toward-zero and floor agree
 * for every non-negative dividend, so the bare DSL division is ALREADY
 * correct here — no floor-correction idiom needed, unlike the ability-
 * modifier idiom's `(score - 10) / 2` (where `score - 10` genuinely can be
 * negative). "Half your Hit Points or fewer" also has no ambiguity for an
 * integer `current`: being at or under the real number `max / 2` (e.g. 7.5
 * for max 15) is, for an integer `current`, exactly `current <= 7`, which is
 * exactly `Math.trunc(15 / 2)` — proven exhaustively in
 * `src/test/offline/hp-units.test.ts`.
 */
export function bloodiedExpr(currentExpr: string, maxExpr: string): string {
	return `(${currentExpr}) <= (${maxExpr}) / 2`;
}
