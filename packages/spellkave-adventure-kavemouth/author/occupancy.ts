/**
 * // pattern: blueprint-instance-override
 *
 * Kit definitions, NPCs, furniture — place_actor / place_entity.
 * The pregen hero body is not seeded (sk-0m4.44); see hero.ts / reference/renn.toml.
 */

import {
	DIALOG_OPEN_RESOURCE_ID,
	DIALOG_PROMPT_RESOURCE_ID,
} from "@spellkave/adventure-runtime/dm/dialog";
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import {
	AC_RESOURCE_ID,
	DM_NPC_TALKER_TAG,
	HP_ID,
	SRD_BUNDLE_ID,
} from "@spellkave/adventure-runtime/srd-ids";
import { combatantOccupancy } from "./combatants.ts";
import { starterKitDefinitions } from "./hero.ts";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";

export const INNKEEPER_KEY_PREFIX = "adventure/innkeeper";
// (No INNKEEPER_DEF_LOCAL_ID: this scene no longer defines its own innkeeper
// type — it references the srd bundle's blueprint by FULL id below.)
/**
 * Mira IS an SRD Commoner — so she now instantiates the Monsters chapter's
 * own `srd/creature/commoner` blueprint (`chapters/monsters/creature-units.ts`)
 * instead of an `kavemouth`-local hand-copy of it. The retired local def
 * carried exactly AC 10 / HP 4 and cited the very same source line
 * (`cache/markdown/monsters-A-Z.md:4059-4060`) that the shipped blueprint is
 * generated from; adopting it is a strict upgrade — she additionally gains
 * the six ability scores, walk speed, proficiency bonus and the
 * size/CR/alignment tags the hand-copy never carried.
 *
 * A cross-bundle entity_def REFERENCE is legal (MF-VAL-291; `kavemouth`
 * declares `depends_on = ["srd"]`). Adopting a blueprint takes its numbers
 * wholesale unless the placement authors an admission-time `object_state`
 * override (`place_actor.resources`) — Mira wants the Commoner wholesale.
 * The Slime Scout placement uses that override for HP; the Warden takes catalog XP.
 */
export const INNKEEPER_DEF_ID = `${SRD_BUNDLE_ID}/creature/commoner`;
export const INNKEEPER_ENTITY_KEY = `${BUNDLE}/${INNKEEPER_KEY_PREFIX}_1`;
export const INNKEEPER_DISPLAY_NAME = "Mira";
export const INNKEEPER_PLACE_NODE_ID = nodeId(GRAPHS.inn, "bar");

export const BAR_FURNITURE_KEY = `${BUNDLE}/adventure/furniture/bar_1`;
export const HEARTH_FURNITURE_KEY = `${BUNDLE}/adventure/furniture/hearth_1`;
export const TOMB_CHEST_KEY = `${BUNDLE}/adventure/item/tomb_chest_1`;

export const BAR_DEF_LOCAL_ID = "adventure/furniture/bar";
export const BAR_DEF_ID = `${BUNDLE}/${BAR_DEF_LOCAL_ID}`;
export const HEARTH_DEF_LOCAL_ID = "adventure/furniture/hearth";
export const HEARTH_DEF_ID = `${BUNDLE}/${HEARTH_DEF_LOCAL_ID}`;
export const TOMB_CHEST_DEF_LOCAL_ID = "adventure/item/tomb_chest";
export const TOMB_CHEST_DEF_ID = `${BUNDLE}/${TOMB_CHEST_DEF_LOCAL_ID}`;

const HP_STATE_ID = `${SRD_BUNDLE_ID}/${HP_ID}`;

