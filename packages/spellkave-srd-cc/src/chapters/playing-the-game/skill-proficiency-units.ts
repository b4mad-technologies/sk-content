// Skill Proficiencies mechanic (playing-the-game.md § Proficiency > Skill
// Proficiencies): "If a creature is proficient in a skill, the creature
// applies its Proficiency Bonus to ability checks involving that skill.
// Without proficiency in a skill, a creature can still make ability checks
// involving that skill but doesn't add its Proficiency Bonus." Ledger row:
// `ledger/playing-the-game.md` "Skill Proficiencies mechanic".
//
// DESIGN DECISION (grounded in the sister, then DIVERGED — AGENTS.md
// "question, never copy"): the sister (`world-fixtures/phandelver/base/
// hero-sheet.toml`, `world-fixtures/srd/base/check-resolution.toml`) gates
// its own proficiency bonus behind an ENTITY TAG,
// `cond(actor.has_tag('actor.skill_proficiency.<slug>'), 2, 0)` — a hardcoded
// literal `2`, not the level-derived Proficiency Bonus table, and a tag with
// no connection to the skill's own IDENTITY row. THIS package took a
// different, already-authored route for skill identity: each skill is a
// `capability_definitions` row (`srd/skill/<slug>`, `skill-units.ts`) — so
// "is this actor proficient in skill X" has a genuinely more natural
// substrate expression than a parallel tag convention: HOLDING that
// capability. `crates/spellkave-dsl`'s `actor.has_capability(id)` (a boolean
// method, same grammar family as `has_tag`/`has_niche`/`has_item` —
// `parse_method_bool`, `lib.rs`) reads exactly this. Consequence: this
// chapter's skill capabilities, "identity authored, mechanic deferred" since
// slice 1a (finding #11), get their FIRST real mechanical
// consumer here — holding `srd/skill/perception` now MEANS "proficient in
// Perception", not just "known to exist".
//
// A SECOND divergence from the sister, deliberate: the sister's `cond(...)`
// arm is a bare literal `2`, not a level-derived Proficiency Bonus (the
// sister's own `advancement.toml` header admits this explicitly: "Downstream
// attack/check predicates still carrying literal +2 are separate migration
// work"). This unit composes the REAL `srd/proficiency_bonus` macro instead —
// `d20-units.ts`'s `proficiencyCapabilityId` param on `D20TestOptions`, this
// unit's own consumer — so a proficient actor's bonus scales with `srd/level`
// like every other D20 check in this chapter, not a hardcoded L1-4 constant.
//
// NO NEW EXPRESSION IDIOM: per this chapter's own "ONE idiom source"
// philosophy (modifier-units.ts's module header, finding #18),
// the mechanic IS `d20TestExpr` with `proficiencyCapabilityId` set — this
// module exists to give that composition a discoverable, skill-shaped name
// and its own offline exhaustive proof, not to retype the predicate.
//
// WHAT THIS UNIT DELIBERATELY DOES NOT GATE: the check-ATTEMPT itself. Per
// the section's own text, an UNPROFICIENT creature "can still make ability
// checks involving that skill" — only the BONUS is conditional, not
// eligibility to roll at all. A skill-check affordance's `required_capability`
// must therefore stay a generic "can attempt this kind of check" capability
// (this chapter's own D20-trio proof-scene precedent), never the skill's own
// identity capability — gating affordance VISIBILITY on skill proficiency
// would incorrectly forbid untrained attempts, contradicting the SRD text.
import { type D20TestOptions, d20TestExpr } from "./d20-units";

/** The composable inputs of one authored, proficiency-aware skill check. */
export interface SkillCheckOptions {
	/** Int-valued DSL subexpression for the governing ability SCORE. */
	scoreExpr: string;
	/** Optional complete Int term for the governing ability modifier. */
	abilityModifierTerm?: string;
	/**
	 * The skill's own identity capability id (`srd/skill/<slug>`,
	 * `skill-units.ts`) — holding it is what "proficient in this skill" means
	 * on this substrate (module header). Gates the Proficiency Bonus term;
	 * does NOT gate the check itself (module header).
	 */
	skillCapabilityId: string;
	/** Int-valued DSL subexpression for the creature's level/CR (`srd/level`). */
	proficiencyLevelExpr: string;
	/** Optional complete Int term for the proficiency bonus. */
	proficiencyBonusTerm?: string;
	/** Optional circumstantial bonus/penalty term, parenthesized on use. */
	circumstantialExpr?: string;
	/**
	 * The literal target DC (module header: a per-affordance constant, sister
	 * precedent). Mutually exclusive with `dcExpr` — supply exactly one.
	 */
	dc?: number;
	/**
	 * A TARGET-DERIVED target number — see `d20-units.ts`'s `D20TestOptions.
	 * dcExpr` doc comment (`generic-check-units.ts`'s DC-source ladder is the
	 * first consumer of this field on the skill-check idiom). Mutually
	 * exclusive with `dc` — supply exactly one.
	 */
	dcExpr?: string;
}

/**
 * Build the proficiency-aware skill-check predicate:
 * `d20 + <ability modifier> + cond(actor.has_capability(<skillCapabilityId>), <proficiency bonus>, 0) [+ (circumstantial)] >= <dc>`
 * — a thin, discoverably-named composition of `d20TestExpr`, never a second
 * predicate idiom (module header).
 */
export function skillCheckExpr(options: SkillCheckOptions): string {
	const d20Options: D20TestOptions = {
		scoreExpr: options.scoreExpr,
		abilityModifierTerm: options.abilityModifierTerm,
		proficiencyLevelExpr: options.proficiencyLevelExpr,
		proficiencyBonusTerm: options.proficiencyBonusTerm,
		proficiencyCapabilityId: options.skillCapabilityId,
		dc: options.dc,
		dcExpr: options.dcExpr,
	};
	if (options.circumstantialExpr !== undefined) {
		d20Options.circumstantialExpr = options.circumstantialExpr;
	}
	return d20TestExpr(d20Options);
}
