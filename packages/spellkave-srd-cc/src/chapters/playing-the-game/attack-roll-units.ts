// Attack Rolls (playing-the-game.md § D20 Tests > Attack Rolls): dense unit —
// the Attack Roll Abilities table (which ability governs which attack type),
// the base AC formula (`10 + Dexterity modifier`), and the natural-20/
// natural-1 auto-hit/auto-miss override. Ledger row: "Attack Rolls"
// (`ledger/playing-the-game.md`).
//
// SOURCE SPLIT (unlike every other unit in this chapter, this one needs BOTH
// cached sources for different reasons):
//   - Attack Roll Abilities table + the "Rolling 20 or 1" prose: cleanly
//     present in `cache/open5e/Rule.json`, pk `srd-2024_d20-tests_attack-rolls`.
//   - The base AC FORMULA LINE ITSELF (`**Base AC** = 10 + the creature's
//     Dexterity modifier`): open5e's own conversion DROPPED this line from
//     the Rule desc — the desc's "Calculating AC" paragraph ends with "All
//     creatures start with the same base AC calculation:" and jumps straight
//     to the NEXT paragraph, the formula line itself is simply absent. This
//     mirrors the D20 core-procedure unit's own finding (open5e omits the
//     markdown's step 3) — same failure mode, different section. The formula
//     is therefore sourced from the cached MARKDOWN instead
//     (`cache/markdown/playing-the-game.md`), the authoritative fallback this
//     chapter already established.
//
// SRD/AC RESOURCE — DEFERRED, NOT SHIPPED HERE (ledger's own open decision):
// the sister (`world-fixtures/srd/base/monsters.toml`/`armor.toml`) owns an
// `srd/ac` object_state_definition + a `srd/ac` modifier_target_definition
// axis, because AC's actual VALUE composition (base + armor bonus + magic
// items + spells) is an EQUIPMENT/ARMOR-chapter concern, not a Playing the
// Game one — this chapter's own job is the PROCEDURE (attack roll >= AC) and
// the FORMULA (base = 10 + dex mod), not the stat itself. Authoring an
// `srd/ac` row here, ahead of whichever chapter models armor, would be this
// package's OWN version of finding #17's namespace-ownership question
// (which bundle/chapter legitimately owns `srd/ac`) — deliberately not
// preempted. `attackRollExpr` below therefore takes the AC as a caller-
// supplied DSL subexpression (a literal, or later `target.stat('srd/ac')`
// once an Equipment-chapter unit ships that resource), exactly like
// `d20TestExpr` takes its DC as a literal.
//
// NATURAL 20 / NATURAL 1 — PROBED, NOT ASSUMED (see this chapter's own
// finding: the operator brief flagged "each `d20` occurrence in
// a DSL expression is an INDEPENDENT roll (no let-binding), so nat 20
// auto-hit... may be inexpressible in one predicate without rolling twice."
// Probed against the actual grammar (`crates/spellkave-dsl/src/lib.rs`,
// `parse_let_bool`/`parse_let_int`, dsl_operator "Let" doc example: `"let
// difficulty = 10 ; 1d20 >= difficulty"`) and REFUTED: the DSL's `let` DOES
// bind a value ONCE (evaluated eagerly, `eval.rs`'s `Op::Let` arm) and lets
// the BOOLEAN body reference it by name repeatedly — `parse_let_bool` is a
// genuine top-level predicate grammar, not merely a sub-expression. So ONE
// `d20` roll, bound via `let`, expresses nat-20/nat-1 auto-hit/auto-miss
// alongside the ordinary total-vs-AC comparison in a SINGLE predicate — the
// caution named a real DSL property (bare, unbound `d20` occurrences ARE
// independent re-rolls) but the conclusion doesn't follow, because `let`
// exists specifically to avoid that trap. Finding recorded
// either way (see `ledger/findings.md`) — this is a correction of a
// documented assumption, not a silent fix.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";
import { ruleByPk } from "../../open5e/rule";
import {
	abilityModifierExpr,
	abilityModifierMacroCall,
	proficiencyBonusMacroCall,
} from "./modifier-units";

