// Damage Rolls + Critical Hits (playing-the-game.md § Damage and Healing):
// two dense, closely related mechanic units sourced from the cached chapter
// markdown (no isolating open5e Rule.json record — same markdown-only
// posture as `hp-units.ts`). Ledger rows: "Damage Rolls", "Critical Hits"
// (`ledger/playing-the-game.md`).
//
// DAMAGE ROLLS — THE WEAPON-VS-FIXED BRANCH (the ledger's own framing: "a
// meaningful branch to encode correctly"). The source text: "When attacking
// with a weapon, you add your ability modifier ... to the damage roll... you
// don't add your ability modifier to a fixed damage amount that doesn't use a
// roll, such as the damage of a Blowgun." `damageRollExpr` below models this
// as presence/absence of `modifierExpr` — omit it for a fixed-damage source,
// supply it (via `modifier-units.ts`'s idiom, composed by the caller, never
// pre-computed) for a weapon/spell roll. "If there's a penalty to the damage,
// it's possible to deal 0 damage but not negative damage" is the `max(0, ...)`
// wrapper (the DSL's `max(...)` function, already proven live by
// `attack-melee.toml`'s own `max(smod, dmod)` finesse comparison).
//
// SISTER RECONCILIATION (AGENTS.md "question, never copy" — grounded, then
// diverged, honestly recorded): `world-fixtures/srd/base/attack-ranged.toml`'s
// generic `srd/attack/ranged` archetype unconditionally subtracts a Dexterity
// modifier from EVERY ranged weapon's damage roll — INCLUDING the Blowgun
// (`world-fixtures/srd/base/weapon-damage-profiles.toml`'s
// `srd/weapon/blowgun` -> `srd/profile/damage/1_piercing`, a genuinely FIXED
// 1-point damage source, per that profile's own single-entry roll_table
// shape) — there is no "no-modifier" tag or branch anywhere in that archetype
// consulted for this. That is the sister's OWN content choice (a single
// generic archetype applied uniformly, trading this one RAW nuance for
// simplicity) — this package does not fix or re-author sister content (out of
// scope, "fresh code, no sister dependencies"), but the divergence is worth
// recording: `damageRollExpr`'s two-branch shape below is MORE faithful to
// the SRD text than the sister's own shipped archetype on this one point.
//
// CRITICAL HITS — "double the DICE, not the modifiers" (the source: "Roll the
// attack's damage dice twice, add them together... If the attack involves
// other damage dice, such as from the Rogue's Sneak Attack feature, you also
// roll those dice twice."). `doubleDiceExpr`/`criticalDamageRollExpr` below
// implement the ARITHMETIC (a bare `NdM` dice literal's `N` doubles; the
// modifier term is untouched) — see the module's own tail comment for why
// WIRING this to "only when the triggering attack roll was a natural 20" is a
// confirmed, code-grounded substrate gap (finding #28), not
// something this package can ship end-to-end today.
/** The composable inputs of one authored damage-roll expression. */
export interface DamageRollOptions {
	/**
	 * The damage dice, as a bare DSL dice literal (`NdM` / `dM`, e.g. `"1d8"`,
	 * `"4d4"`) or a `roll_table(...)` call for an attacker-sourced weapon
	 * profile (the sister's own `srd/damage_profile` pointer idiom,
	 * `world-fixtures/srd/base/damage-profiles.toml`). `doubleDiceExpr` below
	 * only accepts the bare-literal form (see its own doc comment).
	 */
	diceExpr: string;
	/**
	 * Int-valued DSL subexpression for the attacker's relevant ability
	 * modifier — present for a weapon/spell damage roll ("you add your
	 * ability modifier ... to the damage roll"), OMITTED for a fixed damage
	 * amount that doesn't use a roll ("you don't add your ability modifier to
	 * a fixed damage amount... such as the damage of a Blowgun"). The
	 * modifier idiom itself is the CALLER's concern
	 * (`modifier-units.ts`'s `abilityModifierExpr`, never pre-computed here) —
	 * this field takes the already-composed modifier expression, exactly like
	 * `d20TestExpr`'s `proficiencyLevelExpr`/`AttackRollOptions.scoreExpr`
	 * pattern throughout this chapter.
	 */
	modifierExpr?: string;
}

/**
 * Build the full damage-roll expression: `max(0, <dice> [+ <modifier>])` —
 * the `max(0, ...)` floor is the source's own "it's possible to deal 0
 * damage but not negative damage" clause (the DSL's `max(...)` function,
 * live-proven by `attack-melee.toml`'s finesse comparison). Returns a bare
 * POSITIVE magnitude, exactly like `saving-throw-units.ts`'s `saveHalvesExpr`
 * — the CALLER negates it for a `ModifyResource` damage delta (the sister's
 * own `"0 - roll_table(...)"` convention).
 */
export function damageRollExpr(options: DamageRollOptions): string {
	const terms = [options.diceExpr];
	if (options.modifierExpr !== undefined) {
		terms.push(`(${options.modifierExpr})`);
	}
	return `max(0, ${terms.join(" + ")})`;
}

const BARE_DICE_LITERAL = /^(\d*)d(\d+)$/i;

