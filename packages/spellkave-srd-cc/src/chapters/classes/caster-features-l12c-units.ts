// pattern: identity-tag-capability-grant
// L12c / sk-609b.12.3 — close caster-feature backlog BL-61..71 (expressible
// subset) + Eldritch Invocation live effects that compose from proven patterns.
//
// Patterns cited per fragment:
//   resource-spend-with-option-menu, actor-carried-feature-verb,
//   condition-grant-and-suppression, mastery-gated-attack-variant,
//   condition-hook-on-event (attempted for banked die; see verdict if refused),
//   item-sourced-damage / damage-type-routing (Divine Smite radiant).
//
// Wild Shape form-swap (BL-65) and true post-roll banked-die / Sculpt Spells
// cast-time ally exclusion land as substrate-verdicts when the attempt fails.
import type { ChapterUnitSummary } from "../chapter-types";
import {
	BONUS_CHANNEL_ID,
	PRIMARY_CHANNEL_ID,
	TURN_START_BOUNDARY_ID,
} from "../playing-the-game/action-economy-units";
import { AC_RESOURCE_ID } from "../playing-the-game/armor-class-units";
import { FRIGHTENED_LOCAL_ID, INCAPACITATED_LOCAL_ID } from "../playing-the-game/conditions-units";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../playing-the-game/cover-units";
import { CREATURE_NICHE_TAG } from "../playing-the-game/creature-type-units";
import { damageRollExpr } from "../playing-the-game/damage-units";
import { cappedHealingExpr } from "../playing-the-game/healing-units";
import { HP_ID } from "../playing-the-game/hp-units";
import {
	ABILITY_CHECK_RESOLUTION_SCOPE_ID,
	ATTACK_ROLL_RESOLUTION_SCOPE_ID,
} from "../playing-the-game/resolution-scope-units";
import type { VerbCall } from "../verb-runner";

// Local copies of parent-fragment ids — DO NOT import from caster-features-units
// (circular: that module spreads buildCasterFeaturesL12cCalls into its scene).
const BUNDLE_ID = "srd";
const CLERIC_CD_USES_RESOURCE_ID = `${BUNDLE_ID}/cleric/channel-divinity-uses`;
const CLERIC_CD_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/cleric/channel-divinity`;
const DIVINE_SPARK_HEAL_NICHE_ID = `capability:${CLERIC_CD_CAPABILITY_ID}`;
const LAY_ON_HANDS_RESOURCE_ID = `${BUNDLE_ID}/paladin/lay-on-hands`;
const LAY_ON_HANDS_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/paladin/lay-on-hands`;
const LAY_ON_HANDS_NICHE_ID = `capability:${LAY_ON_HANDS_CAPABILITY_ID}`;
const SORCERY_POINTS_RESOURCE_ID = `${BUNDLE_ID}/sorcerer/sorcery-points`;
const WILD_SHAPE_USES_RESOURCE_ID = `${BUNDLE_ID}/druid/wild-shape-uses`;
const BARDIC_CONDITION_ID = `${BUNDLE_ID}/condition/bardic-inspiration`;

const HP_STATE_ID = `${BUNDLE_ID}/${HP_ID}`;
const SPELL_SLOT_1 = `${BUNDLE_ID}/spell_slot_1`;
const SPELL_SLOT_2 = `${BUNDLE_ID}/spell_slot_2`;
const LEVEL_STAT = `${BUNDLE_ID}/level`;
const FRIGHTENED_ID = `${BUNDLE_ID}/${FRIGHTENED_LOCAL_ID}`;
const INCAPACITATED_ID = `${BUNDLE_ID}/${INCAPACITATED_LOCAL_ID}`;

const ft = (feet: number): number => Math.round(feet * 0.3048 * 1000) / 1000;

function gateUses(resourceId: string, n = 1): string {
	return `actor.stat('${resourceId}') >= ${n}`;
}

function gatePool(resourceId: string, unit: number): string {
	return `actor.stat('${resourceId}') >= ${unit}`;
}

// ── ids (exported for tests) ─────────────────────────────────────────────

export const DIVINE_SPARK_DAMAGE_ACTION_LOCAL_ID = "cleric/divine-spark-damage";
export const DIVINE_SPARK_DAMAGE_ACTION_ID = `${BUNDLE_ID}/${DIVINE_SPARK_DAMAGE_ACTION_LOCAL_ID}`;
export const TURN_UNDEAD_ACTION_LOCAL_ID = "cleric/turn-undead";
export const TURN_UNDEAD_ACTION_ID = `${BUNDLE_ID}/${TURN_UNDEAD_ACTION_LOCAL_ID}`;
export const PRESERVE_LIFE_ACTION_LOCAL_ID = "cleric/preserve-life";
export const PRESERVE_LIFE_ACTION_ID = `${BUNDLE_ID}/${PRESERVE_LIFE_ACTION_LOCAL_ID}`;
export const PRESERVE_LIFE_CAPABILITY_LOCAL_ID = "class-feature/cleric/life-domain/preserve-life";
export const PRESERVE_LIFE_CAPABILITY_ID = `${BUNDLE_ID}/${PRESERVE_LIFE_CAPABILITY_LOCAL_ID}`;

