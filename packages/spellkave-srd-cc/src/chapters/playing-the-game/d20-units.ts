// D20 Tests core procedure (playing-the-game.md § D20 Tests): the central
// mechanic of the whole SRD — `d20 [+ modifiers] >= target number` — as the
// chapter's ONE composable predicate idiom. Ledger row: "D20 Tests core
// procedure" (`ledger/playing-the-game.md`).
//
// SOURCE: the cached chapter markdown, NOT open5e. Ledger observation 5: the
// open5e RuleSet `srd-2024_d20-tests` desc reproduces only steps "Roll 1d20"
// and "Add Modifiers" — the markdown's third step ("Compare the Total to a
// Target Number", which introduces the whole DC/AC vocabulary) exists ONLY in
// the markdown for this chapter, so the markdown is the authoritative source
// for the procedure and `parseD20TestSteps` parses all three steps from it
// (throwing loudly on shape surprises, same posture as modifier-units.ts).
//
// This module is the ONE source of the check-shaped predicate string, exactly
// as modifier-units.ts is for the two lookup idioms it composes: the sister
// retypes `d20 + <inlined modifier idiom> >= <DC>` at every use site
// (persuasion.toml, deception.toml, attack-spell.toml, ... — finding
// finding #18's pattern), while every future consumer unit here (Ability
// Checks, Saving Throws, Attack Rolls) builds its predicate through
// `d20TestExpr`. The DC stays a per-affordance literal — sister precedent
// (deception.toml's own header): no DC-parameter indirection exists on this
// substrate; a different DC is a different affordance_templates row.
//
// ENGINE GROUNDING (why plain `d20` needs no fixture rows and no roll_table):
// dice are DSL GRAMMAR, not content — the shared dice grammar parses bare
// `dN` and `XdN` to `Dice { count, sides }` (crates/spellkave-dsl/src/lib.rs,
// `try_parse_dice`), a kernel primitive with zero bundle dependencies.
// `roll_table(...)` exists for RUNTIME-resolved dice text (e.g. a damage
// profile read off an item) and is deliberately NOT used here.
//
// BOUNDARY DCs (the live-proof trick): a d20 face is bounded 1..20, so for a
// known total modifier M the check `d20 + M >= DC` is DETERMINISTIC at the
// boundaries — always true when DC <= 1 + M, never true when DC >= 21 + M.
// The proof scene uses both to prove the roll+compare chain live WITHOUT a
// seeded-RNG build; exact mid-DC arithmetic is proven by reading the recorded
// face back from `visible_evaluation_provenance` (the engine records every
// resolved die face as a stochastic draw — crates/spellkave-dsl/src/eval.rs,
// `StochasticDraw`).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";
import { abilityModifierExpr, proficiencyBonusMacroCall } from "./modifier-units";

/** A d20 face is bounded — the whole boundary-DC proof rests on these two. */
export const D20_MIN_FACE = 1;
export const D20_MAX_FACE = 20;

/** One parsed procedure step of the markdown's § D20 Tests numbered list. */
export interface D20TestStep {
	/** The markdown's own step number (4..6 — 1..3 belong to Rhythm of Play). */
	ordinal: number;
	title: string;
}

/**
 * Parse the three numbered procedure steps out of the cached chapter
 * markdown's § D20 Tests section (the `**N: Title.**` run-in headers between
 * the `## D20 Tests` heading and its first `###` subsection). Throws loudly
 * on any shape surprise — a silent partial parse would let a wrong upstream
 * section masquerade as proof.
 */
export function parseD20TestSteps(markdown: string): D20TestStep[] {
	const sectionStart = markdown.indexOf("## D20 Tests");
	if (sectionStart === -1) {
		throw new Error("d20-units: '## D20 Tests' heading not found in cached playing-the-game.md.");
	}
	const sectionEnd = markdown.indexOf("###", sectionStart);
	if (sectionEnd === -1) {
		throw new Error("d20-units: § D20 Tests has no following subsection heading.");
	}
	const section = markdown.slice(sectionStart, sectionEnd);
	const steps = [...section.matchAll(/\*\*(\d+): ([^*]+?)\.\*\*/g)].map((match) => ({
		ordinal: Number.parseInt(match[1] ?? "", 10),
		title: (match[2] ?? "").trim(),
	}));
	if (steps.length === 0) {
		throw new Error("d20-units: no '**N: Title.**' procedure steps parsed out of § D20 Tests.");
	}
	return steps;
}

