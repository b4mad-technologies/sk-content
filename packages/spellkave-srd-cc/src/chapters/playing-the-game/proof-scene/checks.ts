import { passivePerceptionExpr } from "../../character-creation/derived-units";
import { AC_RESOURCE_ID } from "../armor-class-units";
import { attackRollExpr } from "../attack-roll-units";
import { assertCreatureTypeSlug, creatureTypeTag } from "../creature-type-units";
import { d20TestExpr, guaranteedFailureDc, guaranteedSuccessDc } from "../d20-units";
import { POISONED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID } from "../fragments/conditions";
import { BUNDLE_ID } from "../index";
import { abilityModifierExpr, expectedAbilityModifier } from "../modifier-units";
import { ABILITY_CHECK_RESOLUTION_SCOPE_ID } from "../resolution-scope-units";
import { type SkillCheckOptions, skillCheckExpr } from "../skill-proficiency-units";
import {
	PROOF_ADVANTAGE_CHECK_DC,
	PROOF_ADVANTAGE_CONDITION_ID,
	PROOF_ATTACK_ROLL_AC,
	PROOF_ATTACK_ROLL_COVER_EFFECTIVE_AC,
	PROOF_COVER_HALF_CONDITION_ID,
	PROOF_HERO_HP_STATE_ID,
	PROOF_POISONED_CHECK_DC,
	PROOF_POISONED_CONDITION_ID,
	PROOF_PRESSURE_PLATE_DC,
	PROOF_PRESSURE_PLATE_ENTITY_KEY,
	PROOF_SAVE_DAMAGE,
	PROOF_SAVE_DC_STATE_ID,
	PROOF_SAVE_HALF_DAMAGE,
} from "./combat";
import {
	PROOF_D20_EASY_DC,
	PROOF_D20_TOTAL_MODIFIER,
	PROOF_DEX_SAVE_PROFICIENCY_CAPABILITY_ID,
	PROOF_DEX_STATE_ID,
	PROOF_DEX_VALUE,
	PROOF_DUMMY_CREATURE_TYPE,
	PROOF_FIGHTER_STANDARD_ARRAY,
	PROOF_FLEX_GATE_MODIFIER,
	PROOF_LEVEL_STATE_ID,
	PROOF_PROFICIENCY_BONUS,
	PROOF_SKILL_ID,
	PROOF_STR_CHECK_CAP,
	PROOF_STR_FLEX_VERB,
	PROOF_STR_STATE_ID,
	PROOF_WIS_CHECK_CAP,
	PROOF_WIS_FLEX_VERB,
	PROOF_WIS_STATE_ID,
} from "./identity";
import { PROOF_BUNDLE_ID, PROOF_PRESSURE_PLATE_NODE_ID } from "./shared";

