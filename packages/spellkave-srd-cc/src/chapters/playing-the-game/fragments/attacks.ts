// DOC-IMPL: attack-and-damage#the-pipeline-offer-to-hit
// pattern: post-commit-hit-reaction
import type { AuthorTarget } from "@spellkave/tool-authoring";

import type { ChapterUnitSummary } from "../../chapter-types";
import { MAIN_HAND_SLOT_LOCAL_ID } from "../../equipment/armor-units";
import { WEAPON_SUBJECT } from "../../equipment/weapon-subject";
import { WEAPON_RANGE_TAG_PREFIX } from "../../equipment/weapon-tag-values";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { PRIMARY_CHANNEL_ID, REACTION_CHANNEL_ID } from "../action-economy-units";
import { AC_RESOURCE_ID } from "../armor-class-units";
import { BUNDLE_ID } from "../constants";
import { characterUnconsciousFrameWrite } from "../death-saves-units";
import { HP_ID } from "../hp-units";
import { PROFICIENCY_BONUS_STATE_ID } from "../modifier-units";
import { REACH_RESOURCE_ID } from "../reach-units";
import { ATTACK_ROLL_RESOLUTION_SCOPE_ID } from "../resolution-scope-units";
import {
	assertOpportunityAttackProvenanceSource,
	assertUnarmedStrikeDamageProvenanceSource,
	OPPORTUNITY_ATTACK_ACTION_SUFFIX,
	UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX,
	UNARMED_STRIKE_DAMAGE_DESCRIPTION,
	UNARMED_STRIKE_DAMAGE_DISPLAY_NAME,
	unarmedStrikeAttackExpr,
	unarmedStrikeDamageDeltaExpr,
	unarmedStrikeRangePredicate,
} from "../unarmed-strike-units";
import {
	ATTACK_MISS_TRACE_KIND_ID,
	ATTACK_VERB_NICHE_LOCAL_ID,
	attackMissInscribeFrameWrite,
	attackMissTraceKindDefinitionCall,
	MELEE_ATTACK_LOCAL_ID,
	MELEE_ATTACK_RANGE_METERS,
	meleeAttackRollExpr,
	meleeDamageDeltaExpr,
	monsterDeathFrameWrite,
	opportunityAttackRangePredicate,
	RANGED_ATTACK_LOCAL_ID,
	RANGED_ATTACK_RANGE_METERS,
	rangedAttackRollExpr,
	rangedDamageDeltaExpr,
	SWING_ATTACK_LOCAL_ID,
	UNARMED_ATTACK_RANGE_METERS,
	weaponAttackRangePredicate,
} from "../weapon-attack-units";
import { attackCapabilityCall } from "./actions";
import { DEAD_CONDITION_ID, UNCONSCIOUS_CONDITION_ID } from "./conditions";
import {
	DEATH_SAVE_FAILURES_ID,
	DEATH_SAVE_LAST_ROLL_ID,
	DEATH_SAVE_SUCCESSES_ID,
} from "./death-saves";

/** PC at 0 HP → Unconscious + seed death-save clock (sk-609b.18). */
const PC_UNCONSCIOUS_AT_ZERO = characterUnconsciousFrameWrite(
	`${BUNDLE_ID}/${HP_ID}`,
	UNCONSCIOUS_CONDITION_ID,
	DEATH_SAVE_SUCCESSES_ID,
	DEATH_SAVE_FAILURES_ID,
	DEATH_SAVE_LAST_ROLL_ID,
);

const ATTACKS_ANCHOR = "playing-the-game.md § Combat > Melee Attacks > Opportunity Attacks";
// Rule pins: cache/markdown/playing-the-game.md:1094-1100 and
// cache/markdown/rules-glossary.md:1119-1121 (trigger, Reaction, melee/Unarmed Strike).
const OPPORTUNITY_ATTACK_DISPLAY_NAME = "Opportunity Attack";
const OPPORTUNITY_ATTACK_DESCRIPTION =
	"When a creature you can see leaves your reach, take a Reaction to make one melee attack with a weapon or Unarmed Strike against it.";
const OPPORTUNITY_ATTACK_TRIGGER = "$event.kind == 'r_move' && $event.detail.on_exit == 'true'";
/**
 * WHO may react (sk-0m4.26 / D-OPEN-1): the kernel only populates generic
 * Chebyshev millimetre facts (`core/distance_to_departed_mm`,
 * `core/distance_to_destination_mm`) plus the mover as Target. This predicate
 * does the SRD comparison — departed node inside `srd/reach_mm`, destination
 * not, mover not Disengaging (`srd/action/disengage`; DSL has no unary !).
 */
