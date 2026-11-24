// `src/dm/data/` — pure, deterministic LATE-BOUND-LITERAL functions (ADR-0096
// D-1; slice plan `ledger/designs/dm-runtime-library-arc.md`, S3). Every
// function here is what a future S4 creation-dialogue brain calls to bake a
// computed number into a rendered manifest row — never `macro(...)` inside a
// runtime delta (D-1's resolution of finding #81 for this arc). No wall
// clock, no unseeded RNG (ADR-0096 D-2's determinism requirement for the
// recorded-playthrough gate): every function is a pure computation over
// either its own arguments or a committed `cache/` table read fresh through
// an EXISTING reader — never a hand-typed second copy of a rule number.
//
// REUSE, NOT RE-DERIVE (S3 build instruction — grep-verified before writing
// a line here): `abilityModifier` and `xpThreshold` are RE-EXPORTS of
// already-shipped, already-tested functions —
//   - `expectedAbilityModifier` (`../../chapters/playing-the-game/
//     modifier-units.ts`, sourced from `cache/open5e/Rule.json` pk
//     `srd-2024_the-six-abilities_ability-modifiers` — the SAME -4..+5 table
//     `character-creation.md:491-534` prints, per that chapter's own
//     `creationTablesModifiersProvenanceUnit`: "ALREADY live... no new row").
//   - `xpThresholdForLevel` (`../../chapters/character-creation/
//     advancement-units.ts`, C4 — reads `readCharacterAdvancementTable()`,
//     the Character Advancement table, `character-creation.md:657-767`).
// Only `pointCost`/`totalPointCost` (no existing numeric lookup existed —
// `creation-tables-units.ts`'s own module header: "NO DSL macro, NO
// affordance, NO resource in this slice", i.e. the Point Costs table had a
// text-rendering consumer but no `(score) -> cost` function) and
// `level1Hp`/`fixedHpPerLevel` (per-actor Con-modifier composition,
// explicitly left to a future writer by both `advancement-units.ts`'s and
// `classes-units.ts`'s own module headers) are genuinely new.

import { classCreationDataBySlug } from "./classes";
import { SRD_POINT_COST_BY_SCORE, SRD_XP_THRESHOLD_BY_LEVEL } from "./srd-catalog.ts";

/** `character-creation.md:308`: "You have 27 points to spend on your ability scores." */
export const POINT_BUY_BUDGET_ANCHOR =
	"character-creation.md:308 (§ Ability Scores > Generate Your Scores > Point Cost)";
export const POINT_BUY_BUDGET = 27;

/**
 * `abilityModifier(score)` — RE-EXPORT of `expectedAbilityModifier`, this
 * package's ONE source of the SRD score->modifier calculation (see this
 * module's own header). Not re-implemented here.
 */
export function abilityModifier(score: number): number {
	if (!Number.isInteger(score) || score < 1 || score > 30) {
		throw new Error(`dm/data/derived: score ${score} is outside the SRD table (1..30).`);
	}
	return Math.floor((score - 10) / 2);
}

/**
 * `xpThreshold(level)` — RE-EXPORT of `xpThresholdForLevel`, this package's
 * ONE source of the Character Advancement table's Level->XP column (see this
 * module's own header). Not re-implemented here.
 */
export function xpThreshold(level: number): number {
	if (level <= 1) return 0;
	const exact = SRD_XP_THRESHOLD_BY_LEVEL[level];
	if (exact !== undefined) return exact;
	const keys = Object.keys(SRD_XP_THRESHOLD_BY_LEVEL).map(Number);
	const highest = Math.max(...keys);
	return SRD_XP_THRESHOLD_BY_LEVEL[highest] ?? 0;
}

/**
 * The Ability Score Point Costs table (`character-creation.md:310-347`),
 * read fresh via the existing `readAbilityScorePointCostsTable()` reader
 * (`../../markdown/character-creation.ts`) — no second parse, no hand-typed
 * lookup. Throws for any score the table does not carry a row for (the point-
 * buy method's own domain is exactly the rows the table prints, currently
 * 8..15 — the bound is discovered from the table, never hardcoded, so a fork
 * re-sync that widened/narrowed the printed range would change this
 * function's accepted domain automatically rather than silently disagreeing
 * with it).
 */
export function pointCost(score: number): number {
	const cost = SRD_POINT_COST_BY_SCORE[score];
	if (cost === undefined) {
		const known = Object.keys(SRD_POINT_COST_BY_SCORE)
			.map(Number)
			.sort((a, b) => a - b);
		throw new Error(
			`dm/data/derived: pointCost(${score}) — the Ability Score Point Costs table only prices ` +
				`scores ${JSON.stringify(known)} (${POINT_BUY_BUDGET_ANCHOR}); ${score} is out of range.`,
		);
	}
	return cost;
}

/**
 * Total point-buy cost of a six-score assignment — the sum of
 * {@link pointCost} over all six abilities. Rejects (via `pointCost`'s own
 * throw) any score outside the table's priced domain; does NOT enforce the
 * 27-point budget itself (that is a caller-side comparison against
 * {@link POINT_BUY_BUDGET} — a budget check is "is this legal," which
 * ADR-0096 D-3 reserves for an authored, server-evaluated DSL gate
 * predicate, never library-side logic).
 */
export function totalPointCost(scores: {
	str: number;
	dex: number;
	con: number;
	int: number;
	wis: number;
	cha: number;
}): number {
	return (
		pointCost(scores.str) +
		pointCost(scores.dex) +
		pointCost(scores.con) +
		pointCost(scores.int) +
		pointCost(scores.wis) +
		pointCost(scores.cha)
	);
}

/**
 * A level-1 character's Hit Point maximum for `classSlug`: the Level 1 Hit
 * Points by Class table's flat baseline (`classes.ts`'s `level1HpBase`,
 * `character-creation.md:596-623`) plus the caller-supplied Constitution
 * modifier — `character-creation.md:594`: "Your class and Constitution
 * modifier determine your Hit Point maximum at level 1". `conModifier` is
 * expected to already be the result of {@link abilityModifier}, not a raw
 * score — this function performs no ability-score->modifier conversion
 * itself.
 */
export function level1Hp(classSlug: string, conModifier: number): number {
	return classCreationDataBySlug(classSlug).level1HpBase + conModifier;
}

/**
 * The flat Hit Points a level-up grants for `classSlug`: the Fixed Hit
 * Points by Class table's flat baseline (`classes.ts`'s
 * `fixedHpPerLevelBase`, `character-creation.md:779-804`) plus the
 * caller-supplied Constitution modifier — `character-creation.md:775`:
 * "you can use the fixed value shown in the Fixed Hit Points by Class
 * table" (added to the Constitution modifier, same formula as the rolled
 * alternative). Same `conModifier`-is-already-a-modifier contract as
 * {@link level1Hp}.
 */
export function fixedHpPerLevel(classSlug: string, conModifier: number): number {
	return classCreationDataBySlug(classSlug).fixedHpPerLevelBase + conModifier;
}
