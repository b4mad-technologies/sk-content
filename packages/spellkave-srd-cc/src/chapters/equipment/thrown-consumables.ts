// Thrown consumables (sk-jay0.3.19.6 slice 1): Acid, Alchemist's Fire and
// Holy Water become an authored "throw" verb each. Oil stays declared (BL-82):
// its rider needs a damage-type-aware event hook the substrate does not have.
//
// pattern: offer-vs-resolution-roll
// pattern: consumable-inventory-consume
// pattern: damage-type-routing
//
// Source (cache/markdown/equipment.md § Adventuring Gear): "When you take the
// Attack action, you can replace one of your attacks with throwing a vial of
// Acid. Target one creature or object you can see within 20 feet of yourself.
// The target must succeed on a Dexterity saving throw (DC 8 plus your
// Dexterity modifier and Proficiency Bonus) or take 2d6 Acid damage." The
// other two items share the sentence shape; every number below is parsed from
// the cache and the parse throws on any drift.
//
// Shape (one row set per item):
// - OFFER: the actor's own srd/action/attack capability on the actor-carried
//   attack niche, gated on carrying the item, the source range, and a
//   srd.creature target. No die, no target defence read. Objects are not
//   offered: the resolution reads srd/dex and the hit writes srd/hp, which
//   an object does not carry (the source allows objects for Acid and
//   Alchemist's Fire; declared in BL-82).
// - RESOLUTION: the target's Dexterity save, written from the thrower's side
//   (see throwResolutionExpr; roll-bias limit there). Success means the
//   flask lands.
// - CONSEQUENCE: both branches remove one item first (RemoveItem rejects the
//   attempt atomically when none is carried). A landed flask deals routed
//   damage; a dodged one leaves the shared attack-miss trace.
import { readFileSync } from "node:fs";
import path from "node:path";
import { type AuthorTarget, routeDamage } from "@spellkave/tool-authoring";

import { CACHE_MARKDOWN_DIR } from "../../markdown/paths.ts";
import type { ChapterUnitSummary } from "../chapter-types.ts";
import { PRIMARY_CHANNEL_ID } from "../playing-the-game/action-economy-units";
import { BUNDLE_ID } from "../playing-the-game/constants";
import { damageRollExpr } from "../playing-the-game/damage-units";
import { characterUnconsciousFrameWrite } from "../playing-the-game/death-saves-units";
import {
	DEAD_CONDITION_ID,
	UNCONSCIOUS_CONDITION_ID,
} from "../playing-the-game/fragments/conditions";
import {
	DEATH_SAVE_FAILURES_ID,
	DEATH_SAVE_LAST_ROLL_ID,
	DEATH_SAVE_SUCCESSES_ID,
} from "../playing-the-game/fragments/death-saves";
import { HP_ID } from "../playing-the-game/hp-units";
import {
	ABILITY_MODIFIER_MACRO_ID,
	PROFICIENCY_BONUS_STATE_ID,
} from "../playing-the-game/modifier-units";
import {
	ATTACK_VERB_NICHE_LOCAL_ID,
	attackMissInscribeFrameWrite,
	monsterDeathFrameWrite,
} from "../playing-the-game/weapon-attack-units";
import { driveUnitScene, type VerbCall } from "../verb-runner.ts";

export const THROWN_CONSUMABLES_PATH = "base/equipment/thrown-consumables.toml";
export const ATTACK_CAPABILITY_ID = `${BUNDLE_ID}/action/attack`;
const HP_RESOURCE_ID = `${BUNDLE_ID}/${HP_ID}`;
const ATTACK_VERB_NICHE_ID = `${BUNDLE_ID}/${ATTACK_VERB_NICHE_LOCAL_ID}`;
const DEX_MODIFIER_MACRO_ID = `${BUNDLE_ID}/dexterity_modifier`;
const DEX_SCORE_ID = `${BUNDLE_ID}/dex`;
const MM_PER_FOOT = 304.8;
const CREATURE_TAG = `${BUNDLE_ID}.creature`;