// ── SECOND ACTOR (slice 2 operator decision) — `guard`, a REAL actor entity
// (its own entity_definitions + spawn, same shape as `hero`/the initiative
// combatants — NOT the inert `training-dummy` prop) used as the TARGET of
// two of the six reworked generic-check verbs below, so `target.stat(...)`
// is proven against a second actor's own facts (design draft's own
// "persuade-the-guard" Grounding example), not only a dummy.
export const PROOF_GUARD_DEF_LOCAL_ID = "guard";
export const PROOF_GUARD_DEF_ID = `${PROOF_BUNDLE_ID}/${PROOF_GUARD_DEF_LOCAL_ID}`;
export const PROOF_GUARD_SPAWN_KEY_PREFIX = "guard";
export const PROOF_GUARD_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${PROOF_GUARD_SPAWN_KEY_PREFIX}_1`;

// Slice 3.1 (the proof-scene design record, "SLICE 3.1 CORRECTION"): the
// guard's own honest SRD creature type — "Most player characters are of the
// Humanoid type" (`cache/markdown/rules-glossary.md:517`), and a guard is
// exactly that kind of NPC, not a construct/beast/etc.
export const PROOF_GUARD_CREATURE_TYPE = "humanoid";

// Module-load guard (mirrors `assertInfluenceChecksSource`'s own posture,
// generic-check-units.ts): both proof creature-type tags must be real SRD
// vocabulary, checked once, loudly, rather than trusted as plain strings.
assertCreatureTypeSlug(PROOF_DUMMY_CREATURE_TYPE);
assertCreatureTypeSlug(PROOF_GUARD_CREATURE_TYPE);

export const PROOF_DUMMY_CREATURE_TYPE_TAG = creatureTypeTag(PROOF_DUMMY_CREATURE_TYPE);
export const PROOF_GUARD_CREATURE_TYPE_TAG = creatureTypeTag(PROOF_GUARD_CREATURE_TYPE);

// ── Generic-check verb rework (the proof-scene design record, "GENERIC-CHECK VERB
// REWORK") — six checks against the SHIPPED base-bundle verbs
// (`fragments/generic.ts`'s `buildGenericCheckAffordancesFragment`), no proof-authored
// capability/action/consequence/outcome/affordance rows of their own. No
// isolation concern for the shared dummy's own new seeds below (unlike the
// Advantage extension's PERMANENT condition): none of these six predicates
// reads any state an existing KEPT check also reads.
// C3 re-derive (`ledger/character-creation.md`'s "C3 direction" addendum):
// the hero's CHA is the Fighter Standard Array column's own value (12,
// `identity.ts`'s `PROOF_FIGHTER_STANDARD_ARRAY`) — was 10 (modifier 0)
// before this slice; now modifier +1 (see `PROOF_CHA_MODIFIER`, below,
// which recomputes `PROOF_GENERIC_PERSUASION_DERIVED_DC`).
export const PROOF_CHA_VALUE = PROOF_FIGHTER_STANDARD_ARRAY.cha;
export const PROOF_CHA_STATE_ID = `${BUNDLE_ID}/cha`;
export const PROOF_CHA_MODIFIER = expectedAbilityModifier(PROOF_CHA_VALUE);

export const PROOF_FALSE_MODIFIER_CONDITION_ID = `${PROOF_BUNDLE_ID}/false-modifier-condition`;
export const PROOF_FALSE_MODIFIER_SCOPE_ID = `${PROOF_BUNDLE_ID}/false-modifier-scope`;
export const PROOF_FALSE_MODIFIER_GRANT_ACTION_ID = `${PROOF_BUNDLE_ID}/false-modifier-grant`;
export const PROOF_FALSE_MODIFIER_CHECK_ACTION_ID = `${PROOF_BUNDLE_ID}/false-modifier-check`;
export const PROOF_FALSE_MODIFIER_CHECK_DC = 15;
export const PROOF_ZERO_REACH_CONDITION_ID = `${PROOF_BUNDLE_ID}/zero-reach-condition`;
export const PROOF_ZERO_REACH_GRANT_ACTION_ID = `${PROOF_BUNDLE_ID}/zero-reach-grant`;
export const PROOF_ZERO_REACH_CURE_ACTION_ID = `${PROOF_BUNDLE_ID}/zero-reach-cure`;

/** `srd/skill/athletics` — a SECOND skill grant on the hero (alongside `srd/skill/perception`), STR-governed, so the Athletics-verb pair below reads the SAME total modifier (+5) the torn-down d20 trio used. */
export const PROOF_ATHLETICS_SKILL_CAPABILITY_ID = `${BUNDLE_ID}/skill/athletics`;
export const PROOF_GENERIC_ATHLETICS_ACTION_ID = `${BUNDLE_ID}/check/athletics`;
export const PROOF_GENERIC_WIS_ACTION_ID = `${BUNDLE_ID}/check/wis`;
export const PROOF_GENERIC_PERCEPTION_ACTION_ID = `${BUNDLE_ID}/check/perception`;
export const PROOF_GENERIC_INSIGHT_ACTION_ID = `${BUNDLE_ID}/check/insight`;
export const PROOF_GENERIC_PERSUASION_ACTION_ID = `${BUNDLE_ID}/check/persuasion`;

// Athletics pair (STR +2, proficient -> PB +3, total +5 — SAME modifier the
// torn-down d20-easy/d20-impossible used): TWO DIFFERENT TARGETS for the
// SAME verb, since one `srd/dc/athletics` resource can only carry one value
// at a time — the shared dummy carries the guaranteed-SUCCESS seed, the
// SECOND ACTOR (`guard`) the guaranteed-FAILURE one.
export const PROOF_DC_ATHLETICS_STATE_ID = `${BUNDLE_ID}/dc/athletics`;
export const PROOF_GENERIC_EASY_DC = guaranteedSuccessDc(PROOF_D20_TOTAL_MODIFIER);
export const PROOF_GENERIC_IMPOSSIBLE_DC = guaranteedFailureDc(PROOF_D20_TOTAL_MODIFIER);

/** `check/wis` is a RAW ABILITY verb — no proficiency term ever (generic-check-units.ts's own module header) — so this reads WIS mod alone (C3 re-derive: 0, was -1), genuinely mid/stochastic at DC 15 (the torn-down d20-contested's own construction). */
export const PROOF_DC_WIS_STATE_ID = `${BUNDLE_ID}/dc/ability-wis`;
export const PROOF_GENERIC_CONTESTED_DC = 15;

/** Skill-proficiency PB-inclusive/exclusive boundary pair, seeded as target DC overrides instead of a baked affordance literal (torn-down skill-proficient/skill-unproficient-control's own numbers, unchanged — `PROOF_SKILL_PROFICIENT_DC`/`PROOF_SKILL_UNPROFICIENT_DC`, above). */
export const PROOF_DC_PERCEPTION_STATE_ID = `${BUNDLE_ID}/dc/perception`;
export const PROOF_DC_INSIGHT_STATE_ID = `${BUNDLE_ID}/dc/insight`;

/** Influence-shaped derived-DC pair (design § B.2), RETARGETED to the SECOND ACTOR (`guard`) — hero unproficient in Persuasion, CHA 12 -> modifier +1 (C3 re-derive: was CHA 10 -> modifier 0). */
export const PROOF_GENERIC_PERSUASION_DERIVED_DC = guaranteedFailureDc(PROOF_CHA_MODIFIER);
/** Chosen so max(15, this) === PROOF_GENERIC_PERSUASION_DERIVED_DC (22 > 15, so the derived DC equals INT exactly). */
export const PROOF_GENERIC_PERSUASION_TARGET_INT = PROOF_GENERIC_PERSUASION_DERIVED_DC;
export const PROOF_DC_PERSUASION_STATE_ID = `${BUNDLE_ID}/dc/persuasion`;

export interface CheckSpec {
	slug: string;
	capabilityId: string;
	displayName: string;
	/**
	 * Eligibility-only affordance predicate. Most legacy proof checks carry
	 * their D20 Test here; a Stochastic action instead puts the roll in
	 * `resolutionPredicateSource`.
	 */
	predicate: string;
	/** Capability-definition description (each check family words its own). */
	capabilityDescription: string;
	/**
	 * Authored boolean DSL evaluated at the action-resolution seam. When set,
	 * the action is Stochastic and `predicate` remains eligibility-only.
	 */
	resolutionPredicateSource?: string;
	/**
	 * The success consequence's `ModifyResource` target — defaults to the
	 * shared `flexed` counter. A check may override this when its proof needs a
	 * different observable carrier.
	 */
	frameWriteResource?: string;
	/** `ModifyResource.actor` — defaults to the manipulation target. */
	frameWriteActor?: "Actor" | "TargetActor";
	/**
	 * The success consequence's `ModifyResource` delta — defaults to the flat
	 * `"1"` shared by the check proofs.
	 */
	frameWriteDeltaSource?: string;
	/**
	 * The success consequence's ENTIRE `frame_write` payload, verbatim —
	 * defaults to the shared `ModifyResource`-on-`flexed`/`hp` shape every
	 * OTHER check builds from `frameWriteResource`/`frameWriteDeltaSource`.
	 * Set by the Advantage extension's `advantage-grant` check ONLY, whose
	 * consequence is an `ApplyStatus` (a structurally different frame_write
	 * kind, not expressible via the resource/delta pair above).
	 */
	successFrameWrite?: Record<string, unknown>;
	/**
	 * ADDITIONAL frame_write entries appended after `successFrameWrite` (or
	 * the default `ModifyResource`) in the success consequence's own array —
	 * for a check whose consequence is genuinely more than one write. Set by
	 * `poisoned-cure` ONLY: `RemoveCondition`'s own cascade-removal decision
	 * reads the PARENT's `remove_time_policy` predicate to decide whether an
	 * `implies`-introduced CHILD row is ALSO removed
	 * (`server/src/world_interaction/layer2/r_apply_consequence/
	 * remove_condition.rs`'s `planned_removed_condition_row_ids`) — Poisoned's
	 * own `srd/remove_policy/independent_lifetime` (self-sufficiency,
	 * `0 == 1`, "never auto-remove") makes that cascade decision ALWAYS
	 * false, so a single RemoveCondition on the parent leaves the internal
	 * ability-check-disadvantage sub-condition active forever — confirmed
	 * live (caught by this proof's OWN cure step failing to clear the bias,
	 * corrupting later checks sharing the 'srd/ability_check' resolution
	 * scope). Two EXPLICIT RemoveCondition writes (parent + child) sidestep
	 * the cascade decision entirely.
	 */
	additionalFrameWrites?: Record<string, unknown>[];
	/** The Stochastic action's separately-authored on_failure frame write. */
	failureFrameWrite?: Record<string, unknown>;
	/**
	 * `affordance_templates.accepts_global_storm` — defaults to `false` (every
	 * check before the attack-roll extension). The attack-roll check overrides
	 * this to `true`: MF-VAL-202 (`crates/spellkave-validate/src/locality.rs`)
	 * classifies ANY reference to a `let`-bound name as `SubjectRef::Binding`,
	 * which `classify_subject` maps to `LocalityClass::Global` UNCONDITIONALLY
	 * (the same conservative fallback a lambda/iteration variable gets) — even
	 * though `attackRollExpr`'s predicate reads only `actor.stat` and a single
	 * `d20` draw, genuinely `Local` in every OTHER sense. A validator
	 * over-conservatism, not a correctness bug — see the proof-scene design record
	 * and finding #24's addendum.
	 */
	acceptsGlobalStorm?: boolean;
	/** Spatial niche attachment for this action; defaults to the safe proof cell. */
	placeNodeId?: string;
	/** Optional entity key targeted when successful node entry dispatches this action. */
	onEntryTargetEntityKey?: string;
	/**
	 * `action_definitions.resolution_scope` — an open authored id selecting
	 * which ACTOR-carried condition modifiers this check's own roll consults
	 * (finding #56's addendum; `resolution-scope-units.ts`). Read regardless
	 * of `resolutionPredicateSource`/Stochastic mode — `r_manipulate`'s own
	 * `roll_bias::resolve` reads `action_definitions.resolution_scope`
	 * unconditionally, the same channel Dodge's actor-side Dexterity-save
	 * Advantage and the CONDITIONS PACKAGE's own Poisoned live proof both
	 * rely on. Distinct from `pressure-plate-save`'s own hardcoded
	 * `DEX_SAVE_RESOLUTION_SCOPE_ID` special case in `calls/checks.ts` (left
	 * untouched — this field is the generic path new checks should use).
	 */
	resolutionScope?: string;
}

/** The affordance predicate of a flex check: modifier(score) == +2, via the chapter's ONE idiom source. */
function flexPredicate(scoreExpr: string): string {
	return `(${abilityModifierExpr(scoreExpr)}) == ${PROOF_FLEX_GATE_MODIFIER}`;
}

function flexCheckSpec(
	slug: string,
	capabilityId: string,
	displayName: string,
	scoreStateId: string,
): CheckSpec {
	return {
		slug,
		capabilityId,
		displayName,
		predicate: flexPredicate(`actor.effective('${scoreStateId}')`),
		capabilityDescription:
			`TEST-ONLY check capability for the slice-1b modifier proof (${slug}): ` +
			"holder sees the flex verb iff the gating ability modifier evaluates to +2 " +
			"on the live engine (floor-correction idiom from modifier-units.ts).",
	};
}

const FLEX_CHECKS: readonly CheckSpec[] = [
	flexCheckSpec("flex-str", PROOF_STR_CHECK_CAP, PROOF_STR_FLEX_VERB, PROOF_STR_STATE_ID),
	flexCheckSpec("flex-wis", PROOF_WIS_CHECK_CAP, PROOF_WIS_FLEX_VERB, PROOF_WIS_STATE_ID),
];

// D20_CHECKS / SKILL_PROFICIENCY_CHECKS (d20-easy/d20-impossible/d20-contested,
// skill-proficient/skill-unproficient-control) — TORN DOWN, slice 2 (this
// file's own header note). Their coverage is re-expressed below through the
// shipped generic-check verbs (`GENERIC_CHECK_VERB_GRANTS`/the dummy+guard
// seeds), not this proof-authored `CheckSpec` pipeline.

// Attack-roll extension, F2 CLOSURE (the proof-scene design record): reuses the
// SAME flexed-counter consequence as every check above (frameWriteResource/
// frameWriteDeltaSource left at their defaults) — the thing under test is
// whether `attackRollExpr`'s `let`-bound predicate parses/evaluates live
// AGAINST A REAL TARGET FACT (`target.effective('srd/ac')`), no longer a
// baked literal.
function attackRollCheckSpec(): CheckSpec {
	return {
		slug: "attack-roll",
		capabilityId: `${PROOF_BUNDLE_ID}/check/attack-roll`,
		displayName: "Attack roll (let-bound nat-20/nat-1 override, target.effective('srd/ac'))",
		predicate: attackRollExpr({
			scoreExpr: `actor.effective('${PROOF_STR_STATE_ID}')`,
			proficiencyLevelExpr: `actor.stat('${PROOF_LEVEL_STATE_ID}')`,
			acExpr: `target.effective('${AC_RESOURCE_ID}')`,
		}),
		capabilityDescription:
			`TEST-ONLY check capability for the Attack Rolls live proof (target-seeded AC ` +
			`${PROOF_ATTACK_ROLL_AC}, read via target.effective('${AC_RESOURCE_ID}') — Equipment slice E1's ` +
			"F2 closure): proves the let-bound single-roll nat-20/nat-1 override parses through the " +
			"verb layer and the wasm validator, and evaluates consistently with the engine's own " +
			"admit/reject against a REAL target fact, not a baked literal.",
		// MF-VAL-202 (CheckSpec's own doc comment): a `let`-bound reference
		// classifies as Global under the static locality analyzer, even though
		// this predicate reads only actor.stat + one d20 draw.
		acceptsGlobalStorm: true,
	};
}

