// Spells chapter — behaviours through level 2 on the eight class lists.
// Data-driven: one generator table per SHAPE (spell-behavior-catalog.ts),
// never one function per spell. Design:
// bead sk-609b.6 (design trail).
//
// PROVEN SHAPES (composition cited per builder):
//   - attack-roll damage — monsters/starter-behaviors.ts singleAttackCalls
//   - save-half / save-negate single — proof-scene pressure-plate-save +
//     saving-throw-units.ts saveHalvesExpr
//   - multi-instance — monsters/starter-behaviors.ts multiattackCalls
//   - simple heal — unconditional positive ModifyResource
//   - save-half/negate AoE — ForEachActorInRadius + per-actor save folded
//     into delta_source (world-author aoe-damage-spell + cloudkill pulse)
//   - target/self AC buff — ApplyStatus + condition modifier on srd/ac
//     (cover-units / help.ts target-grant precedent)
//   - condition_roll_mod — ApplyStatus + Plus modifier on resolution scopes
//     (pattern: condition-grant-and-suppression; bless/bane/guidance)
//   - temp_hp — take-higher ModifyResource on srd/temp_hp (temp-hp-units)
//   - save_negate_condition — Stochastic save + ApplyStatus
//   - lingering_damage_zone — ScheduleAutonomyJob pulse (pattern: lingering-hazard-zone)
//   - env_zone — Inscribe spatial_environment_state marker
//   - summon — EffectPrimitive Spawn (find-familiar precedent)
//   - mark_condition / remove_condition — ApplyStatus / RemoveCondition
//
// DAMAGE ROUTING (BL-57): every damaging write uses routeDamage /
// routeDamageMagnitude from @spellkave/tool-authoring so immunity /
// resistance / vulnerability tags actually matter.
// pattern: damage-type-routing
//
// DERIVED SAVE DC / SPELL ATTACK (L12d):
// pattern: derived-value-mechanism
//   spell attack = actor.stat(srd/proficiency_bonus) + macro(srd/spellcasting_modifier)
//   spell save DC = 8 + PB + class-derived spellcasting modifier (live on single-target
//   Stochastic gates where actor is the caster). AoE per-victim delta bodies
//   rebind Actor to the victim — there the DC falls back to the computed
//   literal 8+2+3 (=13) matching default proof-caster seeds (see
//   aoeSpellSaveDcLiteral). Non-class casters seed spellcasting_mod; classed
//   heroes derive it from their effective spellcasting ability score.
//
// UPCAST (L12d):
// pattern: computed-literal
//   When plan.upcast and SpellCastingOption has a slot_level_2 row, emit a
//   sibling action debited from spell_slot_2 with dice/instance count from
//   the option table (base action keeps plan.cost / base dice).
import { type AuthorTarget, routeDamage } from "@spellkave/tool-authoring";

import { readSpells } from "../../open5e/spell";
import { castingOptionsBySlot } from "../../open5e/spell-casting-option";
import { identityLine } from "../../text/identity-line.ts";
import type { ChapterUnitSummary } from "../chapter-types";
import {
	LONG_REST_BOUNDARY_ID,
	PRIMARY_CHANNEL_ID,
} from "../playing-the-game/action-economy-units";
import { AC_RESOURCE_ID } from "../playing-the-game/armor-class-units";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../playing-the-game/cover-units";
import { damageRollExpr } from "../playing-the-game/damage-units";
import { characterUnconsciousFrameWrite } from "../playing-the-game/death-saves-units";
import { SPEED_WALK_RESOURCE_ID } from "../playing-the-game/fragments/grid";
import { speedWalkModifierTargetRow } from "../playing-the-game/grid-units";
import { cappedHealingExpr } from "../playing-the-game/healing-units";
import { HP_ID } from "../playing-the-game/hp-units";
import { PROFICIENCY_BONUS_STATE_ID } from "../playing-the-game/modifier-units";
import {
	ABILITY_CHECK_RESOLUTION_SCOPE_ID,
	ATTACK_ROLL_RESOLUTION_SCOPE_ID,
	DEX_SAVE_RESOLUTION_SCOPE_ID,
	resolutionScopeModifierTargetRow,
} from "../playing-the-game/resolution-scope-units";
import { ROLL_BIAS_ADVANTAGE_TAG } from "../playing-the-game/tag-value-vocabulary";
import { TEMP_HP_ID, temporaryHpGainExpr } from "../playing-the-game/temp-hp-units";
import {
	ATTACK_VERB_NICHE_LOCAL_ID,
	attackMissInscribeFrameWrite,
	monsterDeathFrameWrite,
} from "../playing-the-game/weapon-attack-units";
import { driveUnitScene, type VerbCall } from "../verb-runner";
import {
	applyConcentratingWrite,
	CONCENTRATING_CONDITION_ID,
	CONCENTRATION_CHECK_TEMPLATE_ID,
	concentrationEffectEndCalls,
	concentrationEffectEndHook,
} from "./concentration";
import {
	type AoeShape,
	EXPRESSIBLE_SPELL_PLANS,
	type SpellBehaviorPlan,
	spellBehaviorPlanBySlug,
} from "./spell-behavior-catalog";
import {
	type SpellSlotLevel,
	spellSlotDebitFrameWrite,
	spellSlotGateExpr,
	spellSlotResourceCall,
} from "./spell-slots";
import { BUNDLE_ID } from "./spell-units";

const HP_STATE_ID = `${BUNDLE_ID}/${HP_ID}`;
const TEMP_HP_STATE_ID = `${BUNDLE_ID}/${TEMP_HP_ID}`;
const CAST_ACTION_CAPABILITY_ID = `${BUNDLE_ID}/action/magic`;
const ATTACK_VERB_NICHE_ID = `${BUNDLE_ID}/${ATTACK_VERB_NICHE_LOCAL_ID}`;

/** Generic-caster spellcasting ability modifier seed (proof + default content). */
export const SPELLCASTING_MOD_ID = "spellcasting_mod";
export const SPELLCASTING_MOD_STATE_ID = `${BUNDLE_ID}/${SPELLCASTING_MOD_ID}`;
/** Default seeds so 8 + PB(2) + mod(3) = 13 matches the historical baked DC. */
export const DEFAULT_SPELLCASTING_MOD = 3;
export const DEFAULT_PROFICIENCY_BONUS = 2;

const ft = (feet: number): number => Math.round(feet * 0.3048 * 1000) / 1000;

function localSpellId(slug: string, suffix = "cast"): string {
	return `spell/${slug}/${suffix}`;
}

function fullSpellActionId(slug: string, suffix = "cast"): string {
	return `${BUNDLE_ID}/${localSpellId(slug, suffix)}`;
}

export interface SpellBehaviorResult {
	slug: string;
	displayName: string;
	calls: VerbCall[];
	actionId: string;
	precedent: string;
	cost?: { level: SpellSlotLevel };
	/** Documentary damage type for entity tag stamping (BL-57). */
	damageType?: string;
	shape: string;
}

interface SlotCost {
	level: SpellSlotLevel;
}

function slotCostOf(plan: SpellBehaviorPlan): SlotCost | undefined {
	return plan.cost === undefined ? undefined : { level: plan.cost };
}

function offerPredicateSource(cost: SlotCost | undefined): string | undefined {
	return cost === undefined ? undefined : spellSlotGateExpr(cost.level);
}

function slotDebitWrites(cost: SlotCost | undefined): Record<string, unknown>[] {
	return cost === undefined ? [] : [spellSlotDebitFrameWrite(cost.level)];
}

function magnitudeExpr(diceExpr: string): string {
	return damageRollExpr({ diceExpr });
}

// pattern: derived-value-mechanism
/** Live spell attack bonus: PB + spellcasting mod (macros illegal in delta_source — stats OK). */
export function spellAttackBonusExpr(subject = "actor"): string {
	return (
		`${subject}.stat('${PROFICIENCY_BONUS_STATE_ID}') + ` + "macro('srd/spellcasting_modifier')"
	);
}

// pattern: derived-value-mechanism
/** Live spell save DC = 8 + PB + spellcasting mod (single-target Stochastic, actor = caster). */
export function spellSaveDcExpr(subject = "actor"): string {
	return (
		`8 + ${subject}.stat('${PROFICIENCY_BONUS_STATE_ID}') + ` + "macro('srd/spellcasting_modifier')"
	);
}

/**
 * AoE body rebinds Actor to each victim — caster stats are unavailable.
 * Emit the computed literal matching default caster seeds (8+2+3=13).
 * // pattern: computed-literal
 */
export function aoeSpellSaveDcLiteral(): string {
	return String(8 + DEFAULT_PROFICIENCY_BONUS + DEFAULT_SPELLCASTING_MOD);
}

/** Target save bonus — still baked (+2) until per-ability save mods are seeded on all targets. */
const BAKED_TARGET_SAVE_BONUS = 2;

/** Single-target damage delta: routed + negated (BL-57). */
function routedDamageDelta(
	diceExpr: string,
	damageType: string,
	subject: "actor" | "target" = "target",
): string {
	return routeDamage(magnitudeExpr(diceExpr), damageType, { subject });
}

/** Defense ladder over an already-bound positive magnitude variable (no leading let). */
function defenseLadder(
	variableName: string,
	damageType: string,
	subject: "actor" | "target",
): string {
	return (
		`cond(${subject}.has_tag('damage_immune:${damageType}'), 0, ` +
		`cond(${subject}.has_tag('damage_resist:${damageType}'), ${variableName} / 2, ` +
		`cond(${subject}.has_tag('damage_vulnerable:${damageType}'), ${variableName} * 2, ${variableName})))`
	);
}

/**
 * Save-then-route damage delta for one actor. Roll once, apply save (half or
 * negate), then the defense ladder on `subject` (use `actor` inside
 * ForEachActorInRadius bodies). Flat sequential lets — no nested let groups.
 * // pattern: derived-value-mechanism — DC is aoeSpellSaveDcLiteral in AoE bodies.
 */