/**
 * Double a bare dice literal's DIE COUNT (never its sides, never a modifier)
 * — the Critical Hits rule's own arithmetic ("Roll the attack's damage dice
 * twice" = double N in an `NdM` literal, e.g. `1d4` -> `2d4`, `3d6` -> `6d6`;
 * an implicit count of 1, `d4`, is read as `1d4` -> `2d4`). Only accepts the
 * BARE dice grammar (`crates/spellkave-dsl/src/lib.rs`'s `try_parse_dice`,
 * the same kernel primitive `d20-units.ts`'s module header grounds `d20` in)
 * — throws loudly on anything else (a `roll_table(...)` weapon-profile
 * pointer, or an already-composed expression), since a roll_table's entries
 * are AUTHORED content this generator cannot safely rewrite by string
 * surgery (the sister mitigates this differently, see this module's own
 * "wiring gap" tail comment).
 */
export function doubleDiceExpr(diceExpr: string): string {
	const trimmed = diceExpr.trim();
	const match = BARE_DICE_LITERAL.exec(trimmed);
	if (match === null) {
		throw new Error(
			`damage-units: '${diceExpr}' is not a bare 'NdM' dice literal — Critical Hit doubling ` +
				"only supports the bare dice grammar (Op::Roll), not roll_table(...) or any other " +
				"subexpression. A weapon-profile roll_table's entries are authored content this " +
				"generator does not rewrite by string surgery.",
		);
	}
	const countText = match[1];
	const sidesText = match[2];
	if (sidesText === undefined) {
		throw new Error(`damage-units: '${diceExpr}' matched the dice regex without a sides group.`);
	}
	const count = countText === undefined || countText === "" ? 1 : Number.parseInt(countText, 10);
	return `${count * 2}d${sidesText}`;
}

/**
 * Build a Critical Hit damage-roll expression: `damageRollExpr` with its
 * dice term doubled via `doubleDiceExpr`, modifier term UNCHANGED (the
 * source's own "not the modifiers" half — a modifier is added once whether
 * or not the hit was Critical).
 */
export function criticalDamageRollExpr(options: DamageRollOptions): string {
	return damageRollExpr({ ...options, diceExpr: doubleDiceExpr(options.diceExpr) });
}

// ─────────────────────────────────────────────────────────────────────────
// THE WIRING GAP — CONFIRMED, CODE-GROUNDED (finding #28,
// `ledger/findings.md`): "double the dice ONLY on a natural 20" needs a
// channel from "was the attack roll (evaluated to admit/reject the act, or a
// guard branch's own roll) a natural 20" to "how many dice does the damage
// consequence roll" — and no such channel exists.
//
// `attackRollExpr` (attack-roll-units.ts) already proves the admission
// predicate CAN capture its own d20 via `let attack_roll = d20; ...` — but
// that binding is scoped to ONE expression's own evaluation (finding
// finding #25(b): even a `let`-bound reference is conservatively classified
// `Global` by the static analyzer, but more fundamentally the bound VALUE
// itself never survives past that one predicate's own eval call). The
// consequence's own `ModifyResource` frame_write (where the damage dice
// actually roll) is a SEPARATE `DslExpression`, evaluated at a LATER,
// independent point (`r_apply_consequence`) with no reference to the
// admission predicate's own bindings.
//
// The `outcome_graph` family (ADR-0058) does not close the gap either — read
// directly, not assumed: `evaluate_outcome_graph`
// (`server/src/world_interaction/layer3/outcome_graph.rs:326-472`) evaluates
// each edge's `guard_predicate` via its own
// `evaluate_predicate_expression_with_report` call, in a loop, ONE EDGE AT A
// TIME — `world-fixtures/srd/base/acid-arrow.toml` (the sister's own
// hit/miss outcome_graph) proves the pattern live: the root->hit edge's guard
// (`d20 >= 13`) and the root->miss edge's guard (the trivial fallback
// `1 == 1`, NOT a second independent roll-vs-AC check) are two SEPARATE
// `DslExpression`s — there is no shared binding across sibling edges, so a
// hypothetical crit-branch edge's own guard (`d20 == 20`) would draw a FRESH,
// UNCORRELATED d20, not reuse whatever face the hit/miss edge's own guard
// rolled. And even where an edge's guard DOES select a node, that node's own
// `consequence_frame_writes` (where `4d4`/`2d4` roll in acid-arrow.toml) are
// STILL a separate expression from the guard that selected the node — the
// guard's resolved value is never threaded into the frame_write it gated.
//
// CONCLUSION: "double the DAMAGE DICE specifically when the SAME roll that
// determined the hit was a natural 20" has no cross-expression channel today
// — confirmed inexpressible end-to-end, the same class of gap as finding #23
// (bare `d20` immune to `ComposedRollBias`). What ships here is the ARITHMETIC
// (`doubleDiceExpr`/`criticalDamageRollExpr`), ready to compose into an
// outcome_graph's own crit-branch NODE the moment a roll-sharing primitive
// exists (or a monster ability that authors its own independent, SRD-
// unfaithful crit-chance roll — not attempted, speculative content this
// package's sourcing discipline forbids).
