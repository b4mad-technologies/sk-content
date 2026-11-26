/**
 * // pattern: blueprint-instance-override
 *
 * Q1 cellar rats — 1 giant rat + 1 swarm of rats at the inn cellar.
 * Role tags: skirmisher (storyline §6). Keys match quests.ts terminals.
 */

import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { FACTION_MONSTERS_TAG, SRD_BUNDLE_ID } from "@spellkave/adventure-runtime/srd-ids";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";
import { Q1_CELLAR_RAT_KEYS, Q1_CELLAR_SWARM_KEY } from "./quests.ts";

const ROLE_SKIRMISHER = "srd.creature.role.skirmisher";
const CELLAR = nodeId(GRAPHS.inn, "cellar");

function creatureDef(slug: string): string {
	return `${SRD_BUNDLE_ID}/creature/${slug}`;
}

function placeNamed(args: {
	label: string;
	entityKey: string;
	creature: string;
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
				at: CELLAR,
				entity_key: args.entityKey,
				name: args.name,
				description: args.description,
				tags: [FACTION_MONSTERS_TAG, ROLE_SKIRMISHER],
				resources: [{ resource: `${SRD_BUNDLE_ID}/hp`, value: 3 }],
			},
		},
	];
}

export const Q1_RAT_ENTITY_KEYS = [...Q1_CELLAR_RAT_KEYS, Q1_CELLAR_SWARM_KEY] as const;

export function q1Rats(): VerbCall[] {
	const calls: VerbCall[] = [];
	for (const [i, key] of Q1_CELLAR_RAT_KEYS.entries()) {
		calls.push(
			...placeNamed({
				label: `cellar-rat-${i + 1}`,
				entityKey: key,
				creature: "giant-rat",
				name: `Cellar Rat ${i + 1}`,
				description: "A giant rat nesting among the cellar barrels, teeth bared at the lamplight.",
			}),
		);
	}
	calls.push(
		...placeNamed({
			label: "cellar-swarm",
			entityKey: Q1_CELLAR_SWARM_KEY,
			creature: "swarm-of-rats",
			name: "Cellar Rat Swarm",
			description: "A chittering swarm of rats pouring from a cracked cask.",
		}),
	);
	return calls;
}
