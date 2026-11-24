// pattern: damage-type-routing
// pattern: mastery-gated-attack-variant
// pattern: lingering-hazard-zone
// pattern: multiattack-ordinals
// Monsters chapter — CR 0–4 attack BEHAVIORS (lane L7 / bestiary-cr0-4.md).
// Generalizes the original 8-starter slice: every CR 0–4 creature whose
// attack shape is expressible as baked multi-ordinals ships from here;
// archetype-route creatures (manufactured / natural weapon + shared
// srd/attack/melee|ranged) are seeded in `./index.ts` from the same plan
// (`./bestiary-plan.ts`).
//
// TWO MECHANIC SHAPES (design § shapes C–F + baked singles):
//   - BAKED ORDINALS (multiattack N≥2, or single when archetype math cannot
//     host the numbers): ONE action, resolution_mode omitted (deterministic),
//     each ordinal is its OWN independently-gated ModifyResource.delta_source
//     — `let atkN_roll = d20; cond(… >= AC, 0 - damage, 0)`.
//   - ARCHETYPE route: no rows in this fragment (see index.ts).
//
// Starter byte-stability: Black/Brown Bear multiattack composition is
// unchanged; Goblin/Skeleton/Bandit/Wolf/Zombie/Giant Rat stay archetype
// routes with the same equipment ids.
//
// GIANT RAT — SOURCE-DATA GAP: still no CreatureActionAttack row;
// `giantRatBiteFallback` remains the dedicated parser (also used offline to
// pin archetype numbers). The bestiary plan's general desc parser covers the
// broader CR 0–4 desc-only set.
import {
	type CreatureActionAttackRecord,
	creatureActionAttackByParent,
	creatureActionsByParent,
} from "../../open5e/creature";
import type { ChapterUnitSummary } from "../chapter-types";
import { PRIMARY_CHANNEL_ID } from "../playing-the-game/action-economy-units";
import { AC_RESOURCE_ID } from "../playing-the-game/armor-class-units";
import { MELEE_REACH_METERS } from "../playing-the-game/combat-misc-units";
import { damageRollExpr } from "../playing-the-game/damage-units";
import { DEAD_CONDITION_ID } from "../playing-the-game/fragments/conditions";
import { HP_ID } from "../playing-the-game/hp-units";
import {
	ATTACK_VERB_NICHE_LOCAL_ID,
	monsterDeathFrameWrite,
} from "../playing-the-game/weapon-attack-units";
import type { VerbCall } from "../verb-runner";
import {
	type BestiaryPlan,
	buildBestiaryPlans,
	type MechanizedBestiaryPlan,
	type PlannedAttack,
	type PlannedBreathOrAoe,
	STARTER_SLUGS,
} from "./bestiary-plan";
import { BUNDLE_ID, buildCreatureUnits, type CreatureUnit } from "./creature-units";

const HP_STATE_ID = `${BUNDLE_ID}/${HP_ID}`;
const ATTACK_VERB_NICHE_ID = `${BUNDLE_ID}/${ATTACK_VERB_NICHE_LOCAL_ID}`;
const ATTACK_ACTION_CAPABILITY_ID = `${BUNDLE_ID}/action/attack`;

/** @deprecated Use PlannedAttack via bestiary-plan — kept for giantRatBiteFallback callers. */
interface ResolvedAttack {
	attackSlug: string;
	displayName: string;
	toHitMod: number;
	diceExpr: string;
	damageBonus: number;
	damageType: string;
	melee: boolean;
	sourcePk: string;
	flatDamage?: number | null;
}

function coalescedDamageType(attack: CreatureActionAttackRecord): string {
	const type = attack.damageType ?? attack.extraDamageType;
	if (type === null) {
		throw new Error(
			`starter-behaviors: attack '${attack.pk}' has neither damage_type nor extra_damage_type set.`,
		);
	}
	return type;
}