const ATTACK_ROLL_CHECKS: readonly CheckSpec[] = [attackRollCheckSpec()];

// Cover extension, F1 REWORK (the proof-scene design record): `cover-grant`
// mirrors `advantageGrantCheckSpec`'s own shape exactly — a guaranteed-
// success gate (SAME boundary-DC trick, SAME total modifier) whose success
// consequence is an `ApplyStatus` landing the SHIPPED base-bundle
// `srd/cover/half` condition (`PROOF_COVER_HALF_CONDITION_ID`, a legal
// cross-bundle REFERENCE, MF-VAL-291) on the manipulation's target.
function coverGrantCheckSpec(): CheckSpec {
	return {
		slug: "cover-grant",
		capabilityId: `${PROOF_BUNDLE_ID}/check/cover-grant`,
		displayName:
			"Grant Cover (maxim-audit F1 live proof — lands the shipped srd/cover/half condition)",
		predicate: d20TestExpr({
			scoreExpr: `actor.effective('${PROOF_STR_STATE_ID}')`,
			proficiencyLevelExpr: `actor.stat('${PROOF_LEVEL_STATE_ID}')`,
			dc: PROOF_D20_EASY_DC,
		}),
		capabilityDescription:
			"TEST-ONLY check capability for the maxim-audit F1 Cover live proof: guaranteed-success " +
			"gate (same boundary-DC trick as d20-easy/advantage-grant) whose success consequence lands " +
			`the SHIPPED base-bundle '${PROOF_COVER_HALF_CONDITION_ID}' condition on the manipulation's ` +
			"target via ApplyStatus — a cross-bundle reference, not a proof-authored condition.",
		successFrameWrite: {
			ApplyStatus: {
				target_kind: "entity",
				target_ref: "TargetActor",
				condition_definition_id: PROOF_COVER_HALF_CONDITION_ID,
			},
		},
	};
}