function saveRoutedDamageDelta(options: {
	diceExpr: string;
	damageType: string;
	half: boolean;
	subject?: "actor" | "target";
	/** When true, use live caster DC (subject must be caster — single-target only). */
	liveDc?: boolean;
}): string {
	const subject = options.subject ?? "target";
	const dc = options.liveDc === true ? spellSaveDcExpr("actor") : aoeSpellSaveDcLiteral();
	const saveOk = `d20 + ${BAKED_TARGET_SAVE_BONUS} >= ${dc}`;
	const postSave = options.half ? `cond(${saveOk}, dmg / 2, dmg)` : `cond(${saveOk}, 0, dmg)`;
	return (
		`let dmg = ${magnitudeExpr(options.diceExpr)}; let post = ${postSave}; ` +
		`let routed = ${defenseLadder("post", options.damageType, subject)}; 0 - routed`
	);
}

/** Success-branch half damage for Stochastic save-half (fresh roll, then half, then route). */
function halfRoutedDamageDelta(
	diceExpr: string,
	damageType: string,
	subject: "actor" | "target" = "target",
): string {
	return (
		`let dmg = ${magnitudeExpr(diceExpr)}; let half = dmg / 2; ` +
		`let routed = ${defenseLadder("half", damageType, subject)}; 0 - routed`
	);
}

function resolutionScopeForSave(ability: string | undefined): Record<string, unknown> {
	return ability === "dexterity" ? { resolution_scope: DEX_SAVE_RESOLUTION_SCOPE_ID } : {};
}

function scopeIdForRollMod(scope: "attack_roll" | "ability_check" | "dex_save"): string {
	switch (scope) {
		case "attack_roll":
			return ATTACK_ROLL_RESOLUTION_SCOPE_ID;
		case "ability_check":
			return ABILITY_CHECK_RESOLUTION_SCOPE_ID;
		case "dex_save":
			return DEX_SAVE_RESOLUTION_SCOPE_ID;
	}
}

function aoeShapeParams(aoe: AoeShape): {
	shape_id: string;
	shape_params_json: string;
	rangeFeet: number;
} {
	switch (aoe.kind) {
		case "cone":
			return {
				shape_id: "core/area/cone",
				shape_params_json: JSON.stringify({
					half_angle_deg: aoe.halfAngleDeg,
					range_m: ft(aoe.rangeFeet),
				}),
				rangeFeet: aoe.rangeFeet,
			};
		case "sphere":
			return {
				shape_id: "core/area/sphere",
				shape_params_json: JSON.stringify({ radius_m: ft(aoe.radiusFeet) }),
				rangeFeet: aoe.radiusFeet,
			};
		case "cube":
			return {
				shape_id: "core/area/cube",
				shape_params_json: JSON.stringify({ extent_m: ft(aoe.extentFeet) / 2 }),
				rangeFeet: aoe.extentFeet,
			};
	}
}

function stackingIds(): { stackingId: string; removePolicyId: string } {
	return {
		stackingId: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
		removePolicyId: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
	};
}

// ── Shape: attack-roll damage ────────────────────────────────────────────

function attackRollDamageBehavior(
	plan: SpellBehaviorPlan,
	options?: { dice?: string; cost?: SlotCost; actionSuffix?: string },
): SpellBehaviorResult {
	const dice = options?.dice ?? plan.dice ?? "1d6";
	const damageType = plan.damageType ?? "force";
	const rangeFeet = plan.rangeFeet ?? 30;
	const cost = options?.cost ?? slotCostOf(plan);
	const suffix = options?.actionSuffix ?? "cast";
	const actionId = fullSpellActionId(plan.slug, suffix);
	const attackBonus = spellAttackBonusExpr("actor");
	// Matches actionCall's own display_name below verbatim — the attacker's
	// own act result and this miss trace's label name the same cast.
	const castDisplayName = `Cast ${plan.name}${suffix === "cast" ? "" : " (higher slot)"}`;
	const missCall: VerbCall = {
		toolName: "spellkave_define_consequence",
		label: `${actionId}/miss`,
		params: {
			bundle: BUNDLE_ID,
			id: `${localSpellId(plan.slug, suffix)}/miss`,
			description: `${plan.name} miss: no damage is dealt.`,
			// sk-jay0.1.8.63.40: a miss is a perceivable trace for the target,
			// not silence — weapon-attack-units.ts's attackMissInscribeFrameWrite.
			frame_writes: [attackMissInscribeFrameWrite(`${castDisplayName} misses`)],
		},
	};
	const hitWrites: Record<string, unknown>[] = [
		{
			ModifyResource: {
				actor: "TargetActor",
				resource: HP_STATE_ID,
				delta_source: routedDamageDelta(dice, damageType, "target"),
			},
		},
	];
	// Optional on-hit condition (ensnaring-strike class) — pattern: condition-grant-and-suppression
	const onHitCalls: VerbCall[] = [];
	if (plan.conditionLocalId !== undefined && suffix === "cast") {
		const conditionId = `${BUNDLE_ID}/${plan.conditionLocalId}`;
		const { stackingId, removePolicyId } = stackingIds();
		onHitCalls.push({
			toolName: "spellkave_write_rows",
			label: `${actionId}/channel-target`,
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [
					{
						target_id: PRIMARY_CHANNEL_ID,
						shape: "Numeric",
						display_name: "Action economy: primary channel",
						bundle_id: BUNDLE_ID,
					},
				],
			},
		});
		onHitCalls.push({
			toolName: "spellkave_define_condition",
			label: `${actionId}/on-hit-condition`,
			params: {
				bundle: BUNDLE_ID,
				id: plan.conditionLocalId,
				display_name: `${plan.name} (ensnared)`,
				gate_predicate_source: "1 == 1",
				description: identityLine(plan.name, "spell condition"),
				remove_time_policy: removePolicyId,
				stacking_rule: stackingId,
				modifiers: [
					{
						id: `${plan.conditionLocalId}/no-action`,
						display_name: `${plan.name}: zero primary channel`,
						applies_to: PRIMARY_CHANNEL_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "FlatSet",
					},
				],
			},
		});
		hitWrites.push({
			ApplyStatus: {
				target_kind: "entity",
				target_ref: "TargetActor",
				condition_definition_id: conditionId,
			},
		});
	}
	hitWrites.push(...slotDebitWrites(cost));

	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: actionId,
		params: {
			bundle: BUNDLE_ID,
			id: localSpellId(plan.slug, suffix),
			required_capability: CAST_ACTION_CAPABILITY_ID,
			niche_id: ATTACK_VERB_NICHE_ID,
			display_name: castDisplayName,
			description: identityLine(plan.name, "spell action"),
			// pattern: derived-value-mechanism
			resolution_scope: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
			predicate_source: offerPredicateSource(cost),
			resolution_mode: "Stochastic",
			resolution_predicate_source: `d20 + ${attackBonus} >= target.effective('${AC_RESOURCE_ID}')`,
			on_failure: `${actionId}/miss`,
			range_m: ft(rangeFeet),
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			consequence: {
				description: `${plan.name} hit: subtract routed ${dice} ${damageType} from the target's Hit Points.`,
				frame_writes: hitWrites,
			},
		},
	};
	return {
		slug: plan.slug,
		displayName: plan.name,
		calls: [...onHitCalls, missCall, actionCall],
		actionId,
		cost,
		damageType,
		shape: plan.shape,
		precedent:
			plan.conditionLocalId !== undefined
				? "Attack-roll damage + on-hit ApplyStatus; pattern: derived-value-mechanism + condition-grant-and-suppression"
				: "Attack-roll damage — derived spell attack (PB+mod) + routeDamage (BL-57); pattern: derived-value-mechanism",
	};
}

// ── Shape: save damage single (half or negate) ───────────────────────────

function saveDamageSingleBehavior(
	plan: SpellBehaviorPlan,
	options?: { dice?: string; cost?: SlotCost; actionSuffix?: string },
): SpellBehaviorResult {
	const dice = options?.dice ?? plan.dice ?? "1d6";
	const damageType = plan.damageType ?? "force";
	const half = plan.half === true;
	const rangeFeet = plan.rangeFeet ?? 30;
	const cost = options?.cost ?? slotCostOf(plan);
	const suffix = options?.actionSuffix ?? "cast";
	const actionId = fullSpellActionId(plan.slug, suffix);
	const ability = plan.saveAbility ?? "dexterity";
	const fullDelta = routedDamageDelta(dice, damageType, "target");
	const dcExpr = spellSaveDcExpr("actor");

	const failureCall: VerbCall = {
		toolName: "spellkave_define_consequence",
		label: `${actionId}/failure`,
		params: {
			bundle: BUNDLE_ID,
			id: `${localSpellId(plan.slug, suffix)}/failure`,
			description: `${plan.name}: failed save, full routed damage.`,
			frame_writes: [
				{
					ModifyResource: {
						actor: "TargetActor",
						resource: HP_STATE_ID,
						delta_source: fullDelta,
					},
				},
			],
		},
	};

	const successWrites = half
		? [
				{
					ModifyResource: {
						actor: "TargetActor",
						resource: HP_STATE_ID,
						delta_source: halfRoutedDamageDelta(dice, damageType, "target"),
					},
				},
			]
		: [];

	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: actionId,
		params: {
			bundle: BUNDLE_ID,
			id: localSpellId(plan.slug, suffix),
			required_capability: CAST_ACTION_CAPABILITY_ID,
			niche_id: ATTACK_VERB_NICHE_ID,
			display_name: `Cast ${plan.name}${suffix === "cast" ? "" : " (higher slot)"}`,
			description: identityLine(plan.name, "spell action"),
			// pattern: derived-value-mechanism
			...resolutionScopeForSave(ability),
			predicate_source: offerPredicateSource(cost),
			resolution_mode: "Stochastic",
			resolution_predicate_source: `d20 + ${BAKED_TARGET_SAVE_BONUS} >= ${dcExpr}`,
			on_failure: `${actionId}/failure`,
			range_m: ft(rangeFeet),
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			consequence: {
				description: half
					? `${plan.name}: successful save, half routed damage.`
					: `${plan.name}: successful save, no damage.`,
				frame_writes: [...successWrites, ...slotDebitWrites(cost)],
			},
		},
	};
	return {
		slug: plan.slug,
		displayName: plan.name,
		calls: [failureCall, actionCall],
		actionId,
		cost,
		damageType,
		shape: plan.shape,
		precedent: half
			? "Save-half damage — derived DC (8+PB+mod) + routeDamage (BL-57); pattern: derived-value-mechanism"
			: "Save-negate damage — derived DC (8+PB+mod) + routeDamage (BL-57); pattern: derived-value-mechanism",
	};
}

// ── Shape: multi-instance ────────────────────────────────────────────────