/** Resolve one starter's attack row via the reader's own action->attack join. */
function resolveAttack(actionPk: string, attackSlug: string, melee: boolean): ResolvedAttack {
	const attack = creatureActionAttackByParent(actionPk);
	if (attack === undefined) {
		throw new Error(
			`starter-behaviors: expected a CreatureActionAttack row for action '${actionPk}' — none found ` +
				"(if this is the known Giant Rat gap, use giantRatBiteFallback() instead of this resolver).",
		);
	}
	if (
		attack.toHitMod === null ||
		attack.damageDieCount === null ||
		attack.damageDieType === null ||
		attack.damageBonus === null
	) {
		throw new Error(
			`starter-behaviors: attack '${attack.pk}' is missing a required numeric field.`,
		);
	}
	return {
		attackSlug,
		displayName: attack.name,
		toHitMod: attack.toHitMod,
		diceExpr: `${attack.damageDieCount}d${attack.damageDieType.replace(/^D/i, "")}`,
		damageBonus: attack.damageBonus,
		damageType: coalescedDamageType(attack),
		melee,
		sourcePk: attack.pk,
	};
}

/**
 * Parse `srd-2024_giant-rat_bite`'s own `desc` prose — the ONE documented
 * source-data gap the starter slice filled with a narrow regex. EXPORTED (BL-49).
 */
export function giantRatBiteFallback(): ResolvedAttack {
	const action = creatureActionsByParent("srd-2024_giant-rat").find((row) => row.name === "Bite");
	if (action === undefined) {
		throw new Error(
			"starter-behaviors: 'srd-2024_giant-rat' no longer has a Bite CreatureAction row.",
		);
	}
	const match =
		/Melee Attack Roll:\s*\+(\d+),\s*reach\s*\d+\s*feet\.\s*\d+\s*\((\d+)d(\d+)\s*\+\s*(\d+)\)\s*(\w+)\s*damage\./.exec(
			action.desc,
		);
	if (match === null) {
		throw new Error(
			`starter-behaviors: giantRatBiteFallback's regex no longer matches '${action.pk}'.desc ` +
				`('${action.desc}') — the Giant Rat Bite gap this fallback fills may have been resolved ` +
				"upstream, or the sentence was reworded; re-derive.",
		);
	}
	const [, toHit, diceCount, dieSides, bonus, damageType] = match;
	if (
		toHit === undefined ||
		diceCount === undefined ||
		dieSides === undefined ||
		bonus === undefined ||
		damageType === undefined
	) {
		throw new Error(
			"starter-behaviors: giantRatBiteFallback regex matched with an undefined group.",
		);
	}
	return {
		attackSlug: "bite",
		displayName: "Bite",
		toHitMod: Number.parseInt(toHit, 10),
		diceExpr: `${diceCount}d${dieSides}`,
		damageBonus: Number.parseInt(bonus, 10),
		damageType: damageType.toLowerCase(),
		melee: true,
		sourcePk: action.pk,
	};
}

function rangeMetersFor(attack: PlannedAttack | ResolvedAttack): number {
	if ("rangeFeet" in attack && attack.rangeFeet != null) {
		return attack.rangeFeet * 0.3048;
	}
	if (!attack.melee) {
		throw new Error(
			`starter-behaviors: ranged attack '${attack.sourcePk}' needs rangeFeet for baked range_m.`,
		);
	}
	return MELEE_REACH_METERS;
}

function localCreatureId(creature: CreatureUnit): string {
	const prefix = `${BUNDLE_ID}/`;
	if (!creature.entityId.startsWith(prefix)) {
		throw new Error(
			`starter-behaviors: entityId '${creature.entityId}' does not start with '${prefix}'.`,
		);
	}
	return creature.entityId.slice(prefix.length);
}

function perCreatureCapabilityLocalId(creature: CreatureUnit): string {
	return `${localCreatureId(creature)}/action`;
}

function perCreatureCapabilityId(creature: CreatureUnit): string {
	return `${BUNDLE_ID}/${perCreatureCapabilityLocalId(creature)}`;
}