/** One thrown item, with every number read from the SRD section. */
export interface ThrownConsumableUnit {
	slug: string;
	itemId: string;
	actionId: string;
	displayName: string;
	heading: string;
	rangeFeet: number;
	/** "creature or object" or "creature", as the source words the target. */
	targetNoun: string;
	dice: string;
	damageType: string;
	/** Creature-type tags the damage is limited to; empty means every target. */
	onlyCreatureTypes: readonly string[];
	/** Source clause the shipped verb leaves out, if any. */
	unmodelledRider?: string;
}

interface ThrownSpec {
	slug: string;
	displayName: string;
	heading: string;
	onlyCreatureTypes: readonly string[];
	unmodelledRider?: string;
}

const SPECS: readonly ThrownSpec[] = [
	{ slug: "acid", displayName: "Acid", heading: "Acid (25 GP)", onlyCreatureTypes: [] },
	{
		slug: "alchemists-fire",
		displayName: "Alchemist's Fire",
		heading: "Alchemist's Fire (50 GP)",
		onlyCreatureTypes: [],
		unmodelledRider: "and start burning",
	},
	{
		slug: "holy-water",
		displayName: "Holy Water",
		heading: "Holy Water (25 GP)",
		onlyCreatureTypes: ["fiend", "undead"],
	},
];

const SAVE_CLAUSE =
	"The target must succeed on a Dexterity saving throw (DC 8 plus your Dexterity modifier and Proficiency Bonus)";
const ATTACK_REPLACEMENT_CLAUSE =
	"When you take the Attack action, you can replace one of your attacks with throwing";