export const ATTACK_ROLLS_RULE_PK = "srd-2024_d20-tests_attack-rolls";

/** One row of the Attack Roll Abilities table (§ D20 Tests > Attack Rolls). */
export interface AttackRollAbility {
	ability: string;
	attackType: string;
}

/** Parse the Attack Roll Abilities table (Ability | Attack Type). Throws loudly on shape surprise. */
export function parseAttackRollAbilities(desc: string): AttackRollAbility[] {
	const lines = desc.split("\n").map((line) => line.trim());
	const headerIndex = lines.findIndex((line) => /^\|Ability\|Attack Type/.test(line));
	if (headerIndex === -1) {
		throw new Error(
			`attack-roll-units: Attack Roll Abilities header not found in rule '${ATTACK_ROLLS_RULE_PK}'.`,
		);
	}
	const separatorLine = lines[headerIndex + 1];
	if (separatorLine === undefined || !/^\|-+\|-+\|$/.test(separatorLine)) {
		throw new Error(
			"attack-roll-units: no '|---|---|' separator after the Attack Roll Abilities header.",
		);
	}
	const rows: AttackRollAbility[] = [];
	for (let index = headerIndex + 2; index < lines.length; index += 1) {
		const line = lines[index];
		if (line === undefined || !/^\|[^|]+\|[^|]+\|$/.test(line)) {
			break;
		}
		const [ability, attackType] = line
			.slice(1, -1)
			.split("|")
			.map((cell) => cell.trim());
		if (ability === undefined || attackType === undefined) {
			throw new Error(`attack-roll-units: malformed Attack Roll Abilities row '${line}'.`);
		}
		rows.push({ ability, attackType });
	}
	if (rows.length === 0) {
		throw new Error("attack-roll-units: no Attack Roll Abilities rows parsed.");
	}
	return rows;
}

/** The parsed Attack Roll Abilities table, read from the committed cache. */
export function attackRollAbilities(): AttackRollAbility[] {
	return parseAttackRollAbilities(ruleByPk(ATTACK_ROLLS_RULE_PK).desc);
}

const BASE_AC_FORMULA_LINE = "**Base AC** = 10 + the creature's Dexterity modifier";
export const BASE_AC_MACRO_ID = "srd/base_ac";
export const BASE_AC_MACRO_BODY_SOURCE = "10 + (dex_modifier)";
export const ATTACK_ROLL_HITS_MACRO_ID = "srd/attack_roll_hits";
/**
 * Nat-1 auto-miss; auto-hit when `attack_roll >= crit_threshold` (SRD default
 * 20). Improved Critical (Champion L3) lowers the threshold to 19 at the
 * call site via `improvedCriticalThresholdExpr()` — the leaf macro stays
 * capability-free (params only); capability is composed outside the body.
 *
 * pattern: derived-value-mechanism
 * → docs/derived-values.md (leaf macros) + this file's attackRollExpr
 */
export const ATTACK_ROLL_HITS_MACRO_BODY_SOURCE =
	"attack_roll != 1 && attack_roll >= crit_threshold || total >= ac";

/** Champion Improved Critical capability — inlined id avoids playing-the-game ↔ classes cycle. */
export const IMPROVED_CRITICAL_CAPABILITY_ID =
	"srd/class-feature/fighter/champion/improved-critical";

/** Int expr: 19 with Improved Critical, else 20 (classes.md Champion L3). */
export function improvedCriticalThresholdExpr(): string {
	return `cond(actor.has_capability('${IMPROVED_CRITICAL_CAPABILITY_ID}'), 19, 20)`;
}

/** Build the typed base-AC macro call from an already-calculated Dexterity modifier. */
export function baseArmorClassMacroCall(dexModifierExpr: string): string {
	return `macro('${BASE_AC_MACRO_ID}', ${dexModifierExpr})`;
}