// `attack-roll-cover`, F1 REWORK (the proof-scene design record): BYTE-IDENTICAL
// predicate shape to `attackRollCheckSpec` — the plain `target.effective(
// 'srd/ac')` read, no compose-level algebra at this call site anymore. The
// live test targets this check at the DEDICATED cover-dummy (AFTER calling
// `cover-grant` against that SAME target first), so the effective-AC read
// actually resolves the condition's own modifier, not a generation-time
// string transform.
function attackRollCoverCheckSpec(): CheckSpec {
	return {
		slug: "attack-roll-cover",
		capabilityId: `${PROOF_BUNDLE_ID}/check/attack-roll-cover`,
		displayName: "Attack roll (target.effective('srd/ac'), vs a Half-Cover-conditioned target)",
		predicate: attackRollExpr({
			scoreExpr: `actor.effective('${PROOF_STR_STATE_ID}')`,
			proficiencyLevelExpr: `actor.stat('${PROOF_LEVEL_STATE_ID}')`,
			acExpr: `target.effective('${AC_RESOURCE_ID}')`,
		}),
		capabilityDescription:
			`TEST-ONLY check capability for the maxim-audit F1 Cover live proof (target-seeded base AC ` +
			`${PROOF_ATTACK_ROLL_AC}; the '${PROOF_COVER_HALF_CONDITION_ID}' condition, once landed by ` +
			`cover-grant, widens it to ${PROOF_ATTACK_ROLL_COVER_EFFECTIVE_AC}): SAME predicate shape as ` +
			"the plain attack-roll check — proves the shipped condition's own modifier composes into " +
			"target.effective('srd/ac'), not a generation-time coverModifiedAcExpr transform (retired).",
		// Same MF-VAL-202 over-conservatism as the plain attack-roll check
		// (CheckSpec's own doc comment) — this predicate is also `let`-bound.
		acceptsGlobalStorm: true,
	};
}