export const OPPORTUNITY_ATTACK_ELIGIBILITY =
	`actor.has_capability('${BUNDLE_ID}/action/attack')` +
	` && actor.stat('core/distance_to_departed_mm') <= actor.stat('${REACH_RESOURCE_ID}')` +
	` && actor.stat('core/distance_to_destination_mm') > actor.stat('${REACH_RESOURCE_ID}')` +
	` && target.has_capability('${BUNDLE_ID}/action/disengage') == false` +
	// Open Hand Addle (L12a): reactor cannot OA while Addled.
	` && actor.status('${BUNDLE_ID}/condition/addled') == false`;
const OPPORTUNITY_ATTACK_WINDOW_MS = 30_000;

export async function buildAttacksFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	assertUnarmedStrikeDamageProvenanceSource();
	assertOpportunityAttackProvenanceSource();
	const actionId = `${BUNDLE_ID}/${UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX}`;
	const opportunityAttackId = `${BUNDLE_ID}/${OPPORTUNITY_ATTACK_ACTION_SUFFIX}`;
	const hasMeleeWeaponExpr = `${WEAPON_SUBJECT}.has_tag('${WEAPON_RANGE_TAG_PREFIX}.melee')`;
	// sk-84i.4 / sk-dms.40.1: every wielder's Proficiency Bonus, baked per-entity
	// (`modifier-units.ts`'s own `PROFICIENCY_BONUS_STATE_ID` doc comment has
	// the full macro-vs-stat rationale + the ADR-0035 fail-closed
	// missing-stat decision). Shared by Unarmed Strike, Opportunity Attack,
	// Melee, and Ranged — heroes and creatures both seed this stat; monsters
	// carry no `srd/level` for the macro route to read.
	const proficiencyBonusExpr = `actor.stat('${PROFICIENCY_BONUS_STATE_ID}')`;

	// actor-carried-verbs (D1/D5/D7, ruling bead sk-rd0): the AC-gated OFFER
	// predicate every attack action used to share (`target.stat('srd/ac') >=
	// 1`) is RETIRED — it never did any selecting work (duplicated verbatim
	// on every template that referenced it) and AC stops being a doorman: an
	// attack's admission now keys on the ACTOR's own capability (provider =
	// "actor" on `attackVerbNicheId` below), never the target's seeded state.
	// AC remains an input to the resolution roll only
	// (`target.effective('srd/ac')`, unchanged below) — an unseeded target
	// resolves as an observable MISS at act time (D5), never a silent
	// non-event. Every OFFER predicate in this file that used to compose the
	// old `strikeablePredicateSource` constant is simply OMITTED now (the
	// verb layer's own "omit for an ungated trigger" convention,
	// `predicate_bool: true`).
	const attackVerbNicheId = `${BUNDLE_ID}/${ATTACK_VERB_NICHE_LOCAL_ID}`;

	// Issue #2093 (root-caused via findings #70/#71, substrate
	// genus = tracker issue #1891): Unarmed Strike Damage's `predicate_source`
	// used to route `unarmedStrikeAttackExpr -> attackRollExpr`, putting the
	// to-hit d20 inside the OFFER predicate — the affordance MATERIALISER
	// rolls that d20 with live entropy per candidate, so a live, in-range
	// target only materialises when the materialise-time roll hits, and a
	// raw-dispatchable action can silently vanish from discovery entirely
	// (never once offered across 35 combined attempts, `player/
	// character-arc.test.ts`'s own failure trail). Fixed identically to the
	// sibling Melee/Ranged Attack actions below: the OFFER predicate carries
	// ATTEMPTABILITY only (the shared strikeable gate), and the to-hit d20
	// moves to the act-time Stochastic resolution via `resolution_predicate_
	// source` + an explicit `/miss` consequence.
	// sk-jay0.1.8.63.40: a miss is a perceivable TRACE for the target (and any
	// co-located bystander), not silence — see weapon-attack-units.ts's
	// attackMissInscribeFrameWrite doc comment for the full design.
	const actionMissCall: VerbCall = {
		toolName: "spellkave_define_consequence",
		label: `${UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX}/miss`,
		params: {
			bundle: BUNDLE_ID,
			id: `${UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX}/miss`,
			description: "Unarmed Strike Damage miss: no damage is dealt.",
			frame_writes: [attackMissInscribeFrameWrite("Unarmed Strike misses")],
		},
	};
	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX,
		params: {
			bundle: BUNDLE_ID,
			id: UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX,
			required_capability: `${BUNDLE_ID}/action/attack`,
			niche_id: attackVerbNicheId,
			display_name: UNARMED_STRIKE_DAMAGE_DISPLAY_NAME,
			description: UNARMED_STRIKE_DAMAGE_DESCRIPTION,
			resolution_scope: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
			// Ungated offer (header note above) — the actor's own capability is
			// the whole admission test; `predicate_source` omitted derives
			// `predicate_bool: true`.
			resolution_mode: "Stochastic",
			resolution_predicate_source: unarmedStrikeAttackExpr(
				`actor.effective('${BUNDLE_ID}/str')`,
				proficiencyBonusExpr,
				`target.effective('${AC_RESOURCE_ID}')`,
			),
			on_failure: `${actionId}/miss`,
			predicate_source: unarmedStrikeRangePredicate(),
			range_m: UNARMED_ATTACK_RANGE_METERS,
			// attackRollExpr's let-bound d20 reference classifies as Global under
			// the validator's conservative locality pass (finding #25).
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			non_steering: true, // Round 3: concurrent party attacks; canon review required.
			consequence: {
				description:
					"Unarmed Strike Damage hit: subtract the sourced fixed 1 + Strength modifier magnitude " +
					"from the target's Hit Points; a hit that drops a co-located MONSTER to 0 HP applies " +
					"srd/condition/dead (playing-the-game.md:1217, Monster Death — sk-dms.39, " +
					"weapon-attack-units.ts's monsterDeathFrameWrite).",
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							resource: `${BUNDLE_ID}/${HP_ID}`,
							delta_source: unarmedStrikeDamageDeltaExpr(`actor.effective('${BUNDLE_ID}/str')`),
						},
					},
					monsterDeathFrameWrite(`${BUNDLE_ID}/${HP_ID}`, DEAD_CONDITION_ID),
					PC_UNCONSCIOUS_AT_ZERO,
				],
			},
		},
	};
	const opportunityAttackMissCall: VerbCall = {
		toolName: "spellkave_define_consequence",
		label: `${OPPORTUNITY_ATTACK_ACTION_SUFFIX}/miss`,
		params: {
			bundle: BUNDLE_ID,
			id: `${OPPORTUNITY_ATTACK_ACTION_SUFFIX}/miss`,
			description: "Opportunity Attack miss: no damage is dealt.",
			frame_writes: [attackMissInscribeFrameWrite("Opportunity Attack misses")],
		},
	};
	const opportunityAttackCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: OPPORTUNITY_ATTACK_ACTION_SUFFIX,
		params: {
			bundle: BUNDLE_ID,
			id: OPPORTUNITY_ATTACK_ACTION_SUFFIX,
			required_capability: `${BUNDLE_ID}/action/attack`,
			niche_id: attackVerbNicheId,
			display_name: OPPORTUNITY_ATTACK_DISPLAY_NAME,
			description: OPPORTUNITY_ATTACK_DESCRIPTION,
			resolution_scope: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
			// Ungated offer, same posture as Unarmed Strike Damage above (was the
			// already-trivial "1 == 1"; omitted now for the verb layer's own
			// ungated-trigger convention).
			resolution_mode: "Stochastic",
			resolution_predicate_source: unarmedStrikeAttackExpr(
				`actor.effective('${BUNDLE_ID}/str')`,
				proficiencyBonusExpr,
				`target.effective('${AC_RESOURCE_ID}')`,
			),
			on_failure: `${opportunityAttackId}/miss`,
			predicate_source: opportunityAttackRangePredicate(),
			range_m: MELEE_ATTACK_RANGE_METERS,
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: REACTION_CHANNEL_ID,
			non_steering: true, // Round 3: concurrent party attacks; canon review required.
			reaction_trigger: OPPORTUNITY_ATTACK_TRIGGER,
			reaction_eligibility: OPPORTUNITY_ATTACK_ELIGIBILITY,
			reaction_window_ms: OPPORTUNITY_ATTACK_WINDOW_MS,
			consequence: {
				description:
					"Opportunity Attack hit: use the equipped melee weapon's own srd/damage magnitude, " +
					"or the explicit Unarmed Strike damage formula when no melee weapon is equipped " +
					"(rules-glossary.md:1119, playing-the-game.md:1100); a hit that drops a " +
					"co-located MONSTER to 0 HP applies srd/condition/dead (playing-the-game.md:1217, " +
					"Monster Death — sk-dms.39, weapon-attack-units.ts's monsterDeathFrameWrite).",
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							resource: `${BUNDLE_ID}/${HP_ID}`,
							delta_source: `cond(${hasMeleeWeaponExpr}, ${meleeDamageDeltaExpr()}, ${unarmedStrikeDamageDeltaExpr(`actor.effective('${BUNDLE_ID}/str')`)})`,
						},
					},
					monsterDeathFrameWrite(`${BUNDLE_ID}/${HP_ID}`, DEAD_CONDITION_ID),
					PC_UNCONSCIOUS_AT_ZERO,
				],
			},
		},
	};
	// ── Combat-arena proof, Slice A: generic Melee/Ranged Attack chains ────────
	// (`ledger/designs/combat-arena-proof.md`), distinct from Unarmed Strike
	// above (a fixed 1+mod formula, no dice) — see `weapon-attack-units.ts`'s
	// own module header for the full grounding (Reach/Range/Attack Roll
	// Abilities citations and item-sourced damage).
	const meleeActionId = `${BUNDLE_ID}/${MELEE_ATTACK_LOCAL_ID}`;
	const rangedActionId = `${BUNDLE_ID}/${RANGED_ATTACK_LOCAL_ID}`;
	const swingActionId = `${BUNDLE_ID}/${SWING_ATTACK_LOCAL_ID}`;

	// actor-carried-verbs D1/D7 (ruling bead sk-rd0, canon-warden amendment):
	// the RETIRED `srd/niche/strikeable` niche_definitions row (its AC-gated
	// predicate never did any selecting work) is replaced by ONE
	// actor-provided niche, authored via `spellkave_write_rows` (not
	// `spellkave_define_niche` — that verb has no `provider` param) so the new
	// `niche_definitions.provider` column can be set directly. `provider:
	// "actor"` (`niche_provider_definition`'s `admits_targets_without_
	// membership` flag) means the acting entity's own `srd/action/attack`
	// capability carries this niche everywhere: no place attachment, no
	// target-side gate — candidates are every grounded entity within
	// `range_m` (server-side, `affordance_materialiser/reconcile/
	// candidates.rs`). Shared by every capability-driven attack template in
	// this file (Melee/Ranged/Unarmed Strike/Opportunity Attack, the swing
	// variant below) plus `starter-behaviors.ts`'s per-creature statblock
	// actions and `spell-behaviors.ts`'s 13 curated spells — ONE niche row,
	// never re-derived per consumer.
	const attackVerbNicheCall: VerbCall = {
		toolName: "spellkave_write_rows",
		label: "niche:attack-verb",
		params: {
			bundle: BUNDLE_ID,
			kind: "niche_definitions",
			rows: [
				{
					niche_id: attackVerbNicheId,
					bundle_id: BUNDLE_ID,
					display_name: "Attack (actor-carried)",
					description:
						"An attack is a capability of the ACTOR, not a property of the target (operator " +
						"ruling 2026-08-12, bead sk-rd0): the acting entity's own srd/action/attack " +
						"capability carries this niche everywhere, gated on nothing target-side — AC remains " +
						"a resolution input only (target.effective('srd/ac')), never an offer doorman.",
					predicate_source: "",
					provider: "actor",
				},
			],
		},
	};

	// Findings #70/#71 (root-caused 2026-07-31; substrate genus =
	// tracker issue #1891): a to-hit d20 inside the OFFER predicate is rolled
	// by the affordance MATERIALISER with live entropy per candidate — a live,
	// in-range, adjacent target then materialises only when that
	// materialise-time roll hits (~40% here), which is #70's missing melee
	// candidate and #71's one-of-two ranged goblins. Fix (issue #1891's own
	// preferred shape, and this file's OA precedent): the OFFER predicate
	// carries ATTEMPTABILITY only (the strikeable gate), and the to-hit d20
	// moves to the act-time Stochastic resolution — `resolution_predicate_
	// source` + an explicit `/miss` consequence, exactly like Opportunity
	// Attack above. Perceive is deterministic; hit/miss is an act outcome
	// (`resolution_branch:on_success|on_failure`), never a missing offer.
	// Issue #2093 later found the SAME anti-pattern in Unarmed Strike Damage
	// above (never migrated when #70/#71 landed) — fixed identically, see
	// that action's own header comment.
	const meleeMissCall: VerbCall = {
		toolName: "spellkave_define_consequence",
		label: `${MELEE_ATTACK_LOCAL_ID}/miss`,
		params: {
			bundle: BUNDLE_ID,
			id: `${MELEE_ATTACK_LOCAL_ID}/miss`,
			description: "Melee Attack miss: no damage is dealt.",
			frame_writes: [attackMissInscribeFrameWrite("Melee Attack misses")],
		},
	};
	const rangedMissCall: VerbCall = {
		toolName: "spellkave_define_consequence",
		label: `${RANGED_ATTACK_LOCAL_ID}/miss`,
		params: {
			bundle: BUNDLE_ID,
			id: `${RANGED_ATTACK_LOCAL_ID}/miss`,
			description: "Ranged Attack miss: no damage is dealt.",
			frame_writes: [attackMissInscribeFrameWrite("Ranged Attack misses")],
		},
	};

	const meleeActionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: MELEE_ATTACK_LOCAL_ID,
		params: {
			bundle: BUNDLE_ID,
			id: MELEE_ATTACK_LOCAL_ID,
			required_capability: `${BUNDLE_ID}/action/attack`,
			niche_id: attackVerbNicheId,
			display_name: "Melee Attack",
			description:
				"Make an attack with an equipped melee weapon within the actor's effective reach, " +
				"extended by the weapon's Reach property when present. " +
				"To-hit uses the weapon's Finesse identity when present plus Proficiency Bonus and d20 " +
				"against effective Armor Class; damage comes from the equipped weapon's srd/damage slot.",
			resolution_scope: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
			predicate_source: weaponAttackRangePredicate("melee"),
			resolution_mode: "Stochastic",
			resolution_predicate_source: meleeAttackRollExpr(
				`actor.effective('${BUNDLE_ID}/str')`,
				`actor.effective('${BUNDLE_ID}/dex')`,
				`target.effective('${AC_RESOURCE_ID}')`,
				proficiencyBonusExpr,
			),
			on_failure: `${meleeActionId}/miss`,
			range_m: MELEE_ATTACK_RANGE_METERS,
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			non_steering: true, // Round 3: concurrent party attacks; canon review required.
			consequence: {
				description:
					"Melee Attack hit: subtract the equipped melee weapon's own srd/damage magnitude " +
					"from the target's Hit Points; a hit that drops a " +
					"co-located MONSTER to 0 HP applies srd/condition/dead (playing-the-game.md:1217, " +
					"Monster Death, monster-scoped — sk-dms.39, weapon-attack-units.ts's " +
					"monsterDeathFrameWrite, finding #66 addendum).",
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							resource: `${BUNDLE_ID}/${HP_ID}`,
							delta_source: meleeDamageDeltaExpr(),
						},
					},
					monsterDeathFrameWrite(`${BUNDLE_ID}/${HP_ID}`, DEAD_CONDITION_ID),
					PC_UNCONSCIOUS_AT_ZERO,
				],
			},
		},
	};

	const rangedActionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: RANGED_ATTACK_LOCAL_ID,
		params: {
			bundle: BUNDLE_ID,
			id: RANGED_ATTACK_LOCAL_ID,
			required_capability: `${BUNDLE_ID}/action/attack`,
			niche_id: attackVerbNicheId,
			display_name: "Ranged Attack",
			description:
				"Make a ranged attack against a target within normal range (playing-the-game.md:1076-1080; " +
				"the long-range Disadvantage half + the within-5-ft-of-an-enemy Disadvantage clause are " +
				"recorded gaps, finding #64). To-hit: Dexterity + Proficiency Bonus (sk-84i.4) + d20 vs " +
				"the target's effective Armor Class. Damage and exact normal range come from the " +
				"equipped ranged weapon's authored source slots.",
			resolution_scope: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
			predicate_source: weaponAttackRangePredicate("ranged"),
			resolution_mode: "Stochastic",
			resolution_predicate_source: rangedAttackRollExpr(
				`actor.effective('${BUNDLE_ID}/dex')`,
				`actor.effective('${BUNDLE_ID}/str')`,
				`target.effective('${AC_RESOURCE_ID}')`,
				proficiencyBonusExpr,
			),
			on_failure: `${rangedActionId}/miss`,
			range_m: RANGED_ATTACK_RANGE_METERS,
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			non_steering: true, // Round 3: concurrent party attacks; canon review required.
			consequence: {
				description:
					"Ranged Attack hit: subtract the equipped ranged weapon's own srd/damage magnitude " +
					"from the target's Hit Points; " +
					"a hit that drops a co-located MONSTER to 0 HP applies " +
					"srd/condition/dead (playing-the-game.md:1217, Monster Death, monster-scoped — " +
					"sk-dms.39, weapon-attack-units.ts's monsterDeathFrameWrite, finding #66 addendum).",
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							resource: `${BUNDLE_ID}/${HP_ID}`,
							delta_source: rangedDamageDeltaExpr(),
						},
					},
					monsterDeathFrameWrite(`${BUNDLE_ID}/${HP_ID}`, DEAD_CONDITION_ID),
					PC_UNCONSCIOUS_AT_ZERO,
				],
			},
		},
	};

	// actor-carried-verbs D4/D9 (ruling bead sk-rd0): the untargeted swing —
	// "swing at thin air" — is an authored template variant, not a kernel arm.
	// Same actor-provided niche/capability as Melee Attack above, but its
	// RESOLUTION reads NO `target.*` facts at all (`resolution_mode`/
	// `resolution_predicate_source` both omitted — Deterministic, no dice, no
	// target read anywhere): the server derives the place-sentinel guard
	// (design D9) from exactly that absence, so this is the ONLY actor-
	// provided attack template whose candidate enumeration also emits the
	// untargeted `TargetRef::PlaceNode` row (`candidates.rs`). The action
	// still spends the primary channel and emits an observable event (the
	// outcome_templates row below) — it just never resolves a hit, because
	// there is nothing to hit.
	const swingActionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: SWING_ATTACK_LOCAL_ID,
		params: {
			bundle: BUNDLE_ID,
			id: SWING_ATTACK_LOCAL_ID,
			required_capability: `${BUNDLE_ID}/action/attack`,
			niche_id: attackVerbNicheId,
			display_name: "Swing (no target)",
			description:
				"Swing your weapon at nothing in particular (playing-the-game.md § Combat > Melee " +
				"Attacks) — the action is spent, but no target is struck. actor-carried-verbs D4/D9: " +
				"this template's resolution reads no target.* facts at all, which is what makes it the " +
				"one deliberately authored untargeted execution path for the attack capability.",
			// The shared Attack capability admits the actor; this actor-only
			// predicate proves that a real melee weapon is currently wielded.
			predicate_source: hasMeleeWeaponExpr,
			// resolution_mode omitted (Deterministic default): no dice, no
			// target read — the target-free resolution D9's sentinel guard
			// keys on.
			range_m: 0,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			non_steering: true, // Round 3: concurrent party attacks; canon review required.
			consequence: {
				// MF-VAL-222 no-op shape (empty frame_writes) — there is no
				// target to affect; the observable event is the outcome_
				// templates row's own description (upserted below).
				description: "Swing at empty air: no target, no effect, the action is spent.",
				frame_writes: [],
			},
		},
	};

	// sk-50z: PLAYER observation reads outcome_template.description (not
	// action_definitions.description). define_action_verb leaves outcome
	// description empty — upsert short PLAYER-facing lines with {target_name}.
	const attackParticipantDeclarations: VerbCall = {
		toolName: "spellkave_write_rows",
		label: "attack-participant-declarations",
		params: {
			bundle: BUNDLE_ID,
			kind: "affordance_template_participants",
			rows: [
				{
					template_id: `${meleeActionId}/affordance`,
					role_id: `${BUNDLE_ID}/instrument`,
					slot_id: `${BUNDLE_ID}/${MAIN_HAND_SLOT_LOCAL_ID}`,
					bundle_id: BUNDLE_ID,
				},
				{
					template_id: `${rangedActionId}/affordance`,
					role_id: `${BUNDLE_ID}/instrument`,
					slot_id: `${BUNDLE_ID}/${MAIN_HAND_SLOT_LOCAL_ID}`,
					bundle_id: BUNDLE_ID,
				},
				{
					template_id: `${opportunityAttackId}/affordance`,
					role_id: `${BUNDLE_ID}/instrument`,
					slot_id: `${BUNDLE_ID}/${MAIN_HAND_SLOT_LOCAL_ID}`,
					bundle_id: BUNDLE_ID,
				},
				{
					template_id: `${swingActionId}/affordance`,
					role_id: `${BUNDLE_ID}/instrument`,
					slot_id: `${BUNDLE_ID}/${MAIN_HAND_SLOT_LOCAL_ID}`,
					bundle_id: BUNDLE_ID,
				},
			],
		},
	};

	const attackOutcomeObservationUpsert: VerbCall = {
		toolName: "spellkave_write_rows",
		label: "attack-outcome-observations",
		params: {
			bundle: BUNDLE_ID,
			kind: "outcome_templates",
			rows: [
				{
					outcome_template_id: `${actionId}/outcome`,
					bundle_id: BUNDLE_ID,
					display_name: "Unarmed Strike: Damage",
					outcome_bool: true,
					manipulation_action_id: actionId,
					description: "You strike {target_name}.",
				},
				{
					outcome_template_id: `${opportunityAttackId}/outcome`,
					bundle_id: BUNDLE_ID,
					display_name: "Opportunity Attack",
					outcome_bool: true,
					manipulation_action_id: opportunityAttackId,
					description: "You make an opportunity attack against {target_name}.",
				},
				{
					outcome_template_id: `${meleeActionId}/outcome`,
					bundle_id: BUNDLE_ID,
					display_name: "Melee Attack",
					outcome_bool: true,
					manipulation_action_id: meleeActionId,
					description: "You swing at {target_name}.",
				},
				{
					outcome_template_id: `${rangedActionId}/outcome`,
					bundle_id: BUNDLE_ID,
					display_name: "Ranged Attack",
					outcome_bool: true,
					manipulation_action_id: rangedActionId,
					description: "You loose a shot at {target_name}.",
				},
				{
					outcome_template_id: `${swingActionId}/outcome`,
					bundle_id: BUNDLE_ID,
					display_name: "Swing (no target)",
					outcome_bool: true,
					manipulation_action_id: swingActionId,
					description: "You swing at the empty air — nothing there to strike.",
				},
			],
		},
	};

	const fragment = await driveUnitScene(
		BUNDLE_ID,
		[
			attackCapabilityCall(),
			// sk-jay0.1.8.63.40: defined ONCE here; every other /miss consequence
			// in the package (weapon-mastery-riders, sneak-attack, Flurry, attack
			// spells) only references ATTACK_MISS_TRACE_KIND_ID by id.
			attackMissTraceKindDefinitionCall(),
			actionMissCall,
			actionCall,
			opportunityAttackMissCall,
			opportunityAttackCall,
			attackVerbNicheCall,
			meleeMissCall,
			meleeActionCall,
			rangedMissCall,
			rangedActionCall,
			swingActionCall,
			attackOutcomeObservationUpsert,
			attackParticipantDeclarations,
		],
		target,
		{ omitRowKinds: ["capability_definitions", "capability_definition_tag"] },
	);
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/attacks.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# pattern: damage-type-routing",
		"# → packages/spellkave-world-author/docs/damage-type-routing.md (+ Rage status fold; docs/authoring-damage.md)",
		"#",
		"# Concrete combat action variants. Unarmed Strike Damage is the first",
		"# ordinary Attack variant; Opportunity Attack is the first reaction",
		"# variant. srd/attack/melee and srd/attack/ranged (combat-arena proof",
		"# Slice A) are the first dice-based weapon variants. The bare",
		"# outcome_graphs/outcome_graph_nodes atomic-authoring route for",
		"# Monster Death is a confirmed, still-blocked tooling gap (finding #66)",
		"# — all FOUR templates in this file instead wire it via weapon-",
		"# attack-units.ts's monsterDeathFrameWrite (a ForEachActorInRadius",
		"# same-cell self-guard, restricted to srd.monster-tagged actors —",
		"# sk-dms.39, sk-b3m — one consequence_frame_writes row, no second verb",
		"# call). Melee/Ranged carried this from the combat-arena proof; Unarmed",
		"# Strike Damage/Opportunity Attack lacked it until sk-dms.39 (a real",
		"# monster could be beaten to 0 HP by fists and never die). See that",
		"# function's own doc comment for the mechanism and its inherited",
		"# co-location caveat.",
		`# markdown: ${ATTACKS_ANCHOR} (no open5e pk — see module header)`,
		"# mechanic decision (mechanic-shipped): First playable Attack variant",
		"# composes attackRollExpr, 5-foot creature targeting, reaction triggering",
		"# and real target HP damage; Equipment later contributes weapon variants.",
		"# actor-carried-verbs (ruling bead sk-rd0): every template above is now",
		'# provider = "actor" on niche/attack-verb — offered wherever the actor',
		"# stands, gated on the actor's own capability, never a place attachment",
		"# or a target.stat('srd/ac') doorman. Swing (no target) is the one new",
		"# template this change adds: a deliberately target-free resolution,",
		"# which is what makes it the authored untargeted execution path (D4/D9).",
		"# sk-jay0.1.8.63.40: every /miss consequence above Inscribes",
		"# srd/attack-miss at the target's place (weapon-attack-units.ts's",
		"# attackMissInscribeFrameWrite) — a miss is now a perceivable trace for",
		"# the target/bystanders, defined once here for the whole package.",
		"",
		"",
	].join("\n");
	return {
		toml: header + fragment,
		units: [
			{ kind: "trace_kind_definitions", id: ATTACK_MISS_TRACE_KIND_ID, sourcePk: "" },
			{ kind: "action_definitions", id: actionId, sourcePk: "" },
			{ kind: "consequence_templates", id: `${actionId}/success`, sourcePk: "" },
			{ kind: "consequence_templates", id: `${actionId}/miss`, sourcePk: "" },
			{ kind: "outcome_templates", id: `${actionId}/outcome`, sourcePk: "" },
			{ kind: "affordance_templates", id: `${actionId}/affordance`, sourcePk: "" },
			{ kind: "action_definitions", id: opportunityAttackId, sourcePk: "" },
			{ kind: "consequence_templates", id: `${opportunityAttackId}/success`, sourcePk: "" },
			{ kind: "consequence_templates", id: `${opportunityAttackId}/miss`, sourcePk: "" },
			{ kind: "outcome_templates", id: `${opportunityAttackId}/outcome`, sourcePk: "" },
			{ kind: "affordance_templates", id: `${opportunityAttackId}/affordance`, sourcePk: "" },
			{ kind: "niche_definitions", id: attackVerbNicheId, sourcePk: "" },
			{ kind: "action_definitions", id: meleeActionId, sourcePk: "" },
			{ kind: "consequence_templates", id: `${meleeActionId}/success`, sourcePk: "" },
			{ kind: "consequence_templates", id: `${meleeActionId}/miss`, sourcePk: "" },
			{ kind: "outcome_templates", id: `${meleeActionId}/outcome`, sourcePk: "" },
			{ kind: "affordance_templates", id: `${meleeActionId}/affordance`, sourcePk: "" },
			{ kind: "action_definitions", id: rangedActionId, sourcePk: "" },
			{ kind: "consequence_templates", id: `${rangedActionId}/success`, sourcePk: "" },
			{ kind: "consequence_templates", id: `${rangedActionId}/miss`, sourcePk: "" },
			{ kind: "outcome_templates", id: `${rangedActionId}/outcome`, sourcePk: "" },
			{ kind: "affordance_templates", id: `${rangedActionId}/affordance`, sourcePk: "" },
			{ kind: "action_definitions", id: swingActionId, sourcePk: "" },
			{ kind: "consequence_templates", id: `${swingActionId}/success`, sourcePk: "" },
			{ kind: "outcome_templates", id: `${swingActionId}/outcome`, sourcePk: "" },
			{ kind: "affordance_templates", id: `${swingActionId}/affordance`, sourcePk: "" },
			{
				kind: "affordance_template_participants",
				id: `${meleeActionId}/affordance::${BUNDLE_ID}/instrument`,
				sourcePk: "",
			},
			{
				kind: "affordance_template_participants",
				id: `${rangedActionId}/affordance::${BUNDLE_ID}/instrument`,
				sourcePk: "",
			},
			{
				kind: "affordance_template_participants",
				id: `${opportunityAttackId}/affordance::${BUNDLE_ID}/instrument`,
				sourcePk: "",
			},
			{
				kind: "affordance_template_participants",
				id: `${swingActionId}/affordance::${BUNDLE_ID}/instrument`,
				sourcePk: "",
			},
		],
	};
}