function multiInstanceBehavior(
	plan: SpellBehaviorPlan,
	options?: { instances?: SpellBehaviorPlan["instances"]; cost?: SlotCost; actionSuffix?: string },
): SpellBehaviorResult {
	const instances = options?.instances ?? plan.instances ?? [];
	const rangeFeet = plan.rangeFeet ?? 120;
	const cost = options?.cost ?? slotCostOf(plan);
	if (cost === undefined) {
		throw new Error(`spell-behaviors: multi-instance '${plan.slug}' requires a slot cost.`);
	}
	const suffix = options?.actionSuffix ?? "cast";
	const actionId = fullSpellActionId(plan.slug, suffix);
	const autoHit = instances.every((instance) => !instance.toHit);
	const attackBonus = spellAttackBonusExpr("actor");
	const ordinalWrites = instances.map((instance, index) => {
		const damageExpr = routedDamageDelta(instance.dice, instance.type, "target");
		if (!instance.toHit) {
			return {
				ModifyResource: { actor: "TargetActor", resource: HP_STATE_ID, delta_source: damageExpr },
			};
		}
		const rollVar = `ray_${index}_roll`;
		const hitExpr = `${rollVar} + ${attackBonus} >= target.effective('${AC_RESOURCE_ID}')`;
		return {
			ModifyResource: {
				actor: "TargetActor",
				resource: HP_STATE_ID,
				delta_source:
					`let ${rollVar} = d20; let dmg = ${magnitudeExpr(instance.dice)}; ` +
					`let routed = ${defenseLadder("dmg", instance.type, "target")}; ` +
					`cond(${hitExpr}, 0 - routed, 0)`,
			},
		};
	});
	const instanceSummary = instances
		.map(
			(instance, index) =>
				`#${index + 1} (${instance.toHit ? "to-hit PB+mod" : "auto-hit"}, ${instance.dice} ${instance.type})`,
		)
		.join("; ");
	const primaryType = instances[0]?.type;
	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: actionId,
		params: {
			bundle: BUNDLE_ID,
			id: localSpellId(plan.slug, suffix),
			required_capability: CAST_ACTION_CAPABILITY_ID,
			niche_id: ATTACK_VERB_NICHE_ID,
			display_name: `Cast ${plan.name}${suffix === "cast" ? "" : " (higher slot)"}`,
			description: identityLine(plan.name, "spell action"),
			predicate_source: offerPredicateSource(cost),
			range_m: ft(rangeFeet),
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			consequence: {
				description: `${plan.name}: ${instanceSummary}.`,
				frame_writes: [...ordinalWrites, ...slotDebitWrites(cost)],
			},
		},
	};
	return {
		slug: plan.slug,
		displayName: plan.name,
		calls: [actionCall],
		actionId,
		cost,
		damageType: primaryType,
		shape: plan.shape,
		precedent: autoHit
			? "Auto-hit multi-instance — multiattackCalls + routeDamage (BL-57)"
			: "Attack-roll multi-instance — derived spell attack + multiattackCalls + routeDamage (BL-57)",
	};
}

// ── Shape: simple heal ───────────────────────────────────────────────────

function simpleHealBehavior(
	plan: SpellBehaviorPlan,
	options?: { dice?: string; cost?: SlotCost; actionSuffix?: string },
): SpellBehaviorResult {
	const dice = options?.dice ?? plan.dice ?? "1d8";
	const rangeFeet = plan.rangeFeet ?? 30;
	const cost = options?.cost ?? slotCostOf(plan);
	const suffix = options?.actionSuffix ?? "cast";
	const actionId = fullSpellActionId(plan.slug, suffix);
	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: actionId,
		params: {
			bundle: BUNDLE_ID,
			id: localSpellId(plan.slug, suffix),
			required_capability: CAST_ACTION_CAPABILITY_ID,
			niche_id: ATTACK_VERB_NICHE_ID,
			display_name: `Cast ${plan.name}${suffix === "cast" ? "" : " (higher slot)"}`,
			description: identityLine(plan.name, "spell action"),
			predicate_source: offerPredicateSource(cost),
			range_m: ft(rangeFeet),
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			consequence: {
				description:
					`${plan.name}: heal ${dice} Hit Points.` +
					(plan.slug === "cure-wounds"
						? " Disciple of Life (+3) when caster holds srd/class-feature/cleric/life-domain/disciple-of-life (BL-64)."
						: ""),
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							resource: HP_STATE_ID,
							// BL-64 / L12c: Disciple of Life rider on Cure Wounds (2 + L1 slot = +3).
							delta_source:
								plan.slug === "cure-wounds"
									? `${magnitudeExpr(dice)} + cond(actor.has_capability('srd/class-feature/cleric/life-domain/disciple-of-life'), 3, 0)`
									: magnitudeExpr(dice),
						},
					},
					...slotDebitWrites(cost),
				],
			},
		},
	};
	return {
		slug: plan.slug,
		displayName: plan.name,
		calls: [actionCall],
		actionId,
		cost,
		shape: plan.shape,
		precedent: "Simple heal — unconditional positive ModifyResource",
	};
}

// ── Shape: save AoE (half or negate) — BL-14 ─────────────────────────────

function saveAoeBehavior(
	plan: SpellBehaviorPlan,
	options?: { dice?: string; cost?: SlotCost; actionSuffix?: string },
): SpellBehaviorResult {
	const dice = options?.dice ?? plan.dice ?? "1d6";
	const damageType = plan.damageType ?? "force";
	const half = plan.half === true;
	const cost = options?.cost ?? slotCostOf(plan);
	const suffix = options?.actionSuffix ?? "cast";
	const actionId = fullSpellActionId(plan.slug, suffix);
	const ability = plan.saveAbility ?? "dexterity";
	if (plan.aoe === undefined) {
		throw new Error(`spell-behaviors: AoE plan '${plan.slug}' missing aoe.`);
	}
	const shape = aoeShapeParams(plan.aoe);
	const centerSelf = plan.center !== "target";
	const center_ref = centerSelf ? "ActorSpatialRef" : "TargetSpatialRef";
	const offerRangeFeet = centerSelf ? shape.rangeFeet : (plan.rangeFeet ?? 60);

	const perActorDelta = saveRoutedDamageDelta({
		diceExpr: dice,
		damageType,
		half,
		subject: "actor",
		liveDc: false,
	});

	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: actionId,
		params: {
			bundle: BUNDLE_ID,
			id: localSpellId(plan.slug, suffix),
			required_capability: CAST_ACTION_CAPABILITY_ID,
			niche_id: ATTACK_VERB_NICHE_ID,
			display_name: `Cast ${plan.name}${suffix === "cast" ? "" : " (higher slot)"}`,
			description: identityLine(plan.name, "spell action"),
			// pattern: derived-value-mechanism / computed-literal
			...resolutionScopeForSave(ability),
			predicate_source: offerPredicateSource(cost),
			range_m: ft(offerRangeFeet),
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			consequence: {
				description: `${plan.name}: fan routed ${half ? "save-half" : "save-negate"} damage over the area.`,
				frame_writes: [
					{
						ForEachActorInRadius: {
							center_ref,
							shape_id: shape.shape_id,
							shape_params_json: shape.shape_params_json,
							predicate_source: "",
							body: [
								{
									ModifyResource: {
										actor: "Actor",
										resource: HP_STATE_ID,
										delta_source: perActorDelta,
									},
								},
							],
						},
					},
					...slotDebitWrites(cost),
				],
			},
		},
	};
	return {
		slug: plan.slug,
		displayName: plan.name,
		calls: [actionCall],
		actionId,
		cost,
		damageType,
		shape: plan.shape,
		precedent:
			"Save AoE — ForEachActorInRadius + per-actor save-route; AoE DC computed-literal (pattern: computed-literal)",
	};
}

// ── Shape: target / self AC buff — BL-15 ─────────────────────────────────

function acBuffBehavior(plan: SpellBehaviorPlan): SpellBehaviorResult {
	const bonus = plan.acBonus ?? 2;
	const cost = slotCostOf(plan);
	const selfOnly = plan.shape === "self_ac_buff";
	const rangeFeet = selfOnly ? 5 : (plan.rangeFeet ?? 60);
	const actionId = fullSpellActionId(plan.slug);
	const conditionLocalId = `condition/spell/${plan.slug}`;
	const conditionId = `${BUNDLE_ID}/${conditionLocalId}`;
	const modifierLocalId = `${conditionLocalId}/ac_bonus`;
	const { stackingId, removePolicyId } = stackingIds();

	// Stacking / remove-policy / AC modifier-target vocabulary already ships from
	// playing-the-game (cover + armor-class). Reference by id — never re-emit
	// (MF-VAL-272). Isolated generation resolves them via `target` (committed fixtures).
	const concentrationHooks = plan.concentration
		? [concentrationEffectEndHook(plan.slug)]
		: undefined;
	const calls: VerbCall[] = [
		...(plan.concentration ? concentrationEffectEndCalls(plan.slug, conditionId) : []),
		{
			toolName: "spellkave_define_condition",
			label: `${actionId}/condition`,
			params: {
				bundle: BUNDLE_ID,
				id: conditionLocalId,
				display_name: plan.name,
				gate_predicate_source: "1 == 1",
				description: identityLine(plan.name, "spell condition"),
				remove_time_policy: removePolicyId,
				stacking_rule: stackingId,
				...(concentrationHooks === undefined ? {} : { hooks: concentrationHooks }),
				modifiers: [
					{
						id: modifierLocalId,
						display_name: `${plan.name} AC +${bonus}`,
						applies_to: AC_RESOURCE_ID,
						predicate_source: "",
						modifier_expression_source: `let bonus = ${bonus}; bonus`,
						delta_kind: "Plus",
						priority: 0,
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: actionId,
			params: {
				bundle: BUNDLE_ID,
				id: localSpellId(plan.slug),
				required_capability: CAST_ACTION_CAPABILITY_ID,
				niche_id: ATTACK_VERB_NICHE_ID,
				display_name: `Cast ${plan.name}`,
				description: identityLine(plan.name, "spell action"),
				predicate_source: offerPredicateSource(cost),
				range_m: ft(rangeFeet),
				self_eligible: true,
				self_only: selfOnly,
				accepts_global_storm: true,
				cost_time_ms: 0,
				spends_channel: PRIMARY_CHANNEL_ID,
				consequence: {
					description: `${plan.name}: apply ${conditionId} (+${bonus} AC).`,
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: selfOnly ? "Actor" : "TargetActor",
								condition_definition_id: conditionId,
							},
						},
						// pattern: condition-hook-on-event — caster begins concentrating
						...(plan.concentration ? [applyConcentratingWrite()] : []),
						...slotDebitWrites(cost),
					],
				},
			},
		},
	];

	return {
		slug: plan.slug,
		displayName: plan.name,
		calls,
		actionId,
		cost,
		shape: plan.shape,
		precedent: selfOnly
			? "Self AC buff — ApplyStatus + srd/ac modifier (cover-units shape, self target)"
			: "Target AC buff — ApplyStatus on TargetActor + srd/ac modifier (BL-15; help.ts / cover-units)",
	};
}