function perCreatureCapabilityCalls(creature: CreatureUnit): VerbCall[] {
	const capabilityId = perCreatureCapabilityId(creature);
	return [
		{
			toolName: "spellkave_define_capability",
			label: `capability:${capabilityId}`,
			params: {
				bundle: BUNDLE_ID,
				id: perCreatureCapabilityLocalId(creature),
				actor_kind: "entity",
				display_name: `${creature.displayName}: Attack`,
				description:
					`${creature.displayName}'s own statblock attack capability (D6, actor-carried-verbs, ` +
					"sk-o8k) — granted only to this creature's own entity_def below, so this statblock " +
					"action is never offered to any other actor holding the shared srd/action/attack " +
					"capability alone.",
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: `grant-attack-capability-${creature.slug}`,
			params: {
				bundle: BUNDLE_ID,
				kind: "entity_definition_initial_capability",
				rows: [
					{
						entity_def_id: creature.entityId,
						capability_id: capabilityId,
						bundle_id: BUNDLE_ID,
					},
				],
			},
		},
	];
}

function damageDeltaExpr(attack: PlannedAttack): string {
	if (attack.flatDamage !== null) {
		return `0 - (${attack.flatDamage})`;
	}
	const magnitude = damageRollExpr({
		diceExpr: attack.diceExpr,
		modifierExpr: String(attack.damageBonus),
	});
	return `0 - (${magnitude})`;
}

/** One baked multi-ordinal (or single-ordinal) action verb. */
function bakedOrdinalCalls(
	creature: CreatureUnit,
	attacks: readonly PlannedAttack[],
	actionSlug: string,
	displayLabel: string,
): { calls: VerbCall[]; actionId: string; capabilityId: string } {
	const localActionId = `${localCreatureId(creature)}/action/${actionSlug}`;
	const actionId = `${BUNDLE_ID}/${localActionId}`;
	const ordinalWrites: Record<string, unknown>[] = [];
	for (let index = 0; index < attacks.length; index++) {
		const attack = attacks[index]!;
		const rollVar = `atk${index}_roll`;
		const hitExpr = `${rollVar} + ${attack.toHitMod} >= target.effective('${AC_RESOURCE_ID}')`;
		ordinalWrites.push({
			ModifyResource: {
				actor: "TargetActor",
				resource: HP_STATE_ID,
				delta_source: `let ${rollVar} = d20; cond(${hitExpr}, ${damageDeltaExpr(attack)}, 0)`,
			},
		});
		if (attack.conditionRiders && attack.conditionRiders.length > 0) {
			for (const condId of attack.conditionRiders) {
				ordinalWrites.push({
					ApplyStatus: {
						target_kind: "entity",
						target_ref: "TargetActor",
						condition_definition_id: condId,
					},
				});
			}
		}
	}
	const attackSummary = attacks
		.map((attack) => {
			const dmg =
				attack.flatDamage !== null
					? `${attack.flatDamage} ${attack.damageType}`
					: `${attack.diceExpr} + ${attack.damageBonus} ${attack.damageType}`;
			return `${attack.displayName} (to-hit +${attack.toHitMod}, ${dmg})`;
		})
		.join("; ");
	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: actionId,
		params: {
			bundle: BUNDLE_ID,
			id: localActionId,
			required_capability: ATTACK_ACTION_CAPABILITY_ID,
			affordance_capability_id: perCreatureCapabilityId(creature),
			niche_id: ATTACK_VERB_NICHE_ID,
			display_name: `${creature.displayName} — ${displayLabel}`,
			description:
				`${creature.displayName}'s ${displayLabel}: ${attacks.length} independently-rolled attack ` +
				`ordinal(s) in one act call — ${attackSummary}. A miss on one ordinal never blocks the ` +
				"others (bestiary-cr0-4.md).",
			range_m: Math.max(...attacks.map((attack) => rangeMetersFor(attack))),
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			non_steering: true, // Round 3: concurrent party attacks; canon review required.
			consequence: {
				description: `${creature.displayName}'s ${displayLabel}: ${attackSummary}. A killing ordinal applies srd/condition/dead.`,
				frame_writes: [...ordinalWrites, monsterDeathFrameWrite(HP_STATE_ID, DEAD_CONDITION_ID)],
			},
		},
	};
	return {
		calls: [...perCreatureCapabilityCalls(creature), actionCall],
		actionId,
		capabilityId: perCreatureCapabilityId(creature),
	};
}