/** Build the central SRD natural-20/natural-1 attack outcome macro call. */
export function attackRollHitsMacroCall(
	attackRollExpr: string,
	totalExpr: string,
	acExpr: string,
	critThresholdExpr: string = "20",
): string {
	return `macro('${ATTACK_ROLL_HITS_MACRO_ID}', ${attackRollExpr}, ${totalExpr}, ${acExpr}, ${critThresholdExpr})`;
}

/**
 * Confirm the base AC formula line is still present, verbatim, in the cached
 * chapter markdown (open5e's own Rule.json desc dropped it — see module
 * header) — a loud-fail guard so a fork re-sync that rewords the line is
 * caught here rather than silently leaving `baseArmorClassExpr` un-grounded.
 */
export function assertBaseArmorClassFormulaSource(): void {
	const markdown = readFileSync(path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md"), "utf8");
	if (!markdown.includes(BASE_AC_FORMULA_LINE)) {
		throw new Error(
			`attack-roll-units: expected base-AC formula line '${BASE_AC_FORMULA_LINE}' not found in ` +
				"cached playing-the-game.md — the § Attack Rolls > Armor Class section may have been reworded.",
		);
	}
}

/**
 * Build the DSL expression for the SRD base AC formula: `10 + <dex modifier>`
 * (`dexScoreExpr` any int-valued DSL subexpression, e.g. `actor.effective('srd/dex')`
 * — the ability-modifier macro is composed at the call site, never stored as
 * calculated state. Macro bodies remain leaf-only in v1.
 */
export function baseArmorClassExpr(dexScoreExpr: string): string {
	return baseArmorClassMacroCall(abilityModifierMacroCall(dexScoreExpr));
}

/** The composable inputs of one authored attack-roll predicate. */
export interface AttackRollOptions {
	/** Int-valued DSL subexpression for the attacker's relevant ability SCORE. */
	scoreExpr: string;
	/** Int-valued DSL subexpression for the attacker's level/CR, iff proficient with the weapon/spell. */
	proficiencyLevelExpr?: string;
	/**
	 * Equipment Proficiencies > Weapons (playing-the-game.md § Proficiency):
	 * "If you have proficiency with a weapon, you add your Proficiency Bonus
	 * to attack rolls you make with it." Optional capability id gating the
	 * bonus the same way `d20-units.ts`'s `D20TestOptions.
	 * proficiencyCapabilityId` gates a skill/save check — see that field's own
	 * doc comment for the shared shape. Ignored if `proficiencyLevelExpr` is
	 * absent (no bonus term to gate).
	 */
	proficiencyCapabilityId?: string;
	/** Optional circumstantial bonus/penalty term, parenthesized on use. */
	circumstantialExpr?: string;
	/**
	 * The target's Armor Class as an int-valued DSL subexpression — a literal
	 * (this chapter's own posture, `srd/ac` deferred, see module header) or a
	 * later `target.stat('srd/ac')` once an Equipment-chapter unit ships that
	 * resource.
	 */
	acExpr: string;
}

/**
 * Build the full attack-roll predicate: a `let`-bound single d20 roll,
 * checked for natural 20 (auto-hit) / natural 1 (auto-miss) BEFORE the
 * ordinary total-vs-AC comparison — all from the SAME roll (module header:
 * refutes the "needs two rolls" caution). Terms compose the chapter's
 * existing idiom builders, never retyped.
 *
 * SHAPE, GRAMMAR-GROUNDED (live-corrected, see module header's own note):
 * the DSL's boolean grammar has NO parenthesized-boolean-subexpression
 * construct — `parse_bool_term` (`crates/spellkave-dsl/src/lib.rs`) accepts
 * only `roll_under(...)`, `shares_tag(...)`, a `subject.method(...)` call, or
 * a bare `<int_expr> <compare_op> <int_expr>`; a `(` there is read as the
 * START OF AN ARITHMETIC group, not a boolean one. Composing with a leading
 * `X != 1 && (` … `)` therefore fails to parse (a live-only rejection — the
 * offline emulator can't catch this, since it never runs the real parser).
 * The fixed, non-nestable precedence (`&&` splits OUTERMOST first via
 * `parse_and`, each conjunct's own `||` splits via `parse_or`, called
 * directly — no further nesting or grouping possible) is used INSTEAD of
 * parens: `roll != 1 && (roll == 20 || total >= ac)` is logically
 * IDENTICAL, for every roll/modifier/AC, to the intended `roll == 20 ||
 * (roll != 1 && total >= ac)` — because `roll == 20` implies `roll != 1`, so
 * the two formulas agree in all three cases (nat-20, nat-1, ordinary) —
 * verified exhaustively (every roll 1..20 x a modifier range x an AC range).
 * The int-level parens around `(<total>)`/`(<acExpr>)` remain (arithmetic
 * grouping is fully supported, unaffected by this finding).
 */
// EQUIPMENT PROFICIENCIES — WEAPONS HALF (playing-the-game.md § Proficiency >
// Equipment Proficiencies, ledger row "Equipment Proficiencies"): "Anyone can
// wield a weapon, but proficiency makes you better at wielding it. If you
// have proficiency with a weapon, you add your Proficiency Bonus to attack
// rolls you make with it." This is STRUCTURALLY the same conditional-bonus
// shape as Skill Proficiencies (`skill-proficiency-units.ts`) applied to
// `attackRollExpr` instead of `d20TestExpr` — `proficiencyCapabilityId` above
// is that same pattern, reused rather than retyped. No new fixture content is
// forced here: this chapter authors no weapon IDENTITY rows (weapons are an
// Equipment-chapter concern, same "srd/ac deferred" posture this module's own
// header already takes for Armor Class), so there is no weapon-proficiency
// capability id to compose against yet — the PATTERN ships, ready for
// whichever chapter authors weapon identity to compose it, exactly like
// `srd/ac` deferred but `baseArmorClassExpr` shipped ready to consume it.
//
// TOOLS HALF — NOW SHIPPED IN THE CONCRETE EQUIPMENT SLICE: the Thieves'
// Tools lock-picking check lives in
// `chapters/playing-the-game/fragments/equipment-proficiencies.ts` and uses
// the TS `toolCheckExpr` builder. It gates ONE existing
// `srd/proficiency_bonus` macro call on Tool OR Sleight of Hand capability, so
// Tool+Skill never double-adds PB. The Advantage rule is not blocked by the
// old bare-d20 finding #23 anymore; the remaining gap is narrower and is
// recorded as finding #59: today's condition/ResolutionCheck bias path cannot
// see the actor's capabilities together with the tool/skill/action identity,
// so it cannot scope Advantage to exactly the relevant check. No fake global
// Advantage condition is authored.
export function attackRollExpr(options: AttackRollOptions): string {
	const terms = [abilityModifierExpr(options.scoreExpr)];
	if (options.proficiencyLevelExpr !== undefined) {
		const bonus = proficiencyBonusMacroCall(options.proficiencyLevelExpr);
		terms.push(
			options.proficiencyCapabilityId === undefined
				? bonus
				: `cond(actor.has_capability('${options.proficiencyCapabilityId}'), ${bonus}, 0)`,
		);
	}
	if (options.circumstantialExpr !== undefined) {
		terms.push(`(${options.circumstantialExpr})`);
	}
	const totalModifier = terms.join(" + ");
	// pattern: derived-value-mechanism — Improved Critical lowers floor via capability.
	return (
		`let attack_roll = d20; ` +
		attackRollHitsMacroCall(
			"attack_roll",
			`attack_roll + ${totalModifier}`,
			`(${options.acExpr})`,
			improvedCriticalThresholdExpr(),
		)
	);
}