const COVER_CHECKS: readonly CheckSpec[] = [coverGrantCheckSpec(), attackRollCoverCheckSpec()];

// Generic Saving Throw proof: the pressure-plate EFFECT selects Dexterity,
// while `d20TestExpr` reads every creature-owned input from Actor and only
// the DC from TargetActor (the plate). Eligibility is deterministic; the
// Saving Throw belongs to `resolution_predicate_source`, which dispatches
// separate half-damage/full-damage consequences (finding #55).
function pressurePlateSaveCheckSpec(): CheckSpec {
	const saveCheckExpr = d20TestExpr({
		scoreExpr: `actor.effective('${PROOF_DEX_STATE_ID}')`,
		proficiencyLevelExpr: `actor.stat('${PROOF_LEVEL_STATE_ID}')`,
		proficiencyCapabilityId: PROOF_DEX_SAVE_PROFICIENCY_CAPABILITY_ID,
		dcExpr: `target.stat('${PROOF_SAVE_DC_STATE_ID}')`,
	});
	return {
		slug: "pressure-plate-save",
		capabilityId: `${PROOF_BUNDLE_ID}/check/pressure-plate-save`,
		displayName: "Resolve pressure plate (Dexterity Saving Throw)",
		predicate: "1 == 1",
		resolutionPredicateSource: saveCheckExpr,
		capabilityDescription:
			"TEST-ONLY automatic entry resolver for the Fire-Casting Statue pressure plate " +
			"(`cache/markdown/gameplay-toolbox.md:593-600`): the generic d20TestExpr reads " +
			`Dexterity, level, and save proficiency from Actor; only DC ${PROOF_PRESSURE_PLATE_DC} is read from ` +
			`TargetActor's '${PROOF_SAVE_DC_STATE_ID}'. Stochastic resolution applies 5 HP damage on success ` +
			"or the source's full 11 HP damage on failure.",
		frameWriteActor: "Actor",
		frameWriteResource: PROOF_HERO_HP_STATE_ID,
		frameWriteDeltaSource: `-${PROOF_SAVE_HALF_DAMAGE}`,
		failureFrameWrite: {
			ModifyResource: {
				actor: "Actor",
				delta_source: `-${PROOF_SAVE_DAMAGE}`,
				resource: PROOF_HERO_HP_STATE_ID,
			},
		},
		placeNodeId: PROOF_PRESSURE_PLATE_NODE_ID,
		onEntryTargetEntityKey: PROOF_PRESSURE_PLATE_ENTITY_KEY,
	};
}

const SAVE_CHECKS: readonly CheckSpec[] = [pressurePlateSaveCheckSpec()];

// Advantage extension (the proof-scene design record): `advantage-grant`'s success
// consequence lands the TEST-ONLY Advantage condition on whichever entity
// the manipulation targets (`ApplyStatus { target_ref: "TargetActor" }` —
// the SAME dynamic binding every other check's `ModifyResource` frame_write
// already uses, resolved by the TEST to the dedicated advantage-dummy, not
// the shared one); `advantage-check` is the SAME bare-d20 shape as the d20
// trio, proving the newly-fixed `Op::Roll` bias consultation end to end.
function advantageGrantCheckSpec(): CheckSpec {
	return {
		slug: "advantage-grant",
		capabilityId: `${PROOF_BUNDLE_ID}/check/advantage-grant`,
		displayName: "Grant Advantage (finding #23 live proof — lands a condition on the target)",
		predicate: d20TestExpr({
			scoreExpr: `actor.effective('${PROOF_STR_STATE_ID}')`,
			proficiencyLevelExpr: `actor.stat('${PROOF_LEVEL_STATE_ID}')`,
			dc: PROOF_D20_EASY_DC,
		}),
		capabilityDescription:
			"TEST-ONLY check capability for the finding #23 Advantage live proof: guaranteed-success " +
			"gate (same boundary-DC trick as d20-easy) whose success consequence lands a TEST-ONLY, " +
			"unconditionally-active Advantage condition on the manipulation's target via ApplyStatus.",
		successFrameWrite: {
			ApplyStatus: {
				target_kind: "entity",
				target_ref: "TargetActor",
				condition_definition_id: PROOF_ADVANTAGE_CONDITION_ID,
			},
		},
	};
}

function advantageCheckCheckSpec(): CheckSpec {
	return {
		slug: "advantage-check",
		capabilityId: `${PROOF_BUNDLE_ID}/check/advantage-check`,
		displayName: "Strength check (Advantage-biased, bare d20 — finding #23 live proof)",
		// SAME bare-d20 shape as the d20 trio's own predicate (d20TestExpr, NOT
		// biasableD20TestExpr's roll_table workaround) — the exact gap finding
		// #23 named: this term is Op::Roll, which never consulted
		// roll_modifier_bias before this bucket's substrate fix.
		predicate: d20TestExpr({
			scoreExpr: `actor.effective('${PROOF_STR_STATE_ID}')`,
			proficiencyLevelExpr: `actor.stat('${PROOF_LEVEL_STATE_ID}')`,
			dc: PROOF_ADVANTAGE_CHECK_DC,
		}),
		capabilityDescription:
			`TEST-ONLY check capability for the finding #23 Advantage live proof (contested DC ` +
			`${PROOF_ADVANTAGE_CHECK_DC}): the TEST targets the SAME entity advantage-grant lands its ` +
			"condition on, so resolve_manipulation_gate_bias's target-keyed lookup picks it up live.",
	};
}