/** One baked breath / AoE save-half action verb. */
function bakedBreathCalls(
	creature: CreatureUnit,
	breath: PlannedBreathOrAoe,
): { calls: VerbCall[]; actionId: string; capabilityId: string } {
	const localActionId = `${localCreatureId(creature)}/action/${breath.actionSlug}`;
	const actionId = `${BUNDLE_ID}/${localActionId}`;

	let shapeId = "core/area/cone";
	let shapeParamsJson = "{}";
	let maxRangeM = 15 * 0.3048;

	if (breath.areaShape.kind === "line") {
		shapeId = "core/area/line";
		shapeParamsJson = JSON.stringify({
			length_m: breath.areaShape.lengthFeet * 0.3048,
			width_m: breath.areaShape.widthFeet * 0.3048,
		});
		maxRangeM = breath.areaShape.lengthFeet * 0.3048;
	} else if (breath.areaShape.kind === "cone") {
		shapeId = "core/area/cone";
		shapeParamsJson = JSON.stringify({
			half_angle_deg: breath.areaShape.halfAngleDeg,
			range_m: breath.areaShape.rangeFeet * 0.3048,
		});
		maxRangeM = breath.areaShape.rangeFeet * 0.3048;
	} else if (breath.areaShape.kind === "sphere") {
		shapeId = "core/area/sphere";
		shapeParamsJson = JSON.stringify({
			radius_m: breath.areaShape.radiusFeet * 0.3048,
		});
		maxRangeM = breath.areaShape.radiusFeet * 0.3048;
	}

	const saveOk = `d20 + 2 >= ${breath.saveDc}`;
	const postSave = breath.halfOnSave ? `cond(${saveOk}, dmg / 2, dmg)` : `cond(${saveOk}, 0, dmg)`;
	const damageExpr =
		`let dmg = ${damageRollExpr({ diceExpr: breath.diceExpr })}; let post = ${postSave}; ` +
		`let routed = cond(actor.has_tag('damage_immune:${breath.damageType}'), 0, cond(actor.has_tag('damage_resist:${breath.damageType}'), post / 2, cond(actor.has_tag('damage_vulnerable:${breath.damageType}'), post * 2, post))); 0 - routed`;

	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: actionId,
		params: {
			bundle: BUNDLE_ID,
			id: localActionId,
			required_capability: ATTACK_ACTION_CAPABILITY_ID,
			affordance_capability_id: perCreatureCapabilityId(creature),
			niche_id: ATTACK_VERB_NICHE_ID,
			display_name: `${creature.displayName} — ${breath.displayName}`,
			description:
				`${creature.displayName}'s ${breath.displayName}: DC ${breath.saveDc} ${breath.saveAbility} saving throw in AoE, ` +
				`dealing ${breath.diceExpr} ${breath.damageType} damage${breath.halfOnSave ? " (half on success)" : ""}.`,
			range_m: maxRangeM,
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			non_steering: true, // Round 3: concurrent party attacks; canon review required.
			consequence: {
				description: `${creature.displayName}'s ${breath.displayName}: ${breath.diceExpr} ${breath.damageType} save-half AoE.`,
				frame_writes: [
					{
						ForEachActorInRadius: {
							center_ref: "TargetSpatialRef",
							shape_id: shapeId,
							shape_params_json: shapeParamsJson,
							predicate_source: "",
							body: [
								{
									ModifyResource: {
										actor: "Actor",
										resource: HP_STATE_ID,
										delta_source: damageExpr,
									},
								},
							],
						},
					},
					monsterDeathFrameWrite(HP_STATE_ID, DEAD_CONDITION_ID),
				],
			},
		},
	};

	return {
		calls: [...perCreatureCapabilityCalls(creature), actionCall],
		actionId,
		capabilityId: perCreatureCapabilityId(creature),
	};
}

function unitBySlug(units: readonly CreatureUnit[], slug: string): CreatureUnit {
	const unit = units.find((candidate) => candidate.slug === slug);
	if (unit === undefined) {
		throw new Error(`starter-behaviors: no creature identity unit with slug '${slug}'.`);
	}
	return unit;
}

export interface StarterBehaviorResult {
	calls: VerbCall[];
	actionIds: string[];
	capabilityIds: string[];
	/** Every CR 0–4 creature slug covered by a baked ordinal action. */
	creatureSlugs: readonly string[];
	/** Full plan snapshot for coverage tests. */
	plans: readonly BestiaryPlan[];
}