// ── Shape: condition_roll_mod (bless / bane / guidance / resistance) ─────
// pattern: condition-grant-and-suppression

function conditionRollModBehavior(plan: SpellBehaviorPlan): SpellBehaviorResult {
	const cost = slotCostOf(plan);
	const rangeFeet = plan.rangeFeet ?? 30;
	const actionId = fullSpellActionId(plan.slug);
	const conditionLocalId = plan.conditionLocalId ?? `condition/spell/${plan.slug}`;
	const conditionId = `${BUNDLE_ID}/${conditionLocalId}`;
	const scopes = plan.rollModScopes ?? ["attack_roll"];
	const modExpr = plan.rollModExpr ?? "1d4";
	const { stackingId, removePolicyId } = stackingIds();

	const scopeTargetRows = scopes.map((scope) =>
		resolutionScopeModifierTargetRow(scopeIdForRollMod(scope)),
	);
	const useAdv = plan.rollAdvantage === true;
	const modifiers = scopes.map((scope, index) => ({
		id: `${conditionLocalId}/mod_${scope}`,
		display_name: `${plan.name} ${scope} ${useAdv ? "Advantage" : modExpr}`,
		applies_to: scopeIdForRollMod(scope),
		predicate_source: "",
		modifier_expression_source: useAdv ? "let unused = 0; unused" : `let bonus = ${modExpr}; bonus`,
		delta_kind: (useAdv ? "Advantage" : "Plus") as "Advantage" | "Plus",
		priority: index,
		...(useAdv ? { tags: [ROLL_BIAS_ADVANTAGE_TAG] } : {}),
	}));

	const calls: VerbCall[] = [
		{
			toolName: "spellkave_write_rows",
			label: `${actionId}/modifier-targets`,
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: scopeTargetRows,
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: `${actionId}/condition`,
			params: {
				bundle: BUNDLE_ID,
				id: conditionLocalId,
				display_name: plan.name,
				// pattern: condition-grant-and-suppression
				gate_predicate_source: "1 == 1",
				description: identityLine(plan.name, "spell condition"),
				remove_time_policy: removePolicyId,
				stacking_rule: stackingId,
				// When multiple modifiers, pin FK to the first (verb requires explicit id).
				modifier_template_id: modifiers.length > 1 ? `${BUNDLE_ID}/${modifiers[0]?.id}` : undefined,
				modifiers,
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: actionId,
			params: {
				bundle: BUNDLE_ID,
				id: localSpellId(plan.slug),
				required_capability: CAST_ACTION_CAPABILITY_ID,
				niche_id: ATTACK_VERB_NICHE_ID,
				display_name: `Cast ${plan.name}`,
				description: identityLine(plan.name, "spell action"),
				predicate_source: offerPredicateSource(cost),
				range_m: ft(rangeFeet),
				self_eligible: true,
				self_only: plan.selfOnly === true,
				accepts_global_storm: true,
				cost_time_ms: 0,
				spends_channel: PRIMARY_CHANNEL_ID,
				consequence: {
					description: `${plan.name}: apply ${conditionId}.`,
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: plan.selfOnly === true ? "Actor" : "TargetActor",
								condition_definition_id: conditionId,
								...(plan.endsAtCasterLongRest === true
									? {
											expires_at_boundary: {
												boundary_id: LONG_REST_BOUNDARY_ID,
												owner_actor: "Actor",
											},
										}
									: {}),
							},
						},
						...slotDebitWrites(cost),
					],
				},
			},
		},
	];

	return {
		slug: plan.slug,
		displayName: plan.name,
		calls,
		actionId,
		cost,
		shape: plan.shape,
		precedent:
			"Condition roll mod — ApplyStatus + Plus/Advantage modifier on resolution scopes; pattern: condition-grant-and-suppression",
	};
}

// ── Shape: temp_hp ───────────────────────────────────────────────────────

function tempHpBehavior(
	plan: SpellBehaviorPlan,
	options?: { tempHpExpr?: string; cost?: SlotCost; actionSuffix?: string },
): SpellBehaviorResult {
	const grant = options?.tempHpExpr ?? plan.tempHpExpr ?? "1d4 + 4";
	const cost = options?.cost ?? slotCostOf(plan);
	const rangeFeet = plan.rangeFeet ?? 5;
	const suffix = options?.actionSuffix ?? "cast";
	const actionId = fullSpellActionId(plan.slug, suffix);
	const delta = temporaryHpGainExpr(magnitudeExpr(grant), `actor.stat('${TEMP_HP_STATE_ID}')`);
	// TargetActor write: read target's current temp HP.
	const targetDelta = temporaryHpGainExpr(
		magnitudeExpr(grant),
		`target.stat('${TEMP_HP_STATE_ID}')`,
	);

	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: actionId,
		params: {
			bundle: BUNDLE_ID,
			id: localSpellId(plan.slug, suffix),
			required_capability: CAST_ACTION_CAPABILITY_ID,
			niche_id: ATTACK_VERB_NICHE_ID,
			display_name: `Cast ${plan.name}${suffix === "cast" ? "" : " (higher slot)"}`,
			description: identityLine(plan.name, "spell action"),
			predicate_source: offerPredicateSource(cost),
			range_m: ft(rangeFeet),
			self_eligible: true,
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			consequence: {
				description: `${plan.name}: take-higher temp HP grant ${grant}.`,
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							resource: TEMP_HP_STATE_ID,
							delta_source: targetDelta,
						},
					},
					...slotDebitWrites(cost),
				],
			},
		},
	};
	void delta;
	return {
		slug: plan.slug,
		displayName: plan.name,
		calls: [actionCall],
		actionId,
		cost,
		shape: plan.shape,
		precedent: "Temp HP grant — temporaryHpGainExpr take-higher on srd/temp_hp",
	};
}

// ── Shape: save_negate_condition ─────────────────────────────────────────

function saveNegateConditionBehavior(plan: SpellBehaviorPlan): SpellBehaviorResult {
	const cost = slotCostOf(plan);
	const rangeFeet = plan.rangeFeet ?? 30;
	const actionId = fullSpellActionId(plan.slug);
	const ability = plan.saveAbility ?? "wisdom";
	const { stackingId, removePolicyId } = stackingIds();
	const dcExpr = spellSaveDcExpr("actor");

	const calls: VerbCall[] = [];
	let conditionId = plan.conditionId;
	if (conditionId === undefined) {
		const localId = plan.conditionLocalId ?? `condition/spell/${plan.slug}`;
		conditionId = `${BUNDLE_ID}/${localId}`;
		const zeroPrimary =
			plan.slug === "hold-person" ||
			plan.slug === "hideous-laughter" ||
			plan.slug === "command" ||
			plan.slug === "suggestion" ||
			plan.slug === "sleep" ||
			plan.slug === "enthrall";
		calls.push({
			toolName: "spellkave_write_rows",
			label: `${actionId}/channel-target`,
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [
					{
						target_id: PRIMARY_CHANNEL_ID,
						shape: "Numeric",
						display_name: "Action economy: primary channel",
						bundle_id: BUNDLE_ID,
					},
				],
			},
		});
		calls.push({
			toolName: "spellkave_define_condition",
			label: `${actionId}/condition`,
			params: {
				bundle: BUNDLE_ID,
				id: localId,
				display_name: plan.name,
				// pattern: condition-grant-and-suppression / extra-action-budget (FlatSet channel)
				gate_predicate_source: "1 == 1",
				description: identityLine(plan.name, "spell condition"),
				remove_time_policy: removePolicyId,
				stacking_rule: stackingId,
				modifiers: zeroPrimary
					? [
							{
								id: `${localId}/no-action`,
								display_name: `${plan.name}: zero primary channel`,
								applies_to: PRIMARY_CHANNEL_ID,
								modifier_expression_source: "let unused = 0; unused",
								delta_kind: "FlatSet",
							},
						]
					: [],
			},
		});
	}

	const failureCall: VerbCall = {
		toolName: "spellkave_define_consequence",
		label: `${actionId}/failure`,
		params: {
			bundle: BUNDLE_ID,
			id: `${localSpellId(plan.slug)}/failure`,
			description: `${plan.name}: failed save — ApplyStatus ${conditionId}.`,
			frame_writes: [
				{
					ApplyStatus: {
						target_kind: "entity",
						target_ref: "TargetActor",
						condition_definition_id: conditionId,
					},
				},
			],
		},
	};

	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: actionId,
		params: {
			bundle: BUNDLE_ID,
			id: localSpellId(plan.slug),
			required_capability: CAST_ACTION_CAPABILITY_ID,
			niche_id: ATTACK_VERB_NICHE_ID,
			display_name: `Cast ${plan.name}`,
			description: identityLine(plan.name, "spell action"),
			// pattern: derived-value-mechanism
			...resolutionScopeForSave(ability),
			predicate_source: offerPredicateSource(cost),
			resolution_mode: "Stochastic",
			resolution_predicate_source: `d20 + ${BAKED_TARGET_SAVE_BONUS} >= ${dcExpr}`,
			on_failure: `${actionId}/failure`,
			range_m: ft(rangeFeet),
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			consequence: {
				description: `${plan.name}: successful save — no condition.`,
				frame_writes: [...slotDebitWrites(cost)],
			},
		},
	};

	return {
		slug: plan.slug,
		displayName: plan.name,
		calls: [...calls, failureCall, actionCall],
		actionId,
		cost,
		shape: plan.shape,
		precedent:
			"Save-negate condition — Stochastic derived DC + ApplyStatus; pattern: condition-grant-and-suppression",
	};
}

// ── Shape: mark_condition ────────────────────────────────────────────────