export function occupancy(): VerbCall[] {
	return [
		...starterKitDefinitions(),
		...combatantOccupancy(),
		// NO `define-innkeeper` call: Mira instantiates the shipped
		// `srd/creature/commoner` blueprint (INNKEEPER_DEF_ID's own doc
		// comment). That blueprint already carries every property the retired
		// local def existed to supply — the `srd.creature` communicable-niche
		// tag sk-6xk needs for Speak to target her at all, `srd.creature_type.
		// humanoid`, and the AC 10 / HP 4 that keep her meaningfully hittable
		// rather than silently unwinnable if the hero swings at her.
		{
			toolName: "spellkave_place_actor",
			label: "place-innkeeper",
			params: {
				bundle: BUNDLE,
				kind: "npc",
				entity_def: INNKEEPER_DEF_ID,
				at: INNKEEPER_PLACE_NODE_ID,
				key_prefix: INNKEEPER_KEY_PREFIX,
				name: INNKEEPER_DISPLAY_NAME,
				description: "Innkeeper Mira",
				tags: [DM_NPC_TALKER_TAG],
				// ADR-0142 D-1: dm/dialog/prompt seeded alongside dm/dialog/open —
				// see `dm-npc.ts`'s identical comment on Aldwin's own row.
				resources: [
					{ resource: DIALOG_OPEN_RESOURCE_ID, value: 0 },
					{ resource: DIALOG_PROMPT_RESOURCE_ID, value: 0 },
				],
			},
		},
		// Mira's Commoner blueprint carries source-derived
		// srd.communication.vocal, so Speak is a definition-tag grant rather
		// than an instance row. sk-0m4.4 retired the place-side speech
		// attachments: Speak Aloud is actor-carried and Speak To / Speak Aloud
		// to Room reuse the entity-provided communicable niche, so neither
		// needs a spatial_niche_attachment at the bar.
		// actor-carried-verbs D5 (design.md's own Risks section: "you CAN hit a
		// bar"): the bar counter, hearth, and tomb chest each get a real
		// entity_def now (previously def-less `spellkave_place_entity` calls)
		// so `srd/ac`/`srd/hp` can be seeded AT ENTITY-DEFINITION LEVEL, per
		// SRD 5.2's Object Armor Class / Object Hit Points tables
		// (cache/markdown/rules-glossary.md:281-353).
		{
			toolName: "spellkave_define_entity_type",
			label: "define-bar",
			params: {
				bundle: BUNDLE,
				id: BAR_DEF_LOCAL_ID,
				display_name: "Bar Counter",
				description: "The oak counter of the Lamp and Ladle's common room.",
				// Wood: AC 15 (Object Armor Class table, rules-glossary.md:307).
				// Medium/Fragile: 4 (1d8) HP (Object Hit Points table,
				// rules-glossary.md:343-345) — a modest number so the counter is
				// breakable without needing many hits.
				initial_states: [
					{ state: AC_RESOURCE_ID, value_int: 15 },
					{ state: HP_STATE_ID, value_int: 4 },
				],
			},
		},
		{
			toolName: "spellkave_place_entity",
			label: "place-bar",
			params: {
				bundle: BUNDLE,
				kind: "item",
				entity_def: BAR_DEF_ID,
				at: nodeId(GRAPHS.inn, "bar"),
				key_prefix: "adventure/furniture/bar",
				name: "Bar Counter",
				description: "Bar Counter",
			},
		},
		{
			toolName: "spellkave_define_entity_type",
			label: "define-hearth",
			params: {
				bundle: BUNDLE,
				id: HEARTH_DEF_LOCAL_ID,
				display_name: "Hearth",
				description: "The inn common room's stone hearth.",
				// Stone: AC 17 (rules-glossary.md:313). Medium/Fragile: 4 (1d8) HP —
				// same rationale as the bar counter above.
				initial_states: [
					{ state: AC_RESOURCE_ID, value_int: 17 },
					{ state: HP_STATE_ID, value_int: 4 },
				],
			},
		},
		{
			toolName: "spellkave_place_entity",
			label: "place-hearth",
			params: {
				bundle: BUNDLE,
				kind: "item",
				entity_def: HEARTH_DEF_ID,
				at: nodeId(GRAPHS.inn, "common_room"),
				key_prefix: "adventure/furniture/hearth",
				name: "Hearth",
				description: "Hearth",
			},
		},
		{
			toolName: "spellkave_define_entity_type",
			label: "define-tomb-chest",
			params: {
				bundle: BUNDLE,
				id: TOMB_CHEST_DEF_LOCAL_ID,
				display_name: "Sealed Chest",
				description: "A sealed wooden chest in the tomb's shrine.",
				// Wood: AC 15 (rules-glossary.md:307). Small/Resilient: 10 (3d6) HP
				// (Object Hit Points table's own "Small (chest, lute)" row,
				// rules-glossary.md:338-340) — a sealed tomb chest is sturdy, not
				// fragile furniture.
				initial_states: [
					{ state: AC_RESOURCE_ID, value_int: 15 },
					{ state: HP_STATE_ID, value_int: 10 },
				],
			},
		},
		{
			toolName: "spellkave_place_entity",
			label: "place-chest",
			params: {
				bundle: BUNDLE,
				kind: "item",
				entity_def: TOMB_CHEST_DEF_ID,
				at: nodeId(GRAPHS.tomb, "shrine"),
				key_prefix: "adventure/item/tomb_chest",
				name: "Sealed Chest",
				description: "Sealed Chest",
			},
		},
	];
}