export const LAY_ON_HANDS_1_ACTION_LOCAL_ID = "paladin/lay-on-hands-1";
export const LAY_ON_HANDS_1_ACTION_ID = `${BUNDLE_ID}/${LAY_ON_HANDS_1_ACTION_LOCAL_ID}`;
export const LAY_ON_HANDS_10_ACTION_LOCAL_ID = "paladin/lay-on-hands-10";
export const LAY_ON_HANDS_10_ACTION_ID = `${BUNDLE_ID}/${LAY_ON_HANDS_10_ACTION_LOCAL_ID}`;

export const DIVINE_SMITE_ACTION_LOCAL_ID = "paladin/divine-smite";
export const DIVINE_SMITE_ACTION_ID = `${BUNDLE_ID}/${DIVINE_SMITE_ACTION_LOCAL_ID}`;
export const DIVINE_SMITE_CAPABILITY_LOCAL_ID = "class-feature/paladin/divine-smite";
export const DIVINE_SMITE_CAPABILITY_ID = `${BUNDLE_ID}/${DIVINE_SMITE_CAPABILITY_LOCAL_ID}`;
export const DIVINE_SMITE_NICHE_ID = `capability:${DIVINE_SMITE_CAPABILITY_ID}`;

export const FONT_CONVERT_SLOT1_LOCAL_ID = "sorcerer/convert-slot-1-to-points";
export const FONT_CONVERT_SLOT1_ID = `${BUNDLE_ID}/${FONT_CONVERT_SLOT1_LOCAL_ID}`;
export const FONT_CONVERT_SLOT2_LOCAL_ID = "sorcerer/convert-slot-2-to-points";
export const FONT_CONVERT_SLOT2_ID = `${BUNDLE_ID}/${FONT_CONVERT_SLOT2_LOCAL_ID}`;
export const FONT_CREATE_SLOT1_LOCAL_ID = "sorcerer/create-spell-slot-1";
export const FONT_CREATE_SLOT1_ID = `${BUNDLE_ID}/${FONT_CREATE_SLOT1_LOCAL_ID}`;
export const FONT_CREATE_SLOT2_LOCAL_ID = "sorcerer/create-spell-slot-2";
export const FONT_CREATE_SLOT2_ID = `${BUNDLE_ID}/${FONT_CREATE_SLOT2_LOCAL_ID}`;
export const FONT_CAPABILITY_LOCAL_ID = "class-feature/sorcerer/font-of-magic";
export const FONT_CAPABILITY_ID = `${BUNDLE_ID}/${FONT_CAPABILITY_LOCAL_ID}`;
export const FONT_NICHE_ID = `capability:${FONT_CAPABILITY_ID}`;

export const WILD_COMPANION_ACTION_LOCAL_ID = "druid/wild-companion";
export const WILD_COMPANION_ACTION_ID = `${BUNDLE_ID}/${WILD_COMPANION_ACTION_LOCAL_ID}`;
export const WILD_COMPANION_CAPABILITY_LOCAL_ID = "class-feature/druid/wild-companion";
export const WILD_COMPANION_CAPABILITY_ID = `${BUNDLE_ID}/${WILD_COMPANION_CAPABILITY_LOCAL_ID}`;
export const WILD_COMPANION_NICHE_ID = `capability:${WILD_COMPANION_CAPABILITY_ID}`;
export const FAMILIAR_ENTITY_DEF = `${BUNDLE_ID}/creature/cat`;

export const BARDIC_SPEND_DIE_ACTION_LOCAL_ID = "bard/spend-bardic-inspiration-die";
export const BARDIC_SPEND_DIE_ACTION_ID = `${BUNDLE_ID}/${BARDIC_SPEND_DIE_ACTION_LOCAL_ID}`;
export const BARDIC_SPENT_CONDITION_LOCAL_ID = "condition/bardic-inspiration-spent-boost";
export const BARDIC_SPENT_CONDITION_ID = `${BUNDLE_ID}/${BARDIC_SPENT_CONDITION_LOCAL_ID}`;

export const JACK_OF_ALL_TRADES_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/bard/jack-of-all-trades`;

export const DISCIPLE_OF_LIFE_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/cleric/life-domain/disciple-of-life`;
export const DISCIPLE_OF_LIFE_BONUS = 3; // 2 + spell level 1 (Cure Wounds L1 rider baked)