function markConditionBehavior(plan: SpellBehaviorPlan): SpellBehaviorResult {
	const cost = slotCostOf(plan);
	const rangeFeet = plan.rangeFeet ?? 90;
	const actionId = fullSpellActionId(plan.slug);
	const conditionLocalId = plan.conditionLocalId ?? `condition/spell/${plan.slug}`;
	const conditionId = `${BUNDLE_ID}/${conditionLocalId}`;
	const { stackingId, removePolicyId } = stackingIds();

	const calls: VerbCall[] = [
		{
			toolName: "spellkave_define_condition",
			label: `${actionId}/condition`,
			params: {
				bundle: BUNDLE_ID,
				id: conditionLocalId,
				display_name: plan.name,
				gate_predicate_source: "1 == 1",
				description: identityLine(plan.name, "spell condition"),
				remove_time_policy: removePolicyId,
				stacking_rule: stackingId,
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: actionId,
			params: {
				bundle: BUNDLE_ID,
				id: localSpellId(plan.slug),
				required_capability: CAST_ACTION_CAPABILITY_ID,
				niche_id: ATTACK_VERB_NICHE_ID,
				display_name: `Cast ${plan.name}`,
				description: identityLine(plan.name, "spell action"),
				predicate_source: offerPredicateSource(cost),
				range_m: ft(rangeFeet),
				self_eligible: true,
				self_only: plan.selfOnly === true,
				accepts_global_storm: true,
				cost_time_ms: 0,
				spends_channel: PRIMARY_CHANNEL_ID,
				consequence: {
					description: `${plan.name}: mark ${conditionId}.`,
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: plan.selfOnly === true ? "Actor" : "TargetActor",
								condition_definition_id: conditionId,
							},
						},
						...slotDebitWrites(cost),
					],
				},
			},
		},
	];

	return {
		slug: plan.slug,
		displayName: plan.name,
		calls,
		actionId,
		cost,
		shape: plan.shape,
		precedent: "Mark condition — ApplyStatus identity carrier (hex/hunter's mark shape)",
	};
}

// ── Shape: remove_condition ──────────────────────────────────────────────

function removeConditionBehavior(plan: SpellBehaviorPlan): SpellBehaviorResult {
	const cost = slotCostOf(plan);
	const rangeFeet = plan.rangeFeet ?? 5;
	const actionId = fullSpellActionId(plan.slug);
	const conditionId = plan.conditionId ?? `${BUNDLE_ID}/condition/poisoned`;

	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: actionId,
		params: {
			bundle: BUNDLE_ID,
			id: localSpellId(plan.slug),
			required_capability: CAST_ACTION_CAPABILITY_ID,
			niche_id: ATTACK_VERB_NICHE_ID,
			display_name: `Cast ${plan.name}`,
			description: identityLine(plan.name, "spell action"),
			predicate_source: offerPredicateSource(cost),
			range_m: ft(rangeFeet),
			self_eligible: true,
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			consequence: {
				description: `${plan.name}: remove ${conditionId}.`,
				frame_writes: [
					{
						RemoveCondition: {
							target_kind: "entity",
							target_ref: "TargetActor",
							condition_definition_id: conditionId,
							source_match: "Any",
						},
					},
					...slotDebitWrites(cost),
				],
			},
		},
	};

	return {
		slug: plan.slug,
		displayName: plan.name,
		calls: [actionCall],
		actionId,
		cost,
		shape: plan.shape,
		precedent: "RemoveCondition — lesser-restoration shape",
	};
}

// ── Shape: lingering_damage_zone ─────────────────────────────────────────
// pattern: lingering-hazard-zone