const ADVANTAGE_CHECKS: readonly CheckSpec[] = [
	advantageGrantCheckSpec(),
	advantageCheckCheckSpec(),
];

// CONDITIONS PACKAGE live proof (Poisoned) — `combat.ts`'s own module header
// carries the full grounding (actor-keyed, not target-keyed like Advantage;
// cured immediately after use so the shared hero carries no lingering bias).
function poisonedGrantCheckSpec(): CheckSpec {
	return {
		slug: "poisoned-grant",
		capabilityId: `${PROOF_BUNDLE_ID}/check/poisoned-grant`,
		displayName:
			"Grant Poisoned (CONDITIONS PACKAGE live proof — lands the shipped srd/condition/poisoned condition)",
		predicate: d20TestExpr({
			scoreExpr: `actor.effective('${PROOF_STR_STATE_ID}')`,
			proficiencyLevelExpr: `actor.stat('${PROOF_LEVEL_STATE_ID}')`,
			dc: PROOF_D20_EASY_DC,
		}),
		capabilityDescription:
			"TEST-ONLY check capability for the CONDITIONS PACKAGE Poisoned live proof: guaranteed-" +
			"success gate (same boundary-DC trick as d20-easy/advantage-grant) whose success consequence " +
			`lands BOTH the SHIPPED '${PROOF_POISONED_CONDITION_ID}' condition AND its sibling ` +
			`'${POISONED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID}' onto the ACTING creature itself ` +
			"(target_ref: 'Actor') via TWO explicit ApplyStatus writes — Dodge's own actual twin-condition " +
			"shape retained by the shipped proof. Round-3 d020 now admits implied-child removal; " +
			"new content need not copy the historical separate-primary-row workaround.",
		successFrameWrite: {
			ApplyStatus: {
				target_kind: "entity",
				target_ref: "Actor",
				condition_definition_id: PROOF_POISONED_CONDITION_ID,
			},
		},
		additionalFrameWrites: [
			{
				ApplyStatus: {
					target_kind: "entity",
					target_ref: "Actor",
					condition_definition_id: POISONED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID,
				},
			},
		],
	};
}

function poisonedCheckCheckSpec(): CheckSpec {
	return {
		slug: "poisoned-check",
		capabilityId: `${PROOF_BUNDLE_ID}/check/poisoned-check`,
		displayName: "Strength check (Poisoned-biased, bare d20 — CONDITIONS PACKAGE live proof)",
		// SAME bare-d20 shape as advantage-check (Op::Roll, not the
		// roll_table/biasableD20TestExpr workaround) — the actor-side
		// Disadvantage composes through 'srd/ability_check' resolutionScope,
		// below, the mirror image of Advantage's target-side channel.
		predicate: d20TestExpr({
			scoreExpr: `actor.effective('${PROOF_STR_STATE_ID}')`,
			proficiencyLevelExpr: `actor.stat('${PROOF_LEVEL_STATE_ID}')`,
			dc: PROOF_POISONED_CHECK_DC,
		}),
		capabilityDescription:
			`TEST-ONLY check capability for the CONDITIONS PACKAGE Poisoned live proof (contested DC ` +
			`${PROOF_POISONED_CHECK_DC}): poisoned-grant already landed the condition on THIS same ` +
			"acting creature, so its internal ability-check-disadvantage sub-condition's actor-side " +
			"Disadvantage modifier composes into this roll via the 'srd/ability_check' resolution scope.",
		resolutionScope: ABILITY_CHECK_RESOLUTION_SCOPE_ID,
	};
}

function poisonedCureCheckSpec(): CheckSpec {
	return {
		slug: "poisoned-cure",
		capabilityId: `${PROOF_BUNDLE_ID}/check/poisoned-cure`,
		displayName: "Cure Poisoned (test cleanup — two independent RemoveCondition writes)",
		predicate: "1 == 1",
		capabilityDescription:
			"TEST-ONLY cleanup capability: unconditionally removes BOTH conditions poisoned-grant landed " +
			`on the ACTING creature — '${PROOF_POISONED_CONDITION_ID}' and its sibling ` +
			`'${POISONED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID}' — via TWO explicit RemoveCondition ` +
			"writes. Each targets a PRIMARY row (`parent_row_id = None`, since poisoned-grant applies both " +
			"via twin ApplyStatus, never `implies`) — `RemoveCondition`'s own `primary_condition_matches` " +
			"(`remove_condition.rs`) only ever matches primary rows, so an implies-cascaded child could " +
			"never have been targeted this way (confirmed live on this proof's first attempt, when the " +
			"sibling WAS `implies`-linked: the cure silently no-opped on the child, corrupting later " +
			"checks sharing the 'srd/ability_check' resolution scope) — the reason POISONED_DESCRIPTION's " +
			"own removability finding rules out `implies` for this condition.",
		successFrameWrite: {
			RemoveCondition: {
				target_kind: "entity",
				target_ref: "Actor",
				condition_definition_id: PROOF_POISONED_CONDITION_ID,
				source_match: "Any",
			},
		},
		additionalFrameWrites: [
			{
				RemoveCondition: {
					target_kind: "entity",
					target_ref: "Actor",
					condition_definition_id: POISONED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID,
					source_match: "Any",
				},
			},
		],
	};
}

const POISONED_CHECKS: readonly CheckSpec[] = [
	poisonedGrantCheckSpec(),
	poisonedCheckCheckSpec(),
	poisonedCureCheckSpec(),
];

