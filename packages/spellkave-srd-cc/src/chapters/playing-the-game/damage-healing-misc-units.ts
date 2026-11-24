// Damage and Healing — the remaining units after `hp-units.ts`,
// `damage-units.ts`, `temp-hp-units.ts` and `saving-throw-units.ts`'s own
// `saveHalvesExpr`: Damage Types (pointer), Resistance and Vulnerability
// (mechanic, an orderable arithmetic pipeline), Immunity (short definitional),
// Death Saving Throws (the one fully-numeric, self-contained slice of the
// dense "Dropping to 0 Hit Points" bundle), and a RECONCILIATION verdict for
// Knocking Out a Creature / the rest of "Dropping to 0". Ledger rows:
// `ledger/playing-the-game.md`'s "Damage Types", "Resistance and
// Vulnerability", "Immunity", "Knocking Out a Creature", "Dropping to 0 Hit
// Points".
//
// SOURCE: cached chapter markdown (no isolating open5e Rule.json record for
// any of these H3s within this package's read scope — same markdown-only
// posture as this bucket's other new units).
import { readFileSync } from "node:fs";
import path from "node:path";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";

function markdown(): string {
	return readFileSync(path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md"), "utf8");
}

function assertContains(sentence: string, label: string): void {
	if (!markdown().includes(sentence)) {
		throw new Error(
			`damage-healing-misc-units: expected ${label} sentence '${sentence}' not found in ` +
				"cached playing-the-game.md — the section may have been reworded.",
		);
	}
}

// ─────────────────────────────────────────────────────────────────────────
// Damage Types — POINTER VERDICT, no fixture content (same posture as
// "Resting" below and the ledger's own "Hazards"/"Damage Types" framing):
// the rule text is explicit that damage types have "no rules of their own".
const DAMAGE_TYPES_SENTENCE =
	"Each instance of damage has a type, like Fire or Slashing. Damage types are " +
	'listed in "Rules\nGlossary" and have no rules of their own, but other rules, ' +
	"such as Resistance, rely on damage types.";

export function assertDamageTypesProvenanceSource(): void {
	assertContains(DAMAGE_TYPES_SENTENCE, "Damage Types");
}

// ─────────────────────────────────────────────────────────────────────────
// Resting — POINTER VERDICT (the Hit Points sidebar): the actual Short/Long
// Rest mechanics are explicitly deferred to "Rules Glossary".
const RESTING_SENTENCE = '"Rules Glossary" provides the rules for Short and Long Rests.';

export function assertRestingProvenanceSource(): void {
	assertContains(RESTING_SENTENCE, "Resting");
}

// ─────────────────────────────────────────────────────────────────────────
// Resistance and Vulnerability — a precise, orderable arithmetic pipeline:
// "Modifiers to damage are applied in the following order: adjustments...
// are applied first; Resistance is applied second; and Vulnerability is
// applied third." Resistance halves (round down), Vulnerability doubles.
// "No Stacking": multiple instances of Resistance (or Vulnerability) to the
// SAME type count as one — structurally enforced here by each stage being a
// single BOOLEAN gate, never a count, so there is no way to compose two
// resistance halvings even if a caller tried.
//
// DAMAGE-TYPE AWARENESS — PROBED, NOT BUILT: composing this pipeline against
// a REAL fixture needs a per-actor, per-damage-type resistance/vulnerability
// FACT to gate on (`resistantPredicate`/`vulnerablePredicate` below take any
// bool DSL subexpression, e.g. a hypothetical `actor.has_tag('resistance.
// fire')`) — grepped `world-fixtures/srd/base/*.toml` for any such axis:
// zero hits (the sister's own "Legendary Resistance" rows, `boss-dragon.toml`,
// are a DIFFERENT mechanic — a save-reroll meta-ability, not damage-type
// Resistance/Vulnerability). No damage-type-aware gate exists anywhere on
// this substrate today. The ARITHMETIC ships, exhaustively pinned against
// the source's own worked example
// (`src/test/offline/damage-healing-misc-units.test.ts`); wiring it to a
// concrete fixture is deferred, honestly, to whichever future unit
// authors a damage-type-aware creature trait.
const RESISTANCE_VULNERABILITY_WORKED_EXAMPLE =
	"For example, a creature has Resistance to all damage and Vulnerability to " +
	"Fire damage, and it's within a magical aura that reduces all damage by 5. " +
	"If it takes 28 Fire damage, the damage is first reduced by 5 (to 23), then " +
	"halved for the creature's Resistance (and rounded down to 11), then " +
	"doubled for its Vulnerability (to 22).";

export function assertResistanceVulnerabilityProvenanceSource(): void {
	assertContains(
		RESISTANCE_VULNERABILITY_WORKED_EXAMPLE,
		"Resistance and Vulnerability worked example",
	);
}

/** The composable inputs of the Resistance/Vulnerability/Immunity damage pipeline. */
export interface DamageModifierPipelineOptions {
	/**
	 * Damage AFTER adjustments (bonuses/penalties/multipliers) already
	 * compose — that step is the CALLER's own concern (e.g.
	 * `damageRollExpr`'s own `max(0, ...)` floor, or a further authored
	 * bonus/penalty term), never pre-applied here. Must already be
	 * non-negative (module contract, mirrors `hp-units.ts`'s own
	 * non-negativity reasoning) — Resistance's halving relies on
	 * truncation-toward-zero agreeing with "round down" only for a
	 * non-negative dividend.
	 */
	adjustedDamageExpr: string;
	/** Bool DSL subexpression: true iff the target is Immune to this damage's type. Immunity short-circuits to 0, checked OUTERMOST — absolute, not part of the source's own 3-step order (which only covers adjustments/Resistance/Vulnerability). */
	immunePredicate?: string;
	/** Bool DSL subexpression: true iff the target has Resistance to this damage's type. */
	resistantPredicate?: string;
	/** Bool DSL subexpression: true iff the target has Vulnerability to this damage's type. */
	vulnerablePredicate?: string;
}

/**
 * Build the ordered damage-modifier pipeline: adjustments (caller's own,
 * pre-applied into `adjustedDamageExpr`) -> Resistance (halve, round down) ->
 * Vulnerability (double) -> Immunity (short-circuits the WHOLE result to 0,
 * checked outermost). Every stage is an omittable `cond(...)` gate — omitting
 * a predicate reproduces the untouched upstream value byte-for-byte, so a
 * damage source with no Resistance/Vulnerability/Immunity composes this
 * pipeline as a no-op wrapper.
 */
export function damageModifierPipelineExpr(options: DamageModifierPipelineOptions): string {
	const { adjustedDamageExpr, immunePredicate, resistantPredicate, vulnerablePredicate } = options;
	const resisted =
		resistantPredicate === undefined
			? adjustedDamageExpr
			: `cond(${resistantPredicate}, (${adjustedDamageExpr}) / 2, ${adjustedDamageExpr})`;
	const vulnerable =
		vulnerablePredicate === undefined
			? resisted
			: `cond(${vulnerablePredicate}, (${resisted}) * 2, ${resisted})`;
	return immunePredicate === undefined ? vulnerable : `cond(${immunePredicate}, 0, ${vulnerable})`;
}

// ─────────────────────────────────────────────────────────────────────────
// Immunity — short definitional rule, no arithmetic of its own beyond the
// `immunePredicate` short-circuit already composed into
// `damageModifierPipelineExpr` above (damage-type immunity) — condition
// immunity ("unaffected by it") is an ApplyStatus-time gate, out of this
// numeric pipeline's own scope entirely (a different primitive, condition
// application, not damage arithmetic).
const IMMUNITY_SENTENCE =
	"Immunity to a damage type means you don't take damage of that type, and " +
	"Immunity to a condition means you aren't affected by it.";

export function assertImmunityProvenanceSource(): void {
	assertContains(IMMUNITY_SENTENCE, "Immunity");
}

// ─────────────────────────────────────────────────────────────────────────
// Death Saving Throws — the one fully-numeric, self-contained slice of the
// dense "Dropping to 0 Hit Points" bundle (ledger row's own framing). "Unlike
// other saving throws, this one isn't tied to an ability score" — a FLAT DC
// 10 check, no ability modifier, no proficiency bonus: `d20TestExpr` is the
// WRONG idiom here (it always composes an ability-modifier term); the bare
// comparison is both simpler and more correct.
const DEATH_SAVE_SENTENCE =
	"Roll 1d20. If the roll is 10 or higher, you succeed. Otherwise, you fail.";

export function assertDeathSaveProvenanceSource(): void {
	assertContains(DEATH_SAVE_SENTENCE, "Death Saving Throws");
}

export const DEATH_SAVE_DC = 10;

/** The bare Death Saving Throw success check: `d20 >= 10`, no modifier of any kind. */
export function deathSaveExpr(): string {
	return `d20 >= ${DEATH_SAVE_DC}`;
}

// THE NAT-1/NAT-20 BRANCHES AND THE STATEFUL CLOCK — RECONCILED, NOT BUILT
// HERE. "Rolling a 1 or 20" (nat-1 = two failures, nat-20 = regain 1 HP) and
// the "three of a kind" tally-then-threshold resolution are STATEFUL ACROSS
// TURNS (two persistent counters + a captured last-roll scratch cell), not a
// single predicate this idiom-builder module can express — this is the exact
// "ship the expression pieces that ARE expressible... + findings for the
// stateful rest" split the operator brief itself calls for.
//
// RECONCILIATION (grounded by reading the sister's own fixture directly, not
// assumed): `world-fixtures/srd/base/death-saves.toml` ALREADY builds this
// exact stateful clock end to end — two tally `resource_definitions`
// (`srd/death_save_successes`/`srd/death_save_failures`, bounds [0,3]) plus a
// captured-roll scratch cell (`srd/death_save_last_roll`, avoiding a `let`
// entirely by using the SAME "capture via `delta = target - current`" idiom
// this bundle's own `temp-hp-units.ts` module header cites), a turn-gated
// `srd/death_save/roll` action, and ordinal-sequenced `ModifyResource`/
// `ForEachActorInRadius` frame_writes reading each ordinal's own
// already-committed state (the SAME sequential-commit idiom `temp-hp-units.ts`
// and `attack-melee.toml`'s lethal cascade both rely on). PROVEN: no new
// kernel primitive is needed to build the full stateful clock — the sister
// already did it with today's primitives. SHIPPED (sk-609b.18): full clock in
// `death-saves-units.ts` + `fragments/death-saves.ts`; Falling Unconscious on
// the PC attack fold (`characterUnconsciousFrameWrite`); Unconscious/Stable in
// `fragments/conditions.ts`. This module keeps `deathSaveExpr` as the reusable
// flat DC-10 idiom those rows compose.
//
// KNOCKING OUT A CREATURE — reconciliation verdict, no new fixture content:
// "When you would reduce a creature to 0 Hit Points with a MELEE attack, you
// CAN INSTEAD reduce it to 1 Hit Point and give it the Unconscious condition"
// — a per-hit CHOICE available with ANY melee weapon. `world-fixtures/srd/
// base/attack-bludgeoning.toml` implements a RELATED but STRUCTURALLY
// DIFFERENT shape: a separate `srd/attack/bludgeoning` action/archetype that
// is ALWAYS non-lethal for whatever weapon it's authored against, rather
// than a CHOICE surfaced at the moment any melee attack would land a killing
// blow. This is a divergence worth recording, not a bug in the sister (out
// of this package's scope to fix, "fresh code, no sister dependencies"): the
// RAW rule needs a post-hit CHOICE point (lethal vs non-lethal outcome,
// selected by the attacker) that no pattern in this codebase authors today —
// the closest kin, `acid-arrow.toml`'s outcome_graph hit/miss branch, selects
// on a DIE ROLL, not a player DECISION between two consequences for the same
// hit. Recorded honestly; not built.
const KNOCKING_OUT_SENTENCE =
	"When you would reduce a creature to 0 Hit Points with a melee attack, you " +
	"can instead reduce the creature to 1 Hit Point and give it the Unconscious condition.";

export function assertKnockingOutProvenanceSource(): void {
	assertContains(KNOCKING_OUT_SENTENCE, "Knocking Out a Creature");
}