export const ARMOR_OF_SHADOWS_ACTION_LOCAL_ID = "warlock/armor-of-shadows";
export const ARMOR_OF_SHADOWS_ACTION_ID = `${BUNDLE_ID}/${ARMOR_OF_SHADOWS_ACTION_LOCAL_ID}`;
export const ARMOR_OF_SHADOWS_CAPABILITY_LOCAL_ID = "eldritch-invocation/armor-of-shadows";
export const ARMOR_OF_SHADOWS_CAPABILITY_ID = `${BUNDLE_ID}/${ARMOR_OF_SHADOWS_CAPABILITY_LOCAL_ID}`;
export const ARMOR_OF_SHADOWS_NICHE_ID = `capability:${ARMOR_OF_SHADOWS_CAPABILITY_ID}`;
export const MAGE_ARMOR_CONDITION_LOCAL_ID = "condition/mage-armor";
export const MAGE_ARMOR_CONDITION_ID = `${BUNDLE_ID}/${MAGE_ARMOR_CONDITION_LOCAL_ID}`;

export const CAREFUL_SPELL_ACTION_LOCAL_ID = "sorcerer/metamagic-careful-spell";
export const CAREFUL_SPELL_ACTION_ID = `${BUNDLE_ID}/${CAREFUL_SPELL_ACTION_LOCAL_ID}`;
export const CAREFUL_SPELL_CAPABILITY_LOCAL_ID = "metamagic/careful-spell";
export const CAREFUL_SPELL_CAPABILITY_ID = `${BUNDLE_ID}/${CAREFUL_SPELL_CAPABILITY_LOCAL_ID}`;
export const CAREFUL_SPELL_CONDITION_LOCAL_ID = "condition/metamagic-careful";
export const CAREFUL_SPELL_CONDITION_ID = `${BUNDLE_ID}/${CAREFUL_SPELL_CONDITION_LOCAL_ID}`;

function defineFeatureCapabilityCall(opts: {
	localId: string;
	displayName: string;
	description: string;
}): VerbCall {
	return {
		toolName: "spellkave_define_capability",
		label: `capability:${opts.localId}`,
		params: {
			bundle: BUNDLE_ID,
			id: opts.localId,
			actor_kind: "entity",
			display_name: opts.displayName,
			description: opts.description,
			tags: ["srd.action"],
		},
	};
}

function actorNicheCall(nicheId: string, displayName: string, label: string): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label: `niche:${label}`,
		params: {
			bundle: BUNDLE_ID,
			kind: "niche_definitions",
			rows: [
				{
					niche_id: nicheId,
					bundle_id: BUNDLE_ID,
					display_name: displayName,
					description:
						"sk-0m4.69: class features are actor-carried — capability carries this niche everywhere.",
					predicate_source: "",
					provider: "actor",
				},
			],
		},
	};
}