function falseModifierGrantCheckSpec(): CheckSpec {
	return {
		slug: "false-modifier-grant",
		capabilityId: `${PROOF_BUNDLE_ID}/check/false-modifier-grant`,
		displayName: "Grant false-predicate modifier condition (finding #76 proof)",
		predicate: "1 == 1",
		capabilityDescription:
			"TEST-ONLY grant for finding #76: applies a condition whose Disadvantage modifier has predicate_source = '1 == 0'.",
		successFrameWrite: {
			ApplyStatus: {
				target_kind: "entity",
				target_ref: "Actor",
				condition_definition_id: PROOF_FALSE_MODIFIER_CONDITION_ID,
			},
		},
	};
}

function falseModifierCheckSpec(): CheckSpec {
	return {
		slug: "false-modifier-check",
		capabilityId: `${PROOF_BUNDLE_ID}/check/false-modifier-check`,
		displayName: "Strength check with a false-predicate modifier (finding #76 proof)",
		predicate: d20TestExpr({
			scoreExpr: `actor.effective('${PROOF_STR_STATE_ID}')`,
			proficiencyLevelExpr: `actor.stat('${PROOF_LEVEL_STATE_ID}')`,
			dc: PROOF_FALSE_MODIFIER_CHECK_DC,
		}),
		capabilityDescription:
			"TEST-ONLY contested check for finding #76: the actor carries a Disadvantage modifier, but its false predicate must keep the roll at one d20.",
		resolutionScope: PROOF_FALSE_MODIFIER_SCOPE_ID,
	};
}

const FALSE_MODIFIER_CHECKS: readonly CheckSpec[] = [
	falseModifierGrantCheckSpec(),
	falseModifierCheckSpec(),
];

function zeroReachGrantCheckSpec(): CheckSpec {
	return {
		slug: "zero-reach-grant",
		capabilityId: `${PROOF_BUNDLE_ID}/check/zero-reach-grant`,
		displayName: "Grant zero movement reach (finding #90 proof)",
		predicate: "1 == 1",
		capabilityDescription:
			"TEST-ONLY grant for finding #90: applies a FlatSet(0) modifier to the movement reach resource consumed by r_move.",
		successFrameWrite: {
			ApplyStatus: {
				target_kind: "entity",
				target_ref: "Actor",
				condition_definition_id: PROOF_ZERO_REACH_CONDITION_ID,
			},
		},
	};
}

function zeroReachCureCheckSpec(): CheckSpec {
	return {
		slug: "zero-reach-cure",
		capabilityId: `${PROOF_BUNDLE_ID}/check/zero-reach-cure`,
		displayName: "Remove zero movement reach (finding #90 cleanup)",
		predicate: "1 == 1",
		capabilityDescription:
			"TEST-ONLY cleanup for finding #90: removes the zero-reach condition so later movement proofs remain independent.",
		successFrameWrite: {
			RemoveCondition: {
				target_kind: "entity",
				target_ref: "Actor",
				condition_definition_id: PROOF_ZERO_REACH_CONDITION_ID,
				source_match: "Any",
			},
		},
	};
}

const ZERO_REACH_CHECKS: readonly CheckSpec[] = [
	zeroReachGrantCheckSpec(),
	zeroReachCureCheckSpec(),
];

// C5 (Step-5 derived numbers, `ledger/character-creation.md`'s C5 row) —
// the "vocabulary never ships unattached" consumer proof for
// `character-creation/derived-units.ts`'s `passivePerceptionExpr`. The HERO
// (its own claimed connection — the stable rail every other check uses)
// rolls a proficient Dexterity (Stealth) check whose DC is
// `passivePerceptionExpr('target')` read off the unclaimed training DUMMY.
// Both OTHER pairings hit r_manipulate's claim policy live (finding
// finding #84): guard→hero failed on the TARGET being another connection's
// claimed body, and guard→dummy failed in-suite on the ACTING guard's own
// claim being locked by earlier session tests — hero→dummy is the pairing
// with no claim edge at all. The dcExpr's target-side has_capability PB
// branch resolves FALSE live (the dummy carries no Perception proficiency);
// the branch itself is pinned offline (`derived-units.test.ts`) and reuses
// the equipment-proficiencies capability idiom proven live elsewhere.
export const PROOF_STEALTH_SKILL_CAPABILITY_ID = `${BUNDLE_ID}/skill/stealth`;
const STEALTH_VS_PASSIVE_PERCEPTION_SLUG = "stealth-vs-passive-perception";
export const PROOF_STEALTH_VS_PASSIVE_PERCEPTION_CHECK_CAP = `${PROOF_BUNDLE_ID}/check/${STEALTH_VS_PASSIVE_PERCEPTION_SLUG}`;
/** The action id `manipulateAction` dispatches — `CHECK_ACTION_CALLS`'s own `id: check.slug` convention (`calls/checks.ts`). */
export const PROOF_STEALTH_VS_PASSIVE_PERCEPTION_ACTION_ID = `${PROOF_BUNDLE_ID}/${STEALTH_VS_PASSIVE_PERCEPTION_SLUG}`;

/**
 * The DUMMY's Wisdom score — scene-owned, chosen (like
 * `PROOF_GENERIC_PERSUASION_TARGET_INT`, above) so the SAME guaranteed-
 * success boundary trick every other check in this file uses
 * (`guaranteedSuccessDc`: DC <= 1 + total modifier) lands EXACTLY on the
 * dummy's derived Passive Perception: hero Dex 14 -> +2, hero Stealth
 * proficiency (level 5 -> PB +3) -> total modifier +5, so
 * `guaranteedSuccessDc(5) === 6`, matching
 * `expectedPassivePerception(PROOF_DUMMY_WIS_VALUE, PROOF_LEVEL_VALUE,
 * false) === 6` (WIS 2 -> modifier -4; no Perception proficiency on the
 * dummy, so the PB branch contributes 0) — pinned offline in
 * `derived-units.test.ts` and `proof-scene.test.ts`.
 */