function sectionText(heading: string): string {
	const lines = readFileSync(path.join(CACHE_MARKDOWN_DIR, "equipment.md"), "utf8").split("\n");
	const start = lines.findIndex((line) => line.trim() === `#### ${heading}`);
	if (start === -1)
		throw new Error(`thrown-consumables: heading '${heading}' not in equipment.md.`);
	const body: string[] = [];
	for (const line of lines.slice(start + 1)) {
		if (/^#{1,4}\s/.test(line)) break;
		body.push(line);
	}
	return body.join(" ").replace(/\s+/g, " ").trim();
}

/** Parse the four thrown-consumable facts from the cached SRD text; throws on any drift. */
export function thrownConsumableUnits(): ThrownConsumableUnit[] {
	return SPECS.map((spec) => {
		const text = sectionText(spec.heading);
		if (!text.includes(ATTACK_REPLACEMENT_CLAUSE) || !text.includes(SAVE_CLAUSE)) {
			throw new Error(`thrown-consumables: '${spec.heading}' lost its attack/save clauses.`);
		}
		const range = /within (\d+) feet of yourself/.exec(text);
		const targetNoun = /Target one (creature or object|creature)\b/.exec(text)?.[1];
		if (targetNoun === undefined) {
			throw new Error(`thrown-consumables: '${spec.heading}' target sentence did not parse.`);
		}
		const damage = /take (\d+d\d+) (\w+) damage/.exec(text);
		if (range?.[1] === undefined || damage?.[1] === undefined || damage[2] === undefined) {
			throw new Error(`thrown-consumables: '${spec.heading}' range or damage did not parse.`);
		}
		for (const type of spec.onlyCreatureTypes) {
			const typeName = type.charAt(0).toUpperCase() + type.slice(1);
			if (!text.includes(typeName)) {
				throw new Error(`thrown-consumables: '${spec.heading}' no longer names ${typeName}.`);
			}
		}
		if (spec.unmodelledRider !== undefined && !text.includes(spec.unmodelledRider)) {
			throw new Error(`thrown-consumables: '${spec.heading}' rider text changed.`);
		}
		const itemId = `${BUNDLE_ID}/item/${spec.slug}`;
		return {
			slug: spec.slug,
			itemId,
			actionId: `${itemId}/throw`,
			displayName: spec.displayName,
			heading: spec.heading,
			rangeFeet: Number(range[1]),
			targetNoun,
			dice: damage[1],
			damageType: damage[2].toLowerCase(),
			onlyCreatureTypes: spec.onlyCreatureTypes,
			...(spec.unmodelledRider === undefined ? {} : { unmodelledRider: spec.unmodelledRider }),
		};
	});
}

/** The thrower's save DC: 8 + Dexterity modifier + Proficiency Bonus. */
export function throwSaveDcExpr(): string {
	return `8 + macro('${DEX_MODIFIER_MACRO_ID}') + actor.stat('${PROFICIENCY_BONUS_STATE_ID}')`;
}

/**
 * The target's Dexterity save, written from the thrower's side.
 *
 * The target saves when `r + mod >= DC` for its own d20 `r`. With `u = 21 - r`
 * (also uniform on 1..20) the flask lands exactly when `u + DC - mod >= 22`,
 * so both forms have the same odds when no roll bias applies.
 *
 * Roll-bias limit (sk-jay0.2.41): the kernel's d20 is actor-oriented
 * (server/src/world_interaction/layer2/r_manipulate/roll_bias.rs). No
 * `resolution_scope` is set, so the thrower's own scoped modifiers stay out,
 * and so do the TARGET's own save modifiers (Dodge's `srd/dex_save`
 * Advantage, the potions' `mod_dex_save`): no route carries a target-carried
 * scoped modifier onto this d20. What IS applied is the target's unscoped
 * against-bearer axis (`ResolutionCheck`, "attacks against the bearer"):
 * an Invisible target gets de-facto Advantage on the save, a target of
 * Reckless Attack de-facto Disadvantage, and Dodge's attack Disadvantage only
 * coincides with the SRD's save Advantage. The live test pins this.
 */
export function throwResolutionExpr(): string {
	return (
		`let throw_roll = d20; throw_roll + (${throwSaveDcExpr()}) - ` +
		`macro('${ABILITY_MODIFIER_MACRO_ID}', target.effective('${DEX_SCORE_ID}')) >= 22`
	);
}

export function throwRangeMillimetres(unit: ThrownConsumableUnit): number {
	return Math.round(unit.rangeFeet * MM_PER_FOOT);
}

/** Offer gate: carries the item, a creature target within the source range. */
export function throwOfferPredicate(unit: ThrownConsumableUnit): string {
	return (
		`actor.has_item('${unit.itemId}') && target.has_tag('${CREATURE_TAG}') && ` +
		`target.stat('core/distance_to_actor_mm') <= ${throwRangeMillimetres(unit)}`
	);
}

/** Landed-flask HP delta: routed damage, limited to the named creature types when the source says so. */
export function throwDamageDeltaExpr(unit: ThrownConsumableUnit): string {
	const routed = routeDamage(damageRollExpr({ diceExpr: unit.dice }), unit.damageType, {
		subject: "target",
	});
	if (unit.onlyCreatureTypes.length === 0) return routed;
	const gate = unit.onlyCreatureTypes
		.map((type) => `target.has_tag('srd.creature_type.${type}')`)
		.join(" || ");
	return `cond(${gate}, (${routed}), 0)`;
}

function removeOneWrite(unit: ThrownConsumableUnit): Record<string, unknown> {
	return {
		RemoveItem: {
			count: 1,
			source: { ActorInventoryItem: { actor_ref: "Actor", item_def_id: unit.itemId } },
		},
	};
}

const PC_UNCONSCIOUS_AT_ZERO = characterUnconsciousFrameWrite(
	HP_RESOURCE_ID,
	UNCONSCIOUS_CONDITION_ID,
	DEATH_SAVE_SUCCESSES_ID,
	DEATH_SAVE_FAILURES_ID,
	DEATH_SAVE_LAST_ROLL_ID,
);

function creatureTypeWithArticle(type: string): string {
	const name = type.charAt(0).toUpperCase() + type.slice(1);
	return /^[AEIOU]/.test(name) ? `an ${name}` : `a ${name}`;
}

function damageSentence(unit: ThrownConsumableUnit): string {
	const base = `${unit.dice} ${unit.damageType} damage`;
	return unit.onlyCreatureTypes.length === 0
		? base
		: `${base} if it is ${unit.onlyCreatureTypes.map(creatureTypeWithArticle).join(" or ")}`;
}

function unitCalls(unit: ThrownConsumableUnit): VerbCall[] {
	const localId = unit.actionId.slice(`${BUNDLE_ID}/`.length);
	const dodgedCall: VerbCall = {
		toolName: "spellkave_define_consequence",
		label: `${localId}/dodged`,
		params: {
			bundle: BUNDLE_ID,
			id: `${localId}/dodged`,
			description: `${unit.displayName} thrown: the target saves. One is used up, no damage.`,
			frame_writes: [
				removeOneWrite(unit),
				attackMissInscribeFrameWrite(`${unit.displayName} misses`),
			],
		},
	};
	const actionCall: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: localId,
		params: {
			bundle: BUNDLE_ID,
			id: localId,
			required_capability: ATTACK_CAPABILITY_ID,
			niche_id: ATTACK_VERB_NICHE_ID,
			display_name: `Throw ${unit.displayName}`,
			description:
				`In place of one attack, throw ${unit.displayName} at a creature within ` +
				`${unit.rangeFeet} feet. It makes a Dexterity saving throw against 8 plus your Dexterity ` +
				`modifier and Proficiency Bonus, or takes ${damageSentence(unit)}.`,
			predicate_source: throwOfferPredicate(unit),
			resolution_mode: "Stochastic",
			resolution_predicate_source: throwResolutionExpr(),
			on_failure: `${unit.actionId}/dodged`,
			range_m: throwRangeMillimetres(unit) / 1000,
			accepts_global_storm: true,
			cost_time_ms: 0,
			spends_channel: PRIMARY_CHANNEL_ID,
			non_steering: true, // Round 3: concurrent party attacks; canon review required.
			consequence: {
				description: `${unit.displayName} thrown: the target fails its save. One is used up; it takes ${damageSentence(unit)}.`,
				frame_writes: [
					removeOneWrite(unit),
					{
						ModifyResource: {
							actor: "TargetActor",
							resource: HP_RESOURCE_ID,
							delta_source: throwDamageDeltaExpr(unit),
						},
					},
					monsterDeathFrameWrite(HP_RESOURCE_ID, DEAD_CONDITION_ID),
					PC_UNCONSCIOUS_AT_ZERO,
				],
			},
		},
	};
	return [dodgedCall, actionCall];
}