/** Verb calls appended into the caster-features throwaway scene (L12c). */
export function buildCasterFeaturesL12cCalls(): VerbCall[] {
	return [
		// Cross-fixture FKs (spell_slot_*, srd/ac modifier target, frightened/
		// incapacitated, srd/creature/cat) resolve via the pipeline `target`
		// the same way Arcane Recovery already resolves spell_slot_* (L12b).

		// ── BL-64 Disciple of Life (capability only; heal rider is on Cure Wounds) ─
		defineFeatureCapabilityCall({
			localId: "class-feature/cleric/life-domain/disciple-of-life",
			displayName: "Disciple of Life",
			description:
				"Life Domain Disciple of Life (classes.md:2964): when you cast a slot-heal spell, " +
				"target regains extra 2 + spell level HP. LIVE: Cure Wounds (+3) reads this capability.",
		}),

		// ── BL-63 Channel Divinity option menu ────────────────────────────
		// pattern: resource-spend-with-option-menu
		// Divine Spark (damage path) — CON save, half on success; radiant 1d8.
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${DIVINE_SPARK_DAMAGE_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: DIVINE_SPARK_DAMAGE_ACTION_LOCAL_ID,
				required_capability: CLERIC_CD_CAPABILITY_ID,
				niche_id: DIVINE_SPARK_HEAL_NICHE_ID,
				display_name: "Channel Divinity: Divine Spark (Damage)",
				description:
					"SRD Divine Spark damage path (classes.md:2221): Magic action, spend one Channel " +
					"Divinity use; target CON save DC 13 (baked) or take 1d8 Radiant (half on success). " +
					"Omits Wisdom modifier — same simplification as the heal path.",
				self_eligible: false,
				self_only: false,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gateUses(CLERIC_CD_USES_RESOURCE_ID),
				range_m: ft(30),
				resolution_mode: "Stochastic",
				// success = made the save → half damage; failure branch = full
				resolution_predicate_source: "d20 + 2 >= 13",
				on_failure: `${BUNDLE_ID}/${DIVINE_SPARK_DAMAGE_ACTION_LOCAL_ID}/failure`,
				consequence: {
					description: "Spend CD use; half radiant on successful CON save.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: CLERIC_CD_USES_RESOURCE_ID,
								delta_source: "-1",
							},
						},
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: HP_STATE_ID,
								delta_source: `0 - (${damageRollExpr({ diceExpr: "1d8" })} / 2)`,
							},
						},
					],
				},
			},
		},
		{
			toolName: "spellkave_define_consequence",
			label: `consequence:${DIVINE_SPARK_DAMAGE_ACTION_LOCAL_ID}/failure`,
			params: {
				bundle: BUNDLE_ID,
				id: `${DIVINE_SPARK_DAMAGE_ACTION_LOCAL_ID}/failure`,
				description:
					"Failed CON save: full 1d8 radiant (CD already spent on success path only — dual-write).",
				frame_writes: [
					{
						ModifyResource: {
							actor: "Actor",
							resource: CLERIC_CD_USES_RESOURCE_ID,
							delta_source: "-1",
						},
					},
					{
						ModifyResource: {
							actor: "TargetActor",
							resource: HP_STATE_ID,
							delta_source: `0 - (${damageRollExpr({ diceExpr: "1d8" })})`,
						},
					},
				],
			},
		},

		// Turn Undead — AoE undead Frightened + Incapacitated
		// pattern: resource-spend-with-option-menu + condition-grant-and-suppression
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${TURN_UNDEAD_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: TURN_UNDEAD_ACTION_LOCAL_ID,
				required_capability: CLERIC_CD_CAPABILITY_ID,
				niche_id: DIVINE_SPARK_HEAL_NICHE_ID,
				display_name: "Channel Divinity: Turn Undead",
				description:
					"SRD Turn Undead (classes.md:2223): Magic action, spend one CD use. Each Undead " +
					"within 30 ft makes a WIS save (DC 13 baked); on failure Frightened + Incapacitated. " +
					"A per-target save gates the conditions. Limits: the sphere ignores walls, and the " +
					"conditions do not yet end after 1 minute or on damage (sk-jay0.1.55.53).",
				self_eligible: true,
				self_only: true,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gateUses(CLERIC_CD_USES_RESOURCE_ID),
				consequence: {
					description: "Spend CD; undead in 30 ft sphere save or gain Frightened+Incapacitated.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: CLERIC_CD_USES_RESOURCE_ID,
								delta_source: "-1",
							},
						},
						{
							ForEachActorInRadius: {
								center_ref: "ActorSpatialRef",
								shape_id: "core/area/sphere",
								shape_params_json: JSON.stringify({ radius_m: ft(30) }),
								// Failed save: the DC 13 literal is the spell idiom; per-target gate per define_behavior docs.
								predicate_source:
									"actor.has_tag('srd.creature_type.undead') && d20 + (actor.stat('srd/wis') - 10) / 2 < 13",
								body: [
									{
										ApplyStatus: {
											target_kind: "entity",
											target_ref: "Actor",
											condition_definition_id: FRIGHTENED_ID,
										},
									},
									{
										ApplyStatus: {
											target_kind: "entity",
											target_ref: "Actor",
											condition_definition_id: INCAPACITATED_ID,
										},
									},
								],
							},
						},
					],
				},
			},
		},

		// Preserve Life (Life Domain) — single-target bloodied heal of 5×level
		// pattern: resource-spend-with-option-menu
		defineFeatureCapabilityCall({
			localId: PRESERVE_LIFE_CAPABILITY_LOCAL_ID,
			displayName: "Preserve Life",
			description:
				"Life Domain Channel Divinity: Preserve Life (classes.md:3001-3003). Multi-target " +
				"pool is approximated as single-target heal of 5×Cleric level on a bloodied creature.",
		}),
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${PRESERVE_LIFE_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: PRESERVE_LIFE_ACTION_LOCAL_ID,
				// Requires BOTH Channel Divinity and the domain feature capability —
				// gate on CD uses + required_capability = preserve-life (domain holders
				// also hold channel-divinity). Spend still hits the shared CD pool.
				required_capability: PRESERVE_LIFE_CAPABILITY_ID,
				niche_id: DIVINE_SPARK_HEAL_NICHE_ID,
				display_name: "Channel Divinity: Preserve Life",
				description:
					"SRD Preserve Life (classes.md:3001): spend one CD use; restore 5×Cleric level HP " +
					"to one bloodied creature within 30 ft (multi-split deferred; half-max cap deferred).",
				self_eligible: true,
				self_only: false,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source:
					`${gateUses(CLERIC_CD_USES_RESOURCE_ID)} && ` +
					`target.stat('${HP_STATE_ID}') * 2 < target.resource_max('${HP_STATE_ID}')`,
				range_m: ft(30),
				consequence: {
					description: "Spend CD; heal bloodied target 5×level HP.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: CLERIC_CD_USES_RESOURCE_ID,
								delta_source: "-1",
							},
						},
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: HP_STATE_ID,
								delta_source: cappedHealingExpr(`5 * actor.stat('${LEVEL_STAT}')`, "target"),
							},
						},
					],
				},
			},
		},

		// ── BL-67 Lay On Hands variable spend (discrete menu) ─────────────
		// pattern: resource-spend-with-option-menu
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${LAY_ON_HANDS_1_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: LAY_ON_HANDS_1_ACTION_LOCAL_ID,
				required_capability: LAY_ON_HANDS_CAPABILITY_ID,
				niche_id: LAY_ON_HANDS_NICHE_ID,
				display_name: "Lay On Hands (1 HP)",
				description: "Spend 1 pool to restore 1 HP (variable-spend menu rung).",
				self_eligible: true,
				self_only: false,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gatePool(LAY_ON_HANDS_RESOURCE_ID, 1),
				range_m: ft(5),
				consequence: {
					description: "Spend 1; heal 1.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: LAY_ON_HANDS_RESOURCE_ID,
								delta_source: "-1",
							},
						},
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: HP_STATE_ID,
								delta_source: cappedHealingExpr("1", "target"),
							},
						},
					],
				},
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${LAY_ON_HANDS_10_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: LAY_ON_HANDS_10_ACTION_LOCAL_ID,
				required_capability: LAY_ON_HANDS_CAPABILITY_ID,
				niche_id: LAY_ON_HANDS_NICHE_ID,
				display_name: "Lay On Hands (10 HP)",
				description: "Spend 10 pool to restore 10 HP (variable-spend menu rung).",
				self_eligible: true,
				self_only: false,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gatePool(LAY_ON_HANDS_RESOURCE_ID, 10),
				range_m: ft(5),
				consequence: {
					description: "Spend 10; heal 10.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: LAY_ON_HANDS_RESOURCE_ID,
								delta_source: "-10",
							},
						},
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: HP_STATE_ID,
								delta_source: cappedHealingExpr("10", "target"),
							},
						},
					],
				},
			},
		},

		// ── BL-68 Divine Smite (2024 Bonus Action after hit) ───────────────
		// pattern: mastery-gated-attack-variant + resource-spend-with-option-menu
		actorNicheCall(DIVINE_SMITE_NICHE_ID, "Divine Smite", "divine-smite"),
		defineFeatureCapabilityCall({
			localId: DIVINE_SMITE_CAPABILITY_LOCAL_ID,
			displayName: "Divine Smite",
			description:
				"Paladin Divine Smite (spells.md Divine Smite / classes.md Paladin's Smite): Bonus Action " +
				"immediately after a melee hit; spend a L1 spell slot for +2d8 Radiant on the target.",
		}),
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${DIVINE_SMITE_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: DIVINE_SMITE_ACTION_LOCAL_ID,
				required_capability: DIVINE_SMITE_CAPABILITY_ID,
				niche_id: CREATURE_NICHE_TAG,
				display_name: "Divine Smite",
				description:
					"Bonus Action: spend one level-1 spell slot; the target takes 2d8 Radiant damage " +
					"(higher-slot ladder and Fiend/Undead +1d8 deferred).",
				self_eligible: false,
				self_only: false,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gateUses(SPELL_SLOT_1),
				range_m: ft(5),
				resolution_scope: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
				consequence: {
					description: "Debit spell_slot_1; deal 2d8 radiant to TargetActor.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: SPELL_SLOT_1,
								delta_source: "-1",
							},
						},
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: HP_STATE_ID,
								delta_source: `0 - (${damageRollExpr({ diceExpr: "2d8" })})`,
							},
						},
					],
				},
			},
		},

		// ── BL-69 Font of Magic conversions ───────────────────────────────
		// pattern: resource-spend-with-option-menu
		actorNicheCall(FONT_NICHE_ID, "Font of Magic", "font-of-magic"),
		defineFeatureCapabilityCall({
			localId: FONT_CAPABILITY_LOCAL_ID,
			displayName: "Font of Magic",
			description:
				"Sorcerer Font of Magic (classes.md:7635): convert spell slots ↔ sorcery points. " +
				"L1-4 LIVE: slot1↔1 SP, slot2↔2 SP create costs 2/3 SP.",
		}),
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${FONT_CONVERT_SLOT1_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: FONT_CONVERT_SLOT1_LOCAL_ID,
				required_capability: FONT_CAPABILITY_ID,
				niche_id: FONT_NICHE_ID,
				display_name: "Convert Spell Slot (1) → Sorcery Points",
				description: "No action: expend a L1 slot to gain 1 Sorcery Point (classes.md:7643).",
				self_eligible: true,
				self_only: true,
				// unmetered — SRD "no action required"
				cost_time_ms: 0,
				predicate_source: gateUses(SPELL_SLOT_1),
				consequence: {
					description: "−1 spell_slot_1; +1 sorcery point.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: SPELL_SLOT_1,
								delta_source: "-1",
							},
						},
						{
							ModifyResource: {
								actor: "Actor",
								resource: SORCERY_POINTS_RESOURCE_ID,
								delta_source: "1",
							},
						},
					],
				},
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${FONT_CONVERT_SLOT2_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: FONT_CONVERT_SLOT2_LOCAL_ID,
				required_capability: FONT_CAPABILITY_ID,
				niche_id: FONT_NICHE_ID,
				display_name: "Convert Spell Slot (2) → Sorcery Points",
				description: "No action: expend a L2 slot to gain 2 Sorcery Points.",
				self_eligible: true,
				self_only: true,
				cost_time_ms: 0,
				predicate_source: gateUses(SPELL_SLOT_2),
				consequence: {
					description: "−1 spell_slot_2; +2 sorcery points.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: SPELL_SLOT_2,
								delta_source: "-1",
							},
						},
						{
							ModifyResource: {
								actor: "Actor",
								resource: SORCERY_POINTS_RESOURCE_ID,
								delta_source: "2",
							},
						},
					],
				},
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${FONT_CREATE_SLOT1_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: FONT_CREATE_SLOT1_LOCAL_ID,
				required_capability: FONT_CAPABILITY_ID,
				niche_id: FONT_NICHE_ID,
				display_name: "Create Spell Slot (1)",
				description: "Bonus Action: spend 2 Sorcery Points to create a L1 slot (classes.md table).",
				self_eligible: true,
				self_only: true,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gateUses(SORCERY_POINTS_RESOURCE_ID, 2),
				consequence: {
					description: "−2 SP; +1 spell_slot_1.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: SORCERY_POINTS_RESOURCE_ID,
								delta_source: "-2",
							},
						},
						{
							ModifyResource: {
								actor: "Actor",
								resource: SPELL_SLOT_1,
								delta_source: "1",
							},
						},
					],
				},
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${FONT_CREATE_SLOT2_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: FONT_CREATE_SLOT2_LOCAL_ID,
				required_capability: FONT_CAPABILITY_ID,
				niche_id: FONT_NICHE_ID,
				display_name: "Create Spell Slot (2)",
				description: "Bonus Action: spend 3 Sorcery Points to create a L2 slot (min Sorcerer 3).",
				self_eligible: true,
				self_only: true,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: `${gateUses(SORCERY_POINTS_RESOURCE_ID, 3)} && actor.stat('${LEVEL_STAT}') >= 3`,
				consequence: {
					description: "−3 SP; +1 spell_slot_2.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: SORCERY_POINTS_RESOURCE_ID,
								delta_source: "-3",
							},
						},
						{
							ModifyResource: {
								actor: "Actor",
								resource: SPELL_SLOT_2,
								delta_source: "1",
							},
						},
					],
				},
			},
		},

		// Metamagic Careful Spell — pre-cast marker condition (ally auto-success
		// on next save is cast-rider substrate; marker + SP spend is LIVE).
		// pattern: condition-grant-and-suppression + resource-spend-with-option-menu
		{
			toolName: "spellkave_define_condition",
			label: "condition:metamagic-careful",
			params: {
				bundle: BUNDLE_ID,
				id: CAREFUL_SPELL_CONDITION_LOCAL_ID,
				display_name: "Metamagic: Careful Spell (armed)",
				gate_predicate_source: "1 == 1",
				description:
					"Careful Spell armed (classes.md:7726). LIVE: marker only — per-ally auto-success " +
					"on the next save-spell is the same cast-rider gap as Sculpt Spells (BL-71).",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [],
			},
		},
		defineFeatureCapabilityCall({
			localId: CAREFUL_SPELL_CAPABILITY_LOCAL_ID,
			displayName: "Metamagic: Careful Spell",
			description: "Careful Spell Metamagic option (classes.md:7726). Cost 1 SP.",
		}),
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${CAREFUL_SPELL_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: CAREFUL_SPELL_ACTION_LOCAL_ID,
				required_capability: CAREFUL_SPELL_CAPABILITY_ID,
				niche_id: FONT_NICHE_ID,
				display_name: "Metamagic: Careful Spell",
				description: "Arm Careful Spell for 1 Sorcery Point (cast-time ally exclusion deferred).",
				self_eligible: true,
				self_only: true,
				cost_time_ms: 0,
				predicate_source: gateUses(SORCERY_POINTS_RESOURCE_ID, 1),
				consequence: {
					description: "−1 SP; apply Careful-armed self condition until turn_start.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: SORCERY_POINTS_RESOURCE_ID,
								delta_source: "-1",
							},
						},
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: CAREFUL_SPELL_CONDITION_ID,
								expires_at_boundary: {
									boundary_id: TURN_START_BOUNDARY_ID,
									owner_actor: "Actor",
								},
							},
						},
					],
				},
			},
		},

		// ── BL-66 Wild Companion ───────────────────────────────────────────
		// pattern: actor-carried-feature-verb (spend wild-shape use + Spawn)
		actorNicheCall(WILD_COMPANION_NICHE_ID, "Wild Companion", "wild-companion"),
		defineFeatureCapabilityCall({
			localId: WILD_COMPANION_CAPABILITY_LOCAL_ID,
			displayName: "Wild Companion",
			description:
				"Druid Wild Companion (classes.md:3588): Magic action, expend a Wild Shape use to " +
				"cast Find Familiar without Material components. LIVE: Spawn srd/creature/cat as Fey-ish familiar.",
		}),
		// Spawn is EffectPrimitive (not FrameWriteOp) — effect_ref → effect_definitions.
		{
			toolName: "spellkave_write_rows",
			label: "effect:wild-companion-spawn",
			params: {
				bundle: BUNDLE_ID,
				kind: "effect_definitions",
				rows: [
					{
						effect_def_id: `${BUNDLE_ID}/druid/wild-companion/spawn`,
						bundle_id: BUNDLE_ID,
						primitives_csv: "Spawn",
						description: "Wild Companion: Spawn srd/creature/cat at the caster's node.",
						parameters_schema_json: JSON.stringify({
							blueprint_id: FAMILIAR_ENTITY_DEF,
							location_ref: { kind: "binding", id: "ActorSpatialRef" },
						}),
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${WILD_COMPANION_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: WILD_COMPANION_ACTION_LOCAL_ID,
				required_capability: WILD_COMPANION_CAPABILITY_ID,
				niche_id: WILD_COMPANION_NICHE_ID,
				display_name: "Wild Companion",
				description:
					"Magic action: spend one Wild Shape use; summon a cat familiar at your node " +
					"(Find Familiar without a slot — classes.md:3588).",
				self_eligible: true,
				self_only: true,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: gateUses(WILD_SHAPE_USES_RESOURCE_ID),
				consequence: {
					description: "Spend Wild Shape use; Spawn cat familiar via effect_ref.",
					effect_ref: `${BUNDLE_ID}/druid/wild-companion/spawn`,
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: WILD_SHAPE_USES_RESOURCE_ID,
								delta_source: "-1",
							},
						},
					],
				},
			},
		},

		// ── BL-61 Bardic Inspiration banked die (improved) ────────────────
		// pattern: condition-grant-and-suppression (+ attempt condition-hook-on-event)
		// Ally self-action spends the banked die into a short-lived +3 boost.
		// True post-roll auto-add remains substrate (see docs/substrate-verdicts/).
		{
			toolName: "spellkave_define_condition",
			label: "condition:bardic-inspiration-spent-boost",
			params: {
				bundle: BUNDLE_ID,
				id: BARDIC_SPENT_CONDITION_LOCAL_ID,
				display_name: "Bardic Inspiration Die (spent)",
				gate_predicate_source: "1 == 1",
				description:
					"Short-lived +3 (d6 mean) after spending a banked Bardic Inspiration die. " +
					"Expires at next turn_start of the holder.",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [
					{
						id: "condition/bardic-inspiration-spent-boost/ability-check",
						display_name: "Bardic Die: +3 ability checks",
						applies_to: ABILITY_CHECK_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let bonus = 3; bonus",
						delta_kind: "Plus",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${BARDIC_SPEND_DIE_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: BARDIC_SPEND_DIE_ACTION_LOCAL_ID,
				// Ungated capability — anyone holding the condition may spend.
				required_capability: "",
				niche_id: CREATURE_NICHE_TAG,
				display_name: "Spend Bardic Inspiration Die",
				description:
					"Expend your banked Bardic Inspiration die (classes.md:856-858). LIVE: removes " +
					"the banked condition and grants a short-lived +3 ability-check boost. True " +
					"post-roll auto-spend on a failed D20 Test is substrate (BL-61 remainder).",
				self_eligible: true,
				self_only: true,
				cost_time_ms: 0,
				predicate_source: `actor.status('${BARDIC_CONDITION_ID}') == true`,
				consequence: {
					description: "Remove banked die; apply short-lived +3 boost.",
					frame_writes: [
						{
							RemoveCondition: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: BARDIC_CONDITION_ID,
								source_match: "Any",
							},
						},
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: BARDIC_SPENT_CONDITION_ID,
								expires_at_boundary: {
									boundary_id: TURN_START_BOUNDARY_ID,
									owner_actor: "Actor",
								},
							},
						},
					],
				},
			},
		},

		// ── Eldritch Invocation: Armor of Shadows ─────────────────────────
		// pattern: actor-carried-feature-verb + condition-grant-and-suppression
		actorNicheCall(ARMOR_OF_SHADOWS_NICHE_ID, "Armor of Shadows", "armor-of-shadows"),
		defineFeatureCapabilityCall({
			localId: ARMOR_OF_SHADOWS_CAPABILITY_LOCAL_ID,
			displayName: "Armor of Shadows",
			description:
				"Eldritch Invocation Armor of Shadows (classes.md): cast Mage Armor on self without a slot.",
		}),
		{
			toolName: "spellkave_define_condition",
			label: "condition:mage-armor",
			params: {
				bundle: BUNDLE_ID,
				id: MAGE_ARMOR_CONDITION_LOCAL_ID,
				display_name: "Mage Armor",
				gate_predicate_source: "1 == 1",
				description: "Mage Armor AC baseline 13 + Dex (simplified as +3 AC Plus while active).",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [
					{
						id: "condition/mage-armor/ac",
						display_name: "Mage Armor: +3 AC",
						applies_to: AC_RESOURCE_ID,
						modifier_expression_source: "let bonus = 3; bonus",
						delta_kind: "Plus",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${ARMOR_OF_SHADOWS_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: ARMOR_OF_SHADOWS_ACTION_LOCAL_ID,
				required_capability: ARMOR_OF_SHADOWS_CAPABILITY_ID,
				niche_id: ARMOR_OF_SHADOWS_NICHE_ID,
				display_name: "Armor of Shadows",
				description: "Cast Mage Armor on yourself without expending a spell slot.",
				self_eligible: true,
				self_only: true,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				consequence: {
					description: "Apply Mage Armor self condition.",
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: MAGE_ARMOR_CONDITION_ID,
							},
						},
					],
				},
			},
		},
	];
}