function lingeringDamageZoneBehavior(
	plan: SpellBehaviorPlan,
	options?: { dice?: string; cost?: SlotCost; actionSuffix?: string },
): SpellBehaviorResult {
	const dice = options?.dice ?? plan.zoneDice ?? plan.dice ?? "2d10";
	const damageType = plan.zoneDamageType ?? plan.damageType ?? "radiant";
	const half = plan.half === true;
	const cost = options?.cost ?? slotCostOf(plan);
	const suffix = options?.actionSuffix ?? "cast";
	const actionId = fullSpellActionId(plan.slug, suffix);
	const rangeFeet = plan.rangeFeet ?? 120;
	const _radiusFeet = plan.zoneRadiusFeet ?? 5;
	void _radiusFeet;
	const repeats = plan.zoneRepeats ?? 10;
	const zoneStateId = `${BUNDLE_ID}/hazard/${plan.slug}`;
	const _ability = plan.saveAbility ?? "constitution";

	const pulseDelta = half
		? saveRoutedDamageDelta({
				diceExpr: dice,
				damageType,
				half: true,
				subject: "actor",
				liveDc: false,
			})
		: (() => {
				const routed = routeDamage(magnitudeExpr(dice), damageType, { subject: "actor" });
				return routed;
			})();

	const scheduleEffectId = `${BUNDLE_ID}/spell/${plan.slug}/schedule${suffix === "cast" ? "" : `-${suffix}`}`;
	const pulseLocalId = `spell/${plan.slug}/pulse${suffix === "cast" ? "" : `-${suffix}`}`;
	const pulseFullId = `${BUNDLE_ID}/${pulseLocalId}`;
	const scheduleParams = {
		dsl_function: pulseFullId,
		fires_at_ms: 6000,
		payload_json: "{}",
		source: `${BUNDLE_ID}/${plan.slug}/{Actor}/{tick}`,
		frequency_ms: 6000,
		repeats_remaining: repeats,
		requires_subject_alive: false,
		priority: 0,
	};

	const calls: VerbCall[] = [
		{
			toolName: "spellkave_write_rows",
			label: `${actionId}/zone-state`,
			params: {
				bundle: BUNDLE_ID,
				kind: "spatial_state_definitions",
				rows: [
					{
						state_id: zoneStateId,
						bundle_id: BUNDLE_ID,
						value_type: "int",
						writer_policy: "world_interaction",
						description: `${plan.name} lingering hazard marker.`,
						freshness_rule: "expires_after_ticks:1000000000",
						lod_policy: "retain_latest",
						merge_rule: "replace",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_consequence",
			label: `${actionId}/pulse`,
			params: {
				bundle: BUNDLE_ID,
				id: pulseLocalId,
				description: `${plan.name} pulse: ${dice} ${damageType}${half ? " save-half" : ""}.`,
				frame_writes: [
					{
						ForEachActorInRadius: {
							center_ref: "TargetSpatialRef",
							shape_id: "core/area/node_ball",
							shape_params_json: JSON.stringify({ ball_radius: 0 }),
							predicate_source: "",
							body: [
								{
									ModifyResource: {
										actor: "Actor",
										resource: HP_STATE_ID,
										delta_source: pulseDelta,
									},
								},
							],
						},
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: `${actionId}/schedule-effect`,
			params: {
				bundle: BUNDLE_ID,
				kind: "effect_definitions",
				rows: [
					{
						effect_def_id: scheduleEffectId,
						bundle_id: BUNDLE_ID,
						primitives_csv: "ScheduleAutonomyJob",
						parameters_schema_json: JSON.stringify(scheduleParams),
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: actionId,
			params: {
				bundle: BUNDLE_ID,
				id: localSpellId(plan.slug, suffix),
				required_capability: CAST_ACTION_CAPABILITY_ID,
				niche_id: ATTACK_VERB_NICHE_ID,
				display_name: `Cast ${plan.name}${suffix === "cast" ? "" : " (higher slot)"}`,
				description: identityLine(plan.name, "spell action"),
				// pattern: lingering-hazard-zone
				predicate_source: offerPredicateSource(cost),
				range_m: ft(rangeFeet),
				accepts_global_storm: true,
				cost_time_ms: 0,
				spends_channel: PRIMARY_CHANNEL_ID,
				consequence: {
					description: `${plan.name}: inscribe marker + schedule pulse job.`,
					effect_ref: scheduleEffectId,
					frame_writes: [
						{
							Inscribe: {
								kind: "spatial_environment_state",
								location_kind: "binding",
								location_ref: "TargetSpatialRef",
								payload_json: JSON.stringify({
									state_id: zoneStateId,
									value: 1,
									visibility: "Public",
								}),
							},
						},
						...slotDebitWrites(cost),
					],
				},
			},
		},
	];

	return {
		slug: plan.slug,
		displayName: plan.name,
		calls,
		actionId,
		cost,
		damageType,
		shape: plan.shape,
		precedent:
			"Lingering damage zone — Inscribe marker + ScheduleAutonomyJob pulse; pattern: lingering-hazard-zone",
	};
}

// ── Shape: env_zone (fog / darkness marker) ──────────────────────────────

function envZoneBehavior(plan: SpellBehaviorPlan): SpellBehaviorResult {
	const cost = slotCostOf(plan);
	const rangeFeet = plan.rangeFeet ?? 120;
	const actionId = fullSpellActionId(plan.slug);
	const envLocal = plan.envStateLocalId ?? `hazard/${plan.slug}`;
	const envStateId = `${BUNDLE_ID}/${envLocal}`;

	const calls: VerbCall[] = [
		{
			toolName: "spellkave_write_rows",
			label: `${actionId}/env-state`,
			params: {
				bundle: BUNDLE_ID,
				kind: "spatial_state_definitions",
				rows: [
					{
						state_id: envStateId,
						bundle_id: BUNDLE_ID,
						value_type: "bool",
						writer_policy: "world_interaction",
						description: `${plan.name} ambient marker.`,
						freshness_rule: "expires_after_ticks:1000000000",
						lod_policy: "retain_latest",
						merge_rule: "replace",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: actionId,
			params: {
				bundle: BUNDLE_ID,
				id: localSpellId(plan.slug),
				required_capability: CAST_ACTION_CAPABILITY_ID,
				niche_id: ATTACK_VERB_NICHE_ID,
				display_name: `Cast ${plan.name}`,
				description: identityLine(plan.name, "spell action"),
				predicate_source: offerPredicateSource(cost),
				range_m: ft(rangeFeet),
				accepts_global_storm: true,
				cost_time_ms: 0,
				spends_channel: PRIMARY_CHANNEL_ID,
				consequence: {
					description: `${plan.name}: env marker ${envStateId}.`,
					frame_writes: [
						{
							Inscribe: {
								kind: "spatial_environment_state",
								location_kind: "binding",
								location_ref: "TargetSpatialRef",
								payload_json: JSON.stringify({
									state_id: envStateId,
									value: true,
									visibility: "Public",
								}),
							},
						},
						...slotDebitWrites(cost),
					],
				},
			},
		},
	];

	return {
		slug: plan.slug,
		displayName: plan.name,
		calls,
		actionId,
		cost,
		shape: plan.shape,
		precedent: "Env zone — Inscribe spatial_environment_state marker (fog/darkness shape)",
	};
}

// ── Shape: summon (Spawn) ────────────────────────────────────────────────

function summonBehavior(plan: SpellBehaviorPlan): SpellBehaviorResult {
	const cost = slotCostOf(plan);
	if (cost === undefined) {
		throw new Error(`spell-behaviors: summon '${plan.slug}' requires a slot cost.`);
	}
	const actionId = fullSpellActionId(plan.slug);
	const entityDef = plan.summonEntityDef ?? `${BUNDLE_ID}/creature/cat`;

	// Spawn is an EffectPrimitive (not a FrameWriteOp). Slot debit satisfies MF-VAL-263.
	const spawnEffectId = `${BUNDLE_ID}/spell/${plan.slug}/spawn`;
	const spawnParams = {
		blueprint_id: entityDef,
		location_ref: { kind: "binding", id: "ActorSpatialRef" },
	};
	const calls: VerbCall[] = [
		{
			toolName: "spellkave_write_rows",
			label: `${actionId}/spawn-effect`,
			params: {
				bundle: BUNDLE_ID,
				kind: "effect_definitions",
				rows: [
					{
						effect_def_id: spawnEffectId,
						bundle_id: BUNDLE_ID,
						primitives_csv: "Spawn",
						parameters_schema_json: JSON.stringify(spawnParams),
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: actionId,
			params: {
				bundle: BUNDLE_ID,
				id: localSpellId(plan.slug),
				required_capability: CAST_ACTION_CAPABILITY_ID,
				niche_id: ATTACK_VERB_NICHE_ID,
				display_name: `Cast ${plan.name}`,
				description: identityLine(plan.name, "spell action"),
				predicate_source: offerPredicateSource(cost),
				range_m: 0,
				self_eligible: true,
				self_only: true,
				accepts_global_storm: true,
				cost_time_ms: 0,
				spends_channel: PRIMARY_CHANNEL_ID,
				consequence: {
					description: `${plan.name}: spawn ${entityDef}.`,
					effect_ref: spawnEffectId,
					frame_writes: [...slotDebitWrites(cost)],
				},
			},
		},
	];

	return {
		slug: plan.slug,
		displayName: plan.name,
		calls,
		actionId,
		cost,
		shape: plan.shape,
		precedent: "Summon — Spawn at caster node (find-familiar / sister author-summon shape)",
	};
}

// ── Shape: speed_buff ────────────────────────────────────────────────────
// pattern: condition-grant-and-suppression (Plus on srd/speed-walk)

function speedBuffBehavior(plan: SpellBehaviorPlan): SpellBehaviorResult {
	const cost = slotCostOf(plan);
	const cells = plan.speedBonusCells ?? 2;
	const rangeFeet = plan.rangeFeet ?? 5;
	const selfOnly = plan.selfOnly === true;
	const actionId = fullSpellActionId(plan.slug);
	const conditionLocalId = plan.conditionLocalId ?? `condition/spell/${plan.slug}`;
	const conditionId = `${BUNDLE_ID}/${conditionLocalId}`;
	const { stackingId, removePolicyId } = stackingIds();

	const calls: VerbCall[] = [
		{
			toolName: "spellkave_write_rows",
			label: `${actionId}/speed-target`,
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [speedWalkModifierTargetRow()],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: `${actionId}/condition`,
			params: {
				bundle: BUNDLE_ID,
				id: conditionLocalId,
				display_name: plan.name,
				gate_predicate_source: "1 == 1",
				description: identityLine(plan.name, "spell condition"),
				remove_time_policy: removePolicyId,
				stacking_rule: stackingId,
				modifiers: [
					{
						id: `${conditionLocalId}/speed`,
						display_name: `${plan.name} +${cells} walk cells`,
						applies_to: SPEED_WALK_RESOURCE_ID,
						predicate_source: "",
						modifier_expression_source: `let bonus = ${cells}; bonus`,
						delta_kind: "Plus",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: actionId,
			params: {
				bundle: BUNDLE_ID,
				id: localSpellId(plan.slug),
				required_capability: CAST_ACTION_CAPABILITY_ID,
				niche_id: ATTACK_VERB_NICHE_ID,
				display_name: `Cast ${plan.name}`,
				description: identityLine(plan.name, "spell action"),
				predicate_source: offerPredicateSource(cost),
				range_m: ft(rangeFeet),
				self_eligible: true,
				self_only: selfOnly,
				accepts_global_storm: true,
				cost_time_ms: 0,
				spends_channel: PRIMARY_CHANNEL_ID,
				consequence: {
					description: `${plan.name}: apply ${conditionId}.`,
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: selfOnly ? "Actor" : "TargetActor",
								condition_definition_id: conditionId,
							},
						},
						...slotDebitWrites(cost),
					],
				},
			},
		},
	];

	return {
		slug: plan.slug,
		displayName: plan.name,
		calls,
		actionId,
		cost,
		shape: plan.shape,
		precedent: "Speed buff — ApplyStatus + Plus on srd/speed-walk (mastery-slow inverse)",
	};
}

// ── Shape: object_flag (arcane lock / knock) ─────────────────────────────

function objectFlagBehavior(plan: SpellBehaviorPlan): SpellBehaviorResult {
	const cost = slotCostOf(plan);
	const rangeFeet = plan.rangeFeet ?? 5;
	const actionId = fullSpellActionId(plan.slug);
	const flag = plan.objectFlag ?? "arcane_locked";
	const value = plan.objectFlagValue !== false;
	const envStateId = `${BUNDLE_ID}/object/${flag}`;

	// The flag's spatial_state_definition is owned by the spell that SETS it
	// (Arcane Lock); the clearing spell (Knock) only writes the state. Emitting
	// it from both spells made the live seed fail with a duplicate unique
	// `state_id` (MF-APPLY-028, 2026-08-23) that no offline gate caught —
	// see fixtures-state-id-unique.test.ts.
	const flagDefinitionCalls: VerbCall[] = value
		? [
				{
					toolName: "spellkave_write_rows",
					label: `${actionId}/flag-state`,
					params: {
						bundle: BUNDLE_ID,
						kind: "spatial_state_definitions",
						rows: [
							{
								state_id: envStateId,
								bundle_id: BUNDLE_ID,
								value_type: "bool",
								writer_policy: "world_interaction",
								description: `${plan.name} object flag ${flag}.`,
								freshness_rule: "expires_after_ticks:1000000000",
								lod_policy: "retain_latest",
								merge_rule: "replace",
							},
						],
					},
				},
			]
		: [];
	const calls: VerbCall[] = [
		...flagDefinitionCalls,
		{
			toolName: "spellkave_define_action_verb",
			label: actionId,
			params: {
				bundle: BUNDLE_ID,
				id: localSpellId(plan.slug),
				required_capability: CAST_ACTION_CAPABILITY_ID,
				niche_id: ATTACK_VERB_NICHE_ID,
				display_name: `Cast ${plan.name}`,
				description: identityLine(plan.name, "spell action"),
				predicate_source: offerPredicateSource(cost),
				range_m: ft(rangeFeet),
				accepts_global_storm: true,
				cost_time_ms: 0,
				spends_channel: PRIMARY_CHANNEL_ID,
				consequence: {
					description: `${plan.name}: flag ${flag}=${value}.`,
					frame_writes: [
						{
							Inscribe: {
								kind: "spatial_environment_state",
								location_kind: "binding",
								location_ref: "TargetSpatialRef",
								payload_json: JSON.stringify({
									state_id: envStateId,
									value,
									visibility: "Public",
								}),
							},
						},
						...slotDebitWrites(cost),
					],
				},
			},
		},
	];

	return {
		slug: plan.slug,
		displayName: plan.name,
		calls,
		actionId,
		cost,
		shape: plan.shape,
		precedent: "Object flag — Inscribe spatial_environment_state bool at target (lock/knock)",
	};
}

// ── Shape: trace_cast (honest utility cast mark) ─────────────────────────
// pattern: trace-perceptibility-window

function traceCastBehavior(plan: SpellBehaviorPlan): SpellBehaviorResult {
	const cost = slotCostOf(plan);
	const rangeFeet = plan.rangeFeet ?? 30;
	const actionId = fullSpellActionId(plan.slug);
	const kindLocal = plan.traceKindLocalId ?? `trace/spell/${plan.slug}`;
	const kindId = `${BUNDLE_ID}/${kindLocal}`;

	const calls: VerbCall[] = [
		{
			toolName: "spellkave_define_trace_kind",
			label: `${actionId}/trace-kind`,
			params: {
				bundle: BUNDLE_ID,
				id: kindLocal,
				location_kinds: "place_node",
				description: `${plan.name} cast mark (standing). pattern: trace-perceptibility-window.`,
				// standing mark — omit perceptible_for_ticks (unbounded arrival)
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: actionId,
			params: {
				bundle: BUNDLE_ID,
				id: localSpellId(plan.slug),
				required_capability: CAST_ACTION_CAPABILITY_ID,
				niche_id: ATTACK_VERB_NICHE_ID,
				display_name: `Cast ${plan.name}`,
				description: identityLine(plan.name, "spell action"),
				predicate_source: offerPredicateSource(cost),
				range_m: ft(rangeFeet),
				self_eligible: true,
				accepts_global_storm: true,
				cost_time_ms: 0,
				spends_channel: PRIMARY_CHANNEL_ID,
				consequence: {
					description: `${plan.name}: inscribe ${kindId}.`,
					frame_writes: [
						{
							Inscribe: {
								kind: kindId,
								location_kind: "binding",
								location_ref: rangeFeet <= 5 ? "ActorSpatialRef" : "TargetSpatialRef",
								payload_json: JSON.stringify({
									spell: plan.slug,
									text: plan.name,
								}),
							},
						},
						...slotDebitWrites(cost),
					],
				},
			},
		},
	];

	return {
		slug: plan.slug,
		displayName: plan.name,
		calls,
		actionId,
		cost,
		shape: plan.shape,
		precedent: "Trace cast — standing Inscribe mark; pattern: trace-perceptibility-window",
	};
}

// ── Shape: teleport (Misty Step) ─────────────────────────────────────────
// repair: relocate-entity-ungated — RelocateEntity, no place_edge
// Destination is the player-chosen target place (TargetSpatialRef binding).

function teleportBehavior(plan: SpellBehaviorPlan): SpellBehaviorResult {
	const cost = slotCostOf(plan);
	const rangeFeet = plan.rangeFeet ?? 30;
	const rangeMm = Math.round(ft(rangeFeet) * 1000);
	const actionId = fullSpellActionId(plan.slug);

	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: actionId,
		params: {
			bundle: BUNDLE_ID,
			id: localSpellId(plan.slug),
			required_capability: CAST_ACTION_CAPABILITY_ID,
			niche_id: ATTACK_VERB_NICHE_ID,
			display_name: `Cast ${plan.name}`,
			description: identityLine(plan.name, "spell action"),
			predicate_source: [
				offerPredicateSource(cost),
				`target.stat('core/distance_to_actor_mm') <= ${rangeMm}`,
			]
				.filter((s): s is string => s !== undefined && s.length > 0)
				.join(" && "),
			range_m: ft(rangeFeet),
			self_eligible: false,
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			// Bonus-action residual: spends_channel primary this lane (action economy partial).
			consequence: {
				description: `${plan.name}: RelocateEntity caster → TargetSpatialRef.`,
				frame_writes: [
					{
						RelocateEntity: {
							target_ref: "Actor",
							destination: { kind: "binding", id: "TargetSpatialRef" },
						},
					},
					...slotDebitWrites(cost),
				],
			},
		},
	};

	return {
		slug: plan.slug,
		displayName: plan.name,
		calls: [actionCall],
		actionId,
		cost,
		shape: plan.shape,
		precedent:
			"Teleport — RelocateEntity to TargetSpatialRef (repairs/relocate-entity-ungated; ADR-0079)",
	};
}

// ── Upcast fan-out ───────────────────────────────────────────────────────
// pattern: computed-literal

function withUpcast(base: SpellBehaviorResult, plan: SpellBehaviorPlan): SpellBehaviorResult[] {
	if (plan.upcast !== true || plan.level === 0) return [base];
	const options = castingOptionsBySlot(plan.sourcePk);
	const slot2 = options.get(2);
	if (slot2 === undefined) return [base];

	const cost2: SlotCost = { level: 2 };
	let upcast: SpellBehaviorResult | undefined;

	switch (plan.shape) {
		case "heal":
			if (slot2.damageRoll) {
				upcast = simpleHealBehavior(plan, {
					dice: slot2.damageRoll,
					cost: cost2,
					actionSuffix: "cast-slot-2",
				});
			}
			break;
		case "attack_roll_damage":
			if (slot2.damageRoll) {
				upcast = attackRollDamageBehavior(plan, {
					dice: slot2.damageRoll,
					cost: cost2,
					actionSuffix: "cast-slot-2",
				});
			}
			break;
		case "save_half_single":
		case "save_negate_damage":
			if (slot2.damageRoll) {
				upcast = saveDamageSingleBehavior(plan, {
					dice: slot2.damageRoll,
					cost: cost2,
					actionSuffix: "cast-slot-2",
				});
			}
			break;
		case "save_half_aoe":
		case "save_negate_aoe":
			if (slot2.damageRoll) {
				upcast = saveAoeBehavior(plan, {
					dice: slot2.damageRoll,
					cost: cost2,
					actionSuffix: "cast-slot-2",
				});
			}
			break;
		case "lingering_damage_zone":
			if (slot2.damageRoll) {
				upcast = lingeringDamageZoneBehavior(plan, {
					dice: slot2.damageRoll,
					cost: cost2,
					actionSuffix: "cast-slot-2",
				});
			}
			break;
		case "temp_hp":
			// False Life higher levels: +5 temp HP per slot above 1st (SRD prose).
			// SpellCastingOption rows are empty — compute literal.
			// pattern: computed-literal
			{
				const baseGrant = plan.tempHpExpr ?? "1d4 + 4";
				// slot 2 → +5 → "1d4 + 9"
				const bumped = baseGrant.includes("+")
					? baseGrant.replace(/\+\s*(\d+)/, (_, n) => `+ ${Number(n) + 5}`)
					: `${baseGrant} + 5`;
				upcast = tempHpBehavior(plan, {
					tempHpExpr: bumped,
					cost: cost2,
					actionSuffix: "cast-slot-2",
				});
			}
			break;
		case "multi_instance":
			if (slot2.targetCount !== null && plan.instances !== undefined && plan.instances[0]) {
				const proto = plan.instances[0];
				const instances = Array.from({ length: slot2.targetCount }, () => ({ ...proto }));
				upcast = multiInstanceBehavior(plan, {
					instances,
					cost: cost2,
					actionSuffix: "cast-slot-2",
				});
			}
			break;
		default:
			break;
	}

	if (upcast === undefined) return [base];
	// Merge calls: base first, then upcast (upcast may redefine conditions — use unique ids via suffix).
	return [
		base,
		{
			...upcast,
			// Keep primary actionId as base for unit summaries; upcast is extra rows.
			calls: upcast.calls,
			precedent: `${upcast.precedent} + upcast slot-2 (pattern: computed-literal)`,
		},
	];
}

type SpellFrameWrite = {
	ModifyResource?: { actor: string; resource: string; delta_source: string };
	ForEachActorInRadius?: {
		center_ref: string;
		shape_id: string;
		shape_params_json: string;
		predicate_source: string;
		body: SpellFrameWrite[];
	};
	[kind: string]: unknown;
};

// pattern: condition-hook-on-event
// Round 3: author these rules before the canonical verbs render the rows.
function authorCastingRules(
	result: SpellBehaviorResult,
	plan: SpellBehaviorPlan,
): SpellBehaviorResult {
	const castingTime = readSpells().find((spell) => spell.pk === plan.sourcePk)?.castingTime;
	const channel = castingTime === "bonus-action" ? "srd/economy_channel/bonus" : PRIMARY_CHANNEL_ID;
	const action = result.calls.find((call) => call.toolName === "spellkave_define_action_verb");
	if (!action) return result;
	// Self-only actions have no target claim (MF-VAL-309).
	action.params.non_steering = action.params.self_only !== true;
	action.params.spends_channel = channel;
	if (["cure-wounds", "healing-word", "aid", "prayer-of-healing"].includes(plan.slug))
		action.params.self_eligible = true;
	const consequence = action.params.consequence as {
		description: string;
		frame_writes: SpellFrameWrite[];
	};
	const failure = result.calls.find(
		(call) =>
			call.toolName === "spellkave_define_consequence" &&
			call.params.id === String(action.params.id) + "/failure",
	);
	const miss = result.calls.find(
		(call) =>
			call.toolName === "spellkave_define_consequence" &&
			call.params.id === String(action.params.id) + "/miss",
	);
	// A spent slot pays for the attempt, including a successful target save or miss.
	if (failure)
		(failure.params.frame_writes as SpellFrameWrite[]).push(...slotDebitWrites(result.cost));
	if (miss) (miss.params.frame_writes as SpellFrameWrite[]).push(...slotDebitWrites(result.cost));
	const pulses = result.calls.filter(
		(call) =>
			call.toolName === "spellkave_define_consequence" && String(call.params.id).endsWith("/pulse"),
	);
	const sets = [
		consequence.frame_writes,
		...(failure ? [failure.params.frame_writes as SpellFrameWrite[]] : []),
		...pulses.map((call) => call.params.frame_writes as SpellFrameWrite[]),
	];
	for (const writes of sets) {
		const directDamage = writes.some(
			(write) =>
				write.ModifyResource?.actor === "TargetActor" &&
				write.ModifyResource?.resource === HP_STATE_ID &&
				["attack_roll_damage", "save_half_single", "save_negate_damage", "multi_instance"].includes(
					plan.shape,
				),
		);
		const area = writes.find((write) =>
			write.ForEachActorInRadius?.body?.some(
				(leaf: SpellFrameWrite) => leaf.ModifyResource?.resource === HP_STATE_ID,
			),
		)?.ForEachActorInRadius;
		if (["cure-wounds", "healing-word", "prayer-of-healing"].includes(plan.slug))
			for (const write of writes)
				if (write.ModifyResource?.resource === HP_STATE_ID)
					write.ModifyResource.delta_source = cappedHealingExpr(
						write.ModifyResource.delta_source,
						"target",
					);
		if (
			area &&
			plan.center !== "target" &&
			["burning-hands", "thunderwave", "dragons-breath"].includes(plan.slug)
		)
			area.predicate_source = "actor.has_tag('srd.player_character') == false";
		if (directDamage || area) {
			const dead = monsterDeathFrameWrite(HP_STATE_ID, "srd/condition/dead") as SpellFrameWrite;
			const down = characterUnconsciousFrameWrite(
				HP_STATE_ID,
				"srd/condition/unconscious",
				"srd/death_save_successes",
				"srd/death_save_failures",
				"srd/death_save_last_roll",
			) as SpellFrameWrite;
			for (const write of [dead, down])
				if (area && write.ForEachActorInRadius)
					Object.assign(write.ForEachActorInRadius, {
						center_ref: area.center_ref,
						shape_id: area.shape_id,
						shape_params_json: area.shape_params_json,
					});
			writes.push(dead, down);
		}
	}

	if (failure && !plan.half && typeof action.params.resolution_predicate_source === "string") {
		// The composer owns consequence identities; a complete action-row upsert
		// points success to the failed-save body without renaming either set.
		const p = action.params;
		result.calls.push({
			toolName: "spellkave_write_rows",
			label: result.actionId + "/landed-save",
			params: {
				bundle: BUNDLE_ID,
				kind: "action_definitions",
				rows: [
					{
						action_id: result.actionId,
						bundle_id: BUNDLE_ID,
						display_name: p.display_name,
						description: p.description,
						required_capability: p.required_capability,
						cost_time_ms: p.cost_time_ms ?? 0,
						resolution_mode: "Stochastic",
						resolution_predicate_source:
							spellSaveDcExpr("actor") + " > d20 + " + BAKED_TARGET_SAVE_BONUS,
						...(p.resolution_scope ? { resolution_scope: p.resolution_scope } : {}),
						on_success: result.actionId + "/failure",
						on_failure: result.actionId + "/success",
						self_eligible: p.self_eligible ?? false,
						self_only: p.self_only ?? false,
						resumable: false,
						session_def_id: "",
						spends_channel: p.spends_channel,
						non_steering: p.non_steering,
					},
				],
			},
		});
	}

	return result;
}

// ── Dispatch ─────────────────────────────────────────────────────────────

function behaviorForPlan(plan: SpellBehaviorPlan): SpellBehaviorResult[] {
	let base: SpellBehaviorResult;
	switch (plan.shape) {
		case "attack_roll_damage":
			base = attackRollDamageBehavior(plan);
			break;
		case "save_half_single":
		case "save_negate_damage":
			base = saveDamageSingleBehavior(plan);
			break;
		case "multi_instance":
			base = multiInstanceBehavior(plan);
			break;
		case "heal":
			base = simpleHealBehavior(plan);
			break;
		case "save_half_aoe":
		case "save_negate_aoe":
			base = saveAoeBehavior(plan);
			break;
		case "target_ac_buff":
		case "self_ac_buff":
			base = acBuffBehavior(plan);
			break;
		case "condition_roll_mod":
			base = conditionRollModBehavior(plan);
			break;
		case "temp_hp":
			base = tempHpBehavior(plan);
			break;
		case "save_negate_condition":
			base = saveNegateConditionBehavior(plan);
			break;
		case "mark_condition":
			base = markConditionBehavior(plan);
			break;
		case "remove_condition":
			base = removeConditionBehavior(plan);
			break;
		case "lingering_damage_zone":
			base = lingeringDamageZoneBehavior(plan);
			break;
		case "env_zone":
			base = envZoneBehavior(plan);
			break;
		case "summon":
			base = summonBehavior(plan);
			break;
		case "speed_buff":
			base = speedBuffBehavior(plan);
			break;
		case "object_flag":
			base = objectFlagBehavior(plan);
			break;
		case "trace_cast":
			base = traceCastBehavior(plan);
			break;
		case "teleport":
			base = teleportBehavior(plan);
			break;
		default:
			throw new Error(
				`spell-behaviors: plan '${plan.slug}' shape '${plan.shape}' is not expressible — ` +
					`n/a plans must not reach the generator.`,
			);
	}
	return withUpcast(base, plan).map((variant) => authorCastingRules(variant, plan));
}

/** Every expressible cantrip/L1/L2 class-list spell — one primary result per plan (upcast siblings are folded into the same fixture by buildSpellBehaviorFragments). */
export function buildCuratedSpellBehaviors(): SpellBehaviorResult[] {
	return EXPRESSIBLE_SPELL_PLANS.map((plan) => {
		const [primary] = behaviorForPlan(plan);
		if (primary === undefined) {
			throw new Error(`spell-behaviors: no primary behavior for ${plan.slug}`);
		}
		return primary;
	});
}

/** Primary + upcast sibling results (internal to fixture render). */
export function buildAllSpellBehaviorVariants(): SpellBehaviorResult[] {
	return EXPRESSIBLE_SPELL_PLANS.flatMap(behaviorForPlan);
}

/** Alias used by newer call sites. */
export const buildSpellBehaviors = buildCuratedSpellBehaviors;

/**
 * Seed-only concentrating row (no hooks) so ApplyStatus FKs resolve in a
 * throwaway workspace. Canonical concentrating+hooks live in casting.toml —
 * strip every table whose natural key is the seed id, including nested hooks.
 */
/** Throwaway: fragment validation cannot see rest.toml's FireBoundary (MF-VAL-351). */
const LONG_REST_FIRE_SEED_LOCAL_ID = "spell/seed/long-rest-fire";

function longRestFireSeedCall(): VerbCall {
	return {
		toolName: "spellkave_define_consequence",
		label: "seed:long-rest-fire",
		params: {
			bundle: BUNDLE_ID,
			id: LONG_REST_FIRE_SEED_LOCAL_ID,
			description: "Throwaway seed; rest.toml owns the real long rest FireBoundary.",
			frame_writes: [{ FireBoundary: { boundary_id: LONG_REST_BOUNDARY_ID, scope: "Actor" } }],
		},
	};
}

function stripSeededConcentrationRows(toml: string): string {
	const dropExact = new Set([
		CONCENTRATING_CONDITION_ID,
		CONCENTRATION_CHECK_TEMPLATE_ID,
		`${BUNDLE_ID}/${LONG_REST_FIRE_SEED_LOCAL_ID}`,
	]);
	const lines = toml.split("\n");
	const out: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const line = lines[i] ?? "";
		if (line.startsWith("[[")) {
			// Gather one table (header + body until next [[ or EOF).
			const start = i;
			i += 1;
			while (i < lines.length && !(lines[i] ?? "").startsWith("[[")) i += 1;
			const block = lines.slice(start, i).join("\n");
			const idMatch = block.match(
				/(?:^|\n)(?:condition_definition_id|template_id)\s*=\s*"([^"]+)"/,
			);
			const nestedHook = block.startsWith("[[condition_definitions.hooks]]");
			// Drop parent rows for seed ids, and ANY hooks table that references the check template
			// or sits immediately after a dropped concentrating parent (handled by dropping hooks
			// that mention concentration/check or concentrating).
			if (idMatch && dropExact.has(idMatch[1] ?? "")) continue;
			if (
				nestedHook &&
				(block.includes(CONCENTRATION_CHECK_TEMPLATE_ID) ||
					(block.includes("Layer2.ResourceDelta") && block.includes("srd/hp")))
			) {
				// Only drop the concentrating condition's ResourceDelta hook seed, not
				// spell-effect ConditionDelta hooks (those mention ConditionDelta).
				if (block.includes("Layer2.ResourceDelta")) continue;
			}
			out.push(...lines.slice(start, i));
			continue;
		}
		out.push(line);
		i += 1;
	}
	return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

function concentrationApplyStatusSeedCalls(): VerbCall[] {
	// Minimal FK seed: condition row only (no hooks / no check template).
	return [
		{
			toolName: "spellkave_define_condition",
			label: "seed:concentrating",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/concentrating",
				display_name: "Concentrating (seed)",
				description: "Throwaway seed for ApplyStatus FK; casting.toml owns the real row.",
				gate_predicate_source: "1 == 1",
				remove_time_policy: `${BUNDLE_ID}/remove_policy/independent_lifetime`,
				stacking_rule: `${BUNDLE_ID}/stacking/single`,
			},
		},
	];
}

export async function buildSpellBehaviorFragments(
	target?: AuthorTarget,
): Promise<Map<string, { toml: string; result: SpellBehaviorResult }>> {
	const results = buildAllSpellBehaviorVariants();
	// Group by slug: base + upcast share one fixture file.
	const bySlug = new Map<string, SpellBehaviorResult[]>();
	for (const result of results) {
		const list = bySlug.get(result.slug) ?? [];
		list.push(result);
		bySlug.set(result.slug, list);
	}

	const map = new Map<string, { toml: string; result: SpellBehaviorResult }>();
	await Promise.all(
		[...bySlug.entries()].map(async ([slug, group]) => {
			const primary = group[0];
			if (primary === undefined) {
				throw new Error(`spell-behaviors: empty behavior group for ${slug}`);
			}
			const allCalls = group.flatMap((result) => result.calls);
			const needsSlot1 = group.some((result) => result.cost?.level === 1);
			const needsSlot2 = group.some((result) => result.cost?.level === 2);
			const plan = spellBehaviorPlanBySlug(slug);
			const needsConcentrationSeed = plan?.concentration === true;
			const prefixCalls: VerbCall[] = [];
			if (needsSlot1) prefixCalls.push(spellSlotResourceCall(1));
			if (needsSlot2) prefixCalls.push(spellSlotResourceCall(2));
			// Seed concentrating for ApplyStatus FK in throwaway workspace; strip after
			// (canonical concentrating lives in casting.toml).
			if (needsConcentrationSeed) {
				prefixCalls.push(...concentrationApplyStatusSeedCalls());
			}
			if (plan?.endsAtCasterLongRest === true) prefixCalls.push(longRestFireSeedCall());
			const omitKinds = needsSlot1 || needsSlot2 ? (["resource_definitions"] as const) : undefined;
			const rawToml = await driveUnitScene(
				BUNDLE_ID,
				[...prefixCalls, ...allCalls],
				target,
				omitKinds === undefined ? undefined : { omitRowKinds: [...omitKinds] },
			);
			const toml =
				needsConcentrationSeed || plan?.endsAtCasterLongRest === true
					? stripSeededConcentrationRows(rawToml)
					: rawToml;
			const headerLines = [
				`# pattern: damage-type-routing`,
				`# pattern: condition-hook-on-event`,
				`# pattern: derived-value-mechanism`,
				primary.shape.includes("zone") || primary.shape === "lingering_damage_zone"
					? `# pattern: lingering-hazard-zone`
					: undefined,
				primary.shape === "condition_roll_mod" ||
				primary.shape === "save_negate_condition" ||
				primary.shape === "self_ac_buff" ||
				primary.shape === "target_ac_buff" ||
				primary.shape === "speed_buff"
					? `# pattern: condition-grant-and-suppression`
					: undefined,
				primary.shape === "trace_cast" ? `# pattern: trace-perceptibility-window` : undefined,
				group.length > 1 ? `# pattern: computed-literal` : undefined,
			].filter((line): line is string => line !== undefined);
			map.set(slug, {
				toml: `${headerLines.join("\n")}\n${toml}`,
				result: primary,
			});
		}),
	);
	return map;
}

export function spellBehaviorUnitSummaries(
	results: readonly SpellBehaviorResult[],
): ChapterUnitSummary[] {
	// One summary per primary (unique slug) action.
	const seen = new Set<string>();
	const out: ChapterUnitSummary[] = [];
	for (const result of results) {
		if (seen.has(result.slug)) continue;
		seen.add(result.slug);
		out.push({
			kind: "action_definitions",
			id: result.actionId,
			sourcePk: "",
		});
	}
	return out;
}

/** Look up whether a slug has an expressible behaviour (for fixture headers). */
export function spellBehaviorPrecedent(slug: string): string | undefined {
	const plan = spellBehaviorPlanBySlug(slug);
	if (plan === undefined || plan.shape.startsWith("na_")) return undefined;
	return behaviorForPlan(plan)[0]?.precedent;
}