export async function buildThrownConsumablesFragment(
	target?: AuthorTarget,
): Promise<{ path: string; toml: string; units: ChapterUnitSummary[] }> {
	const units = thrownConsumableUnits();
	const body = await driveUnitScene(BUNDLE_ID, units.flatMap(unitCalls), target);
	return {
		path: THROWN_CONSUMABLES_PATH,
		toml:
			"# GENERATED by src/chapters/equipment/thrown-consumables.ts — DO NOT EDIT BY HAND.\n" +
			"# Regenerate: pnpm --filter @spellkave/srd-cc run generate\n" +
			"#\n" +
			"# pattern: offer-vs-resolution-roll\n" +
			"# pattern: consumable-inventory-consume\n" +
			"# pattern: damage-type-routing\n" +
			"#\n" +
			"# Thrown consumables: one throw verb per item on the actor-carried attack\n" +
			"# niche. Offer = carries the item + source range; resolution = the\n" +
			"# target's Dexterity save written from the thrower's side; both branches\n" +
			"# remove one item. Oil and Alchemist's Fire burning stay declared (BL-82).\n" +
			"# markdown: equipment.md § Adventuring Gear (Acid, Alchemist's Fire, Holy Water)\n\n" +
			body,
		units: units.map((unit) => ({
			kind: "action_definitions",
			id: unit.actionId,
			sourcePk: `equipment.md#${unit.heading}`,
		})),
	};
}