export function casterFeaturesL12cUnits(): ChapterUnitSummary[] {
	return [
		{
			kind: "action_definitions",
			id: DIVINE_SPARK_DAMAGE_ACTION_ID,
			sourcePk: "classes.md:2221",
		},
		{ kind: "action_definitions", id: TURN_UNDEAD_ACTION_ID, sourcePk: "classes.md:2223" },
		{
			kind: "action_definitions",
			id: PRESERVE_LIFE_ACTION_ID,
			sourcePk: "classes.md:3001-3003",
		},
		{
			kind: "action_definitions",
			id: LAY_ON_HANDS_1_ACTION_ID,
			sourcePk: "srd-2024_paladin_lay-on-hands",
		},
		{
			kind: "action_definitions",
			id: LAY_ON_HANDS_10_ACTION_ID,
			sourcePk: "srd-2024_paladin_lay-on-hands",
		},
		{
			kind: "action_definitions",
			id: DIVINE_SMITE_ACTION_ID,
			sourcePk: "srd-2024_divine-smite",
		},
		{
			kind: "action_definitions",
			id: FONT_CONVERT_SLOT1_ID,
			sourcePk: "classes.md:7643",
		},
		{
			kind: "action_definitions",
			id: FONT_CREATE_SLOT1_ID,
			sourcePk: "classes.md:7645-7685",
		},
		{
			kind: "action_definitions",
			id: WILD_COMPANION_ACTION_ID,
			sourcePk: "classes.md:3588",
		},
		{
			kind: "action_definitions",
			id: BARDIC_SPEND_DIE_ACTION_ID,
			sourcePk: "classes.md:856-858",
		},
		{
			kind: "action_definitions",
			id: ARMOR_OF_SHADOWS_ACTION_ID,
			sourcePk: "classes.md Eldritch Invocation Options: Armor of Shadows",
		},
		{
			kind: "action_definitions",
			id: CAREFUL_SPELL_ACTION_ID,
			sourcePk: "classes.md:7726",
		},
		{
			kind: "capability_definitions",
			id: JACK_OF_ALL_TRADES_CAPABILITY_ID,
			sourcePk: "classes.md:894-898",
		},
		{
			kind: "capability_definitions",
			id: DISCIPLE_OF_LIFE_CAPABILITY_ID,
			sourcePk: "classes.md:2964",
		},
		{
			kind: "condition_definitions",
			id: BARDIC_SPENT_CONDITION_ID,
			sourcePk: "classes.md:856-858",
		},
	];
}