export const PROOF_DUMMY_WIS_VALUE = 2;
export const PROOF_HERO_STEALTH_TOTAL_MODIFIER =
	expectedAbilityModifier(PROOF_DEX_VALUE) + PROOF_PROFICIENCY_BONUS;
export const PROOF_PASSIVE_PERCEPTION_STEALTH_DC = guaranteedSuccessDc(
	PROOF_HERO_STEALTH_TOTAL_MODIFIER,
);

function stealthVsPassivePerceptionCheckSpec(): CheckSpec {
	const skillOptions: SkillCheckOptions = {
		scoreExpr: `actor.effective('${PROOF_DEX_STATE_ID}')`,
		skillCapabilityId: PROOF_STEALTH_SKILL_CAPABILITY_ID,
		proficiencyLevelExpr: `actor.stat('${PROOF_LEVEL_STATE_ID}')`,
		dcExpr: passivePerceptionExpr("target"),
	};
	return {
		slug: STEALTH_VS_PASSIVE_PERCEPTION_SLUG,
		capabilityId: PROOF_STEALTH_VS_PASSIVE_PERCEPTION_CHECK_CAP,
		displayName: "Guard Dexterity (Stealth) vs Hero Passive Perception (C5 live proof)",
		predicate: skillCheckExpr(skillOptions),
		capabilityDescription:
			"TEST-ONLY check capability for the C5 Passive Perception live proof " +
			"(character-creation.md:590): the SECOND ACTOR (guard) rolls a proficient Dexterity " +
			"(Stealth) check against the HERO's own target-derived Passive Perception " +
			"(passivePerceptionExpr('target'), character-creation/derived-units.ts) — the consumer " +
			"this chapter's own 'vocabulary never ships unattached' addendum requires.",
		// The success consequence writes onto the CHECKING actor (guard), not
		// the hero being read — `frameWriteResource` stays at its default
		// (`PROOF_FLEXED_STATE_ID`), which auto-materialises on guard from the
		// resource_definition's own initial_value (0) on first write
		// (`modify_resource.rs`'s prevalidate/execute: a missing live
		// object_state row is seeded from the resource_definition, no explicit
		// per-entity seed required for a WRITE — unlike a `stat`/`effective`
		// READ, which fails closed on an unseeded subject).
		frameWriteActor: "Actor",
	};
}

const PASSIVE_PERCEPTION_CHECKS: readonly CheckSpec[] = [stealthVsPassivePerceptionCheckSpec()];

// Generic-check verb rework (the proof-scene design record, "GENERIC-CHECK VERB
// REWORK") — NOT a `CheckSpec` (no proof-authored capability/action/
// consequence/outcome/affordance rows; the verb IS the shipped base-bundle
// one). One entry per reworked check: the shipped action id to invoke, the
// eligibility capability to grant the hero (the shipped `srd/check/<slug>`),
// an OPTIONAL skill-identity capability to ALSO grant (the proficient
// cases only), and which target (dummy or guard) carries the seed.
export interface GenericCheckVerbGrant {
	slug: string;
	actionId: string;
	eligibilityCapabilityId: string;
	/** The skill's OWN identity capability (`srd/skill/<slug>`) — granted alongside eligibility for the PROFICIENT cases only; absent for raw-ability and deliberately-unproficient cases. */
	skillIdentityCapabilityId?: string;
}

export const GENERIC_CHECK_VERB_GRANTS: readonly GenericCheckVerbGrant[] = [
	{
		slug: "athletics",
		actionId: PROOF_GENERIC_ATHLETICS_ACTION_ID,
		eligibilityCapabilityId: `${BUNDLE_ID}/check/athletics`,
		skillIdentityCapabilityId: PROOF_ATHLETICS_SKILL_CAPABILITY_ID,
	},
	{
		slug: "wis",
		actionId: PROOF_GENERIC_WIS_ACTION_ID,
		eligibilityCapabilityId: `${BUNDLE_ID}/check/wis`,
	},
	{
		slug: "perception",
		actionId: PROOF_GENERIC_PERCEPTION_ACTION_ID,
		eligibilityCapabilityId: `${BUNDLE_ID}/check/perception`,
		skillIdentityCapabilityId: PROOF_SKILL_ID,
	},
	{
		slug: "insight",
		actionId: PROOF_GENERIC_INSIGHT_ACTION_ID,
		eligibilityCapabilityId: `${BUNDLE_ID}/check/insight`,
		// Deliberately NO skillIdentityCapabilityId — srd/skill/insight is
		// never granted to the hero (the negative control on the PB gate).
	},
	{
		slug: "persuasion",
		actionId: PROOF_GENERIC_PERSUASION_ACTION_ID,
		eligibilityCapabilityId: `${BUNDLE_ID}/check/persuasion`,
		// Deliberately NO skillIdentityCapabilityId — hero unproficient in
		// Persuasion (total modifier = CHA mod alone = 0).
	},
];

export const ALL_CHECKS: readonly CheckSpec[] = [
	...FLEX_CHECKS,
	...ATTACK_ROLL_CHECKS,
	...COVER_CHECKS,
	...SAVE_CHECKS,
	...ADVANTAGE_CHECKS,
	...PASSIVE_PERCEPTION_CHECKS,
	...POISONED_CHECKS,
	...FALSE_MODIFIER_CHECKS,
	...ZERO_REACH_CHECKS,
];