/** The parsed § D20 Tests procedure steps, read from the committed cache. */
export function d20TestSteps(): D20TestStep[] {
	return parseD20TestSteps(
		readFileSync(path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md"), "utf8"),
	);
}

/** The composable inputs of one authored D20 Test predicate. */
export interface D20TestOptions {
	/**
	 * Int-valued DSL subexpression for the relevant ability SCORE (step "Add
	 * Modifiers", first bullet), e.g. `actor.effective('srd/str')` — the modifier
	 * idiom is applied here, never pre-computed by the caller.
	 */
	scoreExpr: string;
	/**
	 * Optional complete Int term for the relevant ability modifier. The generic
	 * check corpus may supply an actor convenience macro such as
	 * `macro('srd/strength_modifier')`; target-derived or dynamic expressions
	 * continue to use `srd/ability_modifier(score)`. Omitted terms use the
	 * generic named manifest macro over `scoreExpr`.
	 */
	abilityModifierTerm?: string;
	/**
	 * Int-valued DSL subexpression for the creature's level/CR — present iff
	 * the test "uses something ... in which the creature has proficiency"
	 * (step "Add Modifiers", second bullet). The proficiency-bonus idiom is
	 * applied here.
	 */
	proficiencyLevelExpr?: string;
	/** Optional complete Int term for the proficiency bonus. */
	proficiencyBonusTerm?: string;
	/**
	 * Optional capability id (`spellkave_define_capability`) that GATES the
	 * proficiency-bonus term instead of adding it unconditionally — the
	 * "Skill Proficiencies mechanic" / "Saving Throw Proficiencies" shape
	 * (playing-the-game.md § Proficiency): "Without proficiency in a skill, a
	 * creature can still make ability checks involving that skill but doesn't
	 * add its Proficiency Bonus." Only meaningful alongside
	 * `proficiencyLevelExpr` — ignored if that is absent, since there is no
	 * bonus term to gate. When given, the emitted term is
	 * `cond(actor.has_capability('<id>'), <PB idiom>, 0)` instead of the bare
	 * PB idiom; when absent, every existing caller (the D20 core-procedure
	 * proof's own checks, `attackRollExpr`) keeps the prior unconditional
	 * behavior byte-for-byte — this field is purely additive.
	 */
	proficiencyCapabilityId?: string;
	/**
	 * Optional circumstantial bonus/penalty term (step "Add Modifiers", third
	 * bullet) — any int-valued DSL subexpression; parenthesized on use.
	 */
	circumstantialExpr?: string;
	/**
	 * The literal target number (step "Compare the Total to a Target Number"
	 * — a DC for checks/saves, an AC for attacks). MAXIM BOUNDARY (AGENTS.md
	 * "Design maxims", operator decision 2026-07-28): this literal form is
	 * ONLY for task-shaped, scene-owned constants with zero per-entity
	 * variance (book-wide values like `MOUNTED_FALLING_OFF_DC`, the Typical
	 * DC table's own data, proof-scene gates). Anything entity-shaped — a
	 * guard's stubbornness, a creature's AC, any value a DM would ever want
	 * to steer at runtime — belongs in `dcExpr` as a world-state read, never
	 * here. Mutually exclusive with `dcExpr` — supply exactly one.
	 */
	dc?: number;
	/**
	 * A TARGET-DERIVED target number, as an int-valued DSL subexpression (e.g.
	 * `cond(target.stat('srd/dc/persuasion') > 0, target.stat('srd/dc/persuasion'), 15)`
	 * — `generic-check-units.ts`'s DC-source ladder, the first consumer).
	 * Parenthesized on use, same treatment `attackRollExpr`'s `acExpr` gets
	 * (`attack-roll-units.ts`) — that field is the precedent this one follows:
	 * the DC/AC side of a D20 Test taking a caller-supplied subexpression
	 * instead of a bare literal, once a chapter unit has a real source for it.
	 * Mutually exclusive with `dc` — supply exactly one.
	 */
	dcExpr?: string;
}

/**
 * Resolve the trailing `>= <target number>` operand from EXACTLY ONE of
 * `dc`/`dcExpr` — shared by `d20TestExpr` and `biasableD20TestExpr` so the
 * two mutually-exclusive-field contract lives in one place. `dcExpr` is
 * parenthesized (arithmetic grouping, same convention every other composite
 * subexpression term in this file gets).
 */
function resolveDcOperand(options: Pick<D20TestOptions, "dc" | "dcExpr">): string {
	if (options.dc !== undefined && options.dcExpr !== undefined) {
		throw new Error("d20-units: supply at most one of `dc`/`dcExpr`, not both.");
	}
	if (options.dcExpr !== undefined) {
		return `(${options.dcExpr})`;
	}
	if (options.dc !== undefined) {
		return `${options.dc}`;
	}
	throw new Error("d20-units: supply exactly one of `dc`/`dcExpr`.");
}

// THE BONUS DOESN'T STACK (playing-the-game.md § Proficiency > The Bonus
// Doesn't Stack, ledger row "The Bonus Doesn't Stack"): "Your Proficiency
// Bonus can't be added to a die roll or another number more than once...
// Whenever the bonus is used, it can be multiplied only once and divided
// only once."
//
// VERDICT, DECIDED HONESTLY: this substrate has NO PLACE where the
// proficiency-bonus term could accidentally stack. `proficiencyTerm` below is
// the ONLY generator-side site that ever composes the `srd/proficiency_bonus`
// (`modifier-units.ts`'s own module-header contract: idiom builders compose,
// callers never retype) — every consumer (`d20TestExpr`, `biasableD20TestExpr`,
// `attackRollExpr`) accepts AT MOST ONE `proficiencyLevelExpr`/
// `proficiencyCapabilityId` pair per predicate and adds AT MOST ONE resulting
// term to its `terms` array; there is no code path that could compose two
// bonus terms into one expression even for a check that is simultaneously
// eligible under two skills (module header's own Deception-or-Persuasion
// example) — a caller authoring such a check still supplies exactly ONE
// `skillCapabilityId`/DC pair per affordance (the sister's own
// one-affordance-per-DC precedent, `d20-units.ts`'s original module header).
// This is therefore a PROVENANCE RULE the generator layer already satisfies
// structurally, not a gap needing new fixture content — proven by a NEGATIVE
// CONTROL in `src/test/offline/d20-units.test.ts`: every emitted expression
// contains at most one `cond(actor.has_capability` occurrence, asserted
// across the full exhaustive cross-product this file's own tests already
// walk. The multiply/divide-once clause (Expertise-shaped, doubling a bonus)
// has no consumer in this chapter — no unit here multiplies or divides a
// composed PB term — so it stays a documented-but-unexercised rule, same
// posture as every other out-of-chapter-scope clause on this ledger.
/**
 * The proficiency-bonus term shared by every D20-shaped idiom in this
 * chapter: the central `srd/proficiency_bonus` macro when `proficiencyCapabilityId` is
 * absent (the caller already knows proficiency applies — every check in this
 * chapter's own live proof scene before the Skill Proficiencies unit), or a
 * `cond(actor.has_capability(...), <PB>, 0)` gate when present (the
 * "Skill/Saving Throw Proficiencies" shape: untrained still rolls, no
 * bonus). `undefined` when `proficiencyLevelExpr` itself is absent — no term
 * to add at all.
 */
function proficiencyTerm(
	proficiencyLevelExpr: string | undefined,
	proficiencyCapabilityId: string | undefined,
	proficiencyBonusTerm: string | undefined,
): string | undefined {
	if (proficiencyLevelExpr === undefined) {
		return undefined;
	}
	const bonus = proficiencyBonusTerm ?? proficiencyBonusMacroCall(proficiencyLevelExpr);
	if (proficiencyCapabilityId === undefined) {
		return bonus;
	}
	// Expertise (martial L1-4 / Rogue L1): holding `srd/expertise/<slug>` doubles
	// PB when the skill capability id is `srd/skill/<slug>`. Jack of All Trades
	// (Bard L2 / BL-62 / L12c): half PB (integer `/ 2`) when the actor lacks the
	// skill capability but holds `srd/class-feature/bard/jack-of-all-trades`.
	// ONE `srd/proficiency_bonus` macro call (Bonus Doesn't Stack). JoAT is
	// `1 * PB / 2` via multiply-then-divide — no mid-expression `let` (d20TestExpr
	// joins terms with ` + `, so `let` cannot open inside a term).
	const skillPrefix = "srd/skill/";
	if (proficiencyCapabilityId.startsWith(skillPrefix)) {
		const expertiseId = `srd/expertise/${proficiencyCapabilityId.slice(skillPrefix.length)}`;
		const joatId = "srd/class-feature/bard/jack-of-all-trades";
		return (
			`cond(actor.has_capability('${expertiseId}'), 2, ` +
			`cond(actor.has_capability('${proficiencyCapabilityId}'), 1, ` +
			`cond(actor.has_capability('${joatId}'), 1, 0))) * (${bonus}) / ` +
			`cond(actor.has_capability('${expertiseId}'), 1, ` +
			`cond(actor.has_capability('${proficiencyCapabilityId}'), 1, ` +
			`cond(actor.has_capability('${joatId}'), 2, 1)))`
		);
	}
	return `cond(actor.has_capability('${proficiencyCapabilityId}'), ${bonus}, 0)`;
}

/**
 * Build the full D20 Test predicate:
 * `d20 + <ability modifier> [+ <proficiency bonus, optionally capability-gated>] [+ (circumstantial)] >= <dc>`
 * — every term composed from the chapter's existing idiom builders, never
 * retyped (modifier-units.ts's module-header contract).
 */
export function d20TestExpr(options: D20TestOptions): string {
	const terms = ["d20", options.abilityModifierTerm ?? abilityModifierExpr(options.scoreExpr)];
	const proficiency = proficiencyTerm(
		options.proficiencyLevelExpr,
		options.proficiencyCapabilityId,
		options.proficiencyBonusTerm,
	);
	if (proficiency !== undefined) {
		terms.push(proficiency);
	}
	if (options.circumstantialExpr !== undefined) {
		terms.push(`(${options.circumstantialExpr})`);
	}
	return `${terms.join(" + ")} >= ${resolveDcOperand(options)}`;
}

/**
 * The highest DC a creature with total modifier `totalModifier` succeeds at
 * on EVERY face (even a natural 1): `1 + M`. Predicates built at this DC are
 * live-deterministic positives — no seed, no statistics.
 */
export function guaranteedSuccessDc(totalModifier: number): number {
	return D20_MIN_FACE + totalModifier;
}

/**
 * The lowest DC a creature with total modifier `totalModifier` fails at on
 * EVERY face (even a natural 20): `21 + M`. Live-deterministic negatives.
 * NOTE: the SRD's natural-20/natural-1 auto-hit/auto-miss rule is specific to
 * ATTACK rolls (ledger row "Attack Rolls") and is deliberately NOT part of
 * this core-procedure idiom.
 */
export function guaranteedFailureDc(totalModifier: number): number {
	return D20_MAX_FACE + totalModifier + 1;
}

// ─────────────────────────────────────────────────────────────────────────
// Advantage/Disadvantage (ledger row, `ledger/playing-the-game.md`) — ENGINE
// GROUNDING FIRST, because it changes which roll SHAPE is even authorable.
//
// The engine's Advantage/Disadvantage mechanism is condition/consequence-
// driven, not predicate-syntax: an authored `modifier_templates` row
// (`applies_to = "ResolutionCheck"`, `delta_kind = "Advantage"|"Disadvantage"`)
// composes into a `ComposedRollBias` (`crates/spellkave-dsl/src/eval.rs`)
// threaded into the evaluator's `Facts.roll_modifier_bias` — the sister's own
// `world-fixtures/srd/base/conditions.toml` (Poisoned/Restrained/Blinded)
// already authors exactly this shape.
//
// RESOLVED, 2026-07-28 (finding #23, Bucket-7 night/b7-roll-bias
// — read `eval.rs` directly, not assumed): `ComposedRollBias` used to be
// consulted ONLY by `Op::RollUnder` and `Op::RollTable` — bare `d20`/`XdN`
// (`Op::Roll`) never read it, so `d20TestExpr` above (and every sister
// check/attack fixture built the same way — persuasion.toml, deception.toml,
// attack-ranged.toml, attack-spell.toml, all bare `d20 + ... >= DC`) was
// STRUCTURALLY IMMUNE to condition-granted Advantage/Disadvantage: the
// sister's own condition rows were latent/inert against every check fixture
// that existed. Fixed at the root: `Op::Roll` now consults
// `self.facts.roll_modifier_bias` for a single-die (`dice.count == 1`) roll
// (`eval.rs` ~677-716), the exact shape every bare `d20` term here parses to
// — `d20TestExpr`'s own bare `d20` is now bias-aware with NO change to this
// file. Full grounding + decision trail:
// `ledger/designs/finding-23-bare-roll-bias.md`.
//
// AUTHORING INVARIANT `d20TestExpr` relies on (finding #33,
// same night): `Op::Roll`'s bias consultation is scoped per NODE, not per
// CHECK — every unsuppressed single-die roll node in an expression
// independently consults the SAME active bias. `d20TestExpr` (and every
// idiom built on it in this chapter) composes EXACTLY ONE bare `d20` term
// per predicate — never author a second independent single-die roll inside
// the same check predicate (e.g. two separate `d20` terms combined via
// `max`/`min`), or the SAME bias would silently double-apply to both
// (extra draws stay inside the existing draw budget, so nothing errors —
// the result is just semantically wrong). `attackRollExpr`'s own
// `let`-bound single roll (attack-roll-units.ts) satisfies this the same
// way: one `d20` binding, read twice by reference, not re-rolled.
//
// `roll_table(...)` (a `RollTable` node) was the ONE roll shape that
// responded to the bias before this fix — the `srd/d20` roll table already
// exists (`world-fixtures/srd/base/roll-tables.toml`, `srd/d20`, uniform
// 1..20). `biasableD20TestExpr` below is that bias-COMPATIBLE sibling of
// `d20TestExpr`: same composed predicate, `roll_table('srd/d20')` in place
// of the bare `d20` grammar token. Proven offline to be numerically
// IDENTICAL to `d20TestExpr` under the no-bias case. Now that `d20TestExpr`
// itself is bias-aware, `biasableD20TestExpr` is no longer the ONLY
// bias-compatible shape — kept as-is (still numerically valid, no
// consumer depends on retiring it) rather than removed as part of this
// substrate fix; retiring it in favor of `d20TestExpr` everywhere is
// authoring-surface cleanup, not this bucket's scope.
export function biasableD20TestExpr(options: D20TestOptions): string {
	const terms = ["roll_table('srd/d20')", abilityModifierExpr(options.scoreExpr)];
	const proficiency = proficiencyTerm(
		options.proficiencyLevelExpr,
		options.proficiencyCapabilityId,
		options.proficiencyBonusTerm,
	);
	if (proficiency !== undefined) {
		terms.push(proficiency);
	}
	if (options.circumstantialExpr !== undefined) {
		terms.push(`(${options.circumstantialExpr})`);
	}
	return `${terms.join(" + ")} >= ${resolveDcOperand(options)}`;
}
