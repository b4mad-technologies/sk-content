/**
 * // pattern: blueprint-instance-override
 *
 * Friendly storyline NPCs (sk-609b.10) — Ysolde, Tamsin, Caddoc, Jory,
 * Hesper, Vessk. Named villains stay in encounters.ts.
 */

import {
	DIALOG_OPEN_RESOURCE_ID,
	DIALOG_PROMPT_RESOURCE_ID,
} from "@spellkave/adventure-runtime/dm/dialog";
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { DM_NPC_TALKER_TAG, SRD_BUNDLE_ID } from "@spellkave/adventure-runtime/srd-ids";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";
import { CULT_RELIC_KEY, MOONPETAL_KEY, STORYLINE_NPC_KEYS, TOMB_KEY_ITEM_KEY } from "./quests.ts";

function creatureDef(slug: string): string {
	return `${SRD_BUNDLE_ID}/creature/${slug}`;
}

function placeTalker(args: {
	label: string;
	entityKey: string;
	creature: string;
	at: string;
	name: string;
	description: string;
}): VerbCall[] {
	const def = creatureDef(args.creature);
	return [
		{
			toolName: "spellkave_place_actor",
			label: `place-${args.label}`,
			params: {
				bundle: BUNDLE,
				kind: "npc",
				entity_def: def,
				at: args.at,
				entity_key: args.entityKey,
				name: args.name,
				description: args.description,
				tags: [DM_NPC_TALKER_TAG],
				// ADR-0142 D-1: dm/dialog/prompt seeded alongside dm/dialog/open —
				// see `dm-npc.ts`'s identical comment on Aldwin's own row.
				resources: [
					{ resource: DIALOG_OPEN_RESOURCE_ID, value: 0 },
					{ resource: DIALOG_PROMPT_RESOURCE_ID, value: 0 },
				],
			},
		},
	];
}

function defineAndPlaceItem(args: {
	label: string;
	localId: string;
	entityKey: string;
	name: string;
	description: string;
	at: string;
}): VerbCall[] {
	const defId = `${BUNDLE}/${args.localId}`;
	return [
		{
			toolName: "spellkave_define_entity_type",
			label: `define-${args.label}`,
			params: {
				bundle: BUNDLE,
				id: args.localId,
				display_name: args.name,
				description: args.description,
				initial_states: [],
			},
		},
		{
			toolName: "spellkave_place_entity",
			label: `place-${args.label}`,
			params: {
				bundle: BUNDLE,
				kind: "item",
				entity_def: defId,
				at: args.at,
				entity_key: args.entityKey,
				name: args.name,
				description: args.description,
				tags: ["srd.item"],
			},
		},
	];
}

/** Frozen key list for layout CAST_MEMBERS. */
export const STORYLINE_NPC_ENTITY_KEYS = [
	STORYLINE_NPC_KEYS.ysolde,
	STORYLINE_NPC_KEYS.tamsin,
	STORYLINE_NPC_KEYS.caddoc,
	STORYLINE_NPC_KEYS.jory,
	STORYLINE_NPC_KEYS.hesper,
	STORYLINE_NPC_KEYS.vessk,
] as const;

export const STORYLINE_QUEST_ITEM_KEYS = [
	MOONPETAL_KEY,
	CULT_RELIC_KEY,
	TOMB_KEY_ITEM_KEY,
] as const;

export function storylineNpcs(): VerbCall[] {
	return [
		...placeTalker({
			label: "ysolde",
			entityKey: STORYLINE_NPC_KEYS.ysolde,
			creature: "guard-captain",
			at: nodeId(GRAPHS.hamlet, "gate"),
			name: "Captain Ysolde Farwind",
			description: "Elven watch captain at the hamlet gate.",
		}),
		...placeTalker({
			label: "tamsin",
			entityKey: STORYLINE_NPC_KEYS.tamsin,
			creature: "commoner",
			at: nodeId(GRAPHS.village, "green"),
			name: "Old Tamsin",
			description: "Herbalist who knows the swamp and the green's moonpetal.",
		}),
		...placeTalker({
			label: "caddoc",
			entityKey: STORYLINE_NPC_KEYS.caddoc,
			creature: "priest-acolyte",
			at: nodeId(GRAPHS.inn, "common_room"),
			name: "Brother Caddoc",
			description: "Acolyte of the Sun-and-Moon shrine, fled to the inn.",
		}),
		...placeTalker({
			label: "jory",
			entityKey: STORYLINE_NPC_KEYS.jory,
			creature: "commoner",
			at: nodeId(GRAPHS.river_crossing, "south_approach"),
			name: "Jory Millwright",
			description: "Miller's son who escaped the silent mill.",
		}),
		...placeTalker({
			label: "hesper",
			entityKey: STORYLINE_NPC_KEYS.hesper,
			creature: "scout",
			at: nodeId(GRAPHS.forest_lodge, "porch"),
			name: "Hesper of the Lodge",
			description: "Gamekeeper of the forest lodge — companion candidate.",
		}),
		...placeTalker({
			label: "vessk",
			entityKey: STORYLINE_NPC_KEYS.vessk,
			creature: "kobold-warrior",
			at: nodeId(GRAPHS.region, "road_to_warren"),
			name: "Vessk",
			description: "Kobold scout who wants Grubnash's warren gone.",
		}),
		// Quest items sit on their pickup nodes (not in inventories).
		...defineAndPlaceItem({
			label: "moonpetal",
			localId: "adventure/item/moonpetal",
			entityKey: MOONPETAL_KEY,
			name: "Moonpetal",
			description: "A pale night-bloom Tamsin needs for her basket.",
			at: nodeId(GRAPHS.village, "green"),
		}),
		...defineAndPlaceItem({
			label: "cult-relic",
			localId: "adventure/item/cult_relic",
			entityKey: CULT_RELIC_KEY,
			name: "Cult Relic",
			description: "A windmill-cult relic Mother Ulda bargains over.",
			at: nodeId(GRAPHS.swamp, "hag_hut"),
		}),
		...defineAndPlaceItem({
			label: "tomb-key",
			localId: "adventure/item/tomb_key",
			entityKey: TOMB_KEY_ITEM_KEY,
			name: "Ironfold Tomb Key",
			description:
				"Durgan's one-use ward-key. The socket in the upper tomb's crypt consumes it to open the deep stair for the whole party.",
			at: nodeId(GRAPHS.mine, "durgan_crypt"),
		}),
	];
}