function actionSlugForPlan(plan: MechanizedBestiaryPlan): string {
	if (plan.shape === "multiattack") return "multiattack";
	const first = plan.bakedAttacks[0];
	return first?.attackSlug ?? "attack";
}

function displayLabelForPlan(plan: MechanizedBestiaryPlan): string {
	if (plan.shape === "multiattack") return "Multiattack";
	return plan.bakedAttacks[0]?.displayName ?? "Attack";
}

/**
 * CR 0–4 baked-ordinal attack behaviors + the full classification plan.
 * Archetype-route creatures intentionally emit nothing here.
 */
export function buildStarterBehaviors(): StarterBehaviorResult {
	const units = buildCreatureUnits();
	const plans = buildBestiaryPlans();
	const calls: VerbCall[] = [];
	const actionIds: string[] = [];
	const capabilityIds: string[] = [];
	const creatureSlugs: string[] = [];
	const definedCapabilityIds = new Set<string>();

	const push = (
		slug: string,
		result: { calls: VerbCall[]; actionId: string; capabilityId: string },
	): void => {
		for (const call of result.calls) {
			if (call.toolName === "spellkave_define_capability") {
				const capId = `${call.params.bundle}/${call.params.id}`;
				if (definedCapabilityIds.has(capId)) continue;
				definedCapabilityIds.add(capId);
			}
			if (
				call.toolName === "spellkave_write_rows" &&
				call.params.kind === "entity_definition_initial_capability"
			) {
				const rows = call.params.rows as Array<{ entity_def_id: string; capability_id: string }>;
				const capKey = rows.map((r) => `${r.entity_def_id}->${r.capability_id}`).join(";");
				if (definedCapabilityIds.has(capKey)) continue;
				definedCapabilityIds.add(capKey);
			}
			calls.push(call);
		}
		actionIds.push(result.actionId);
		if (!capabilityIds.includes(result.capabilityId)) {
			capabilityIds.push(result.capabilityId);
		}
		if (!creatureSlugs.includes(slug)) {
			creatureSlugs.push(slug);
		}
	};

	for (const plan of plans) {
		if (plan.kind !== "mechanized") continue;
		const unit = unitBySlug(units, plan.slug);

		if (plan.route === "baked-ordinals" && plan.bakedAttacks.length > 0) {
			push(
				plan.slug,
				bakedOrdinalCalls(
					unit,
					plan.bakedAttacks,
					actionSlugForPlan(plan),
					displayLabelForPlan(plan),
				),
			);
		}

		if (plan.breaths && plan.breaths.length > 0) {
			for (const breath of plan.breaths) {
				push(plan.slug, bakedBreathCalls(unit, breath));
			}
		}

		if (plan.hasSpellcasting) {
			const magicGrantKey = `${unit.entityId}->${BUNDLE_ID}/action/magic`;
			if (!definedCapabilityIds.has(magicGrantKey)) {
				definedCapabilityIds.add(magicGrantKey);
				calls.push({
					toolName: "spellkave_write_rows",
					label: `grant-magic-capability-${plan.slug}`,
					params: {
						bundle: BUNDLE_ID,
						kind: "entity_definition_initial_capability",
						rows: [
							{
								entity_def_id: unit.entityId,
								capability_id: `${BUNDLE_ID}/action/magic`,
								bundle_id: BUNDLE_ID,
							},
						],
					},
				});
			}
			if (!creatureSlugs.includes(plan.slug)) {
				creatureSlugs.push(plan.slug);
			}
		}
	}

	// Starter multiattack presence guard — bears must still ship.
	for (const slug of ["black-bear", "brown-bear"] as const) {
		if (!creatureSlugs.includes(slug)) {
			throw new Error(`starter-behaviors: starter '${slug}' missing from baked CR 0–4 emission.`);
		}
	}

	return {
		calls,
		actionIds,
		capabilityIds,
		creatureSlugs,
		plans,
	};
}

/** Coverage-summary rows for baked bestiary behaviors. */
export function starterBehaviorUnitSummaries(result: StarterBehaviorResult): ChapterUnitSummary[] {
	return result.actionIds.map((id) => ({ kind: "action_definitions", id, sourcePk: "" }));
}

export { STARTER_SLUGS, resolveAttack };
export type { ResolvedAttack };
