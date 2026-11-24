// pattern: none — proof scene fixture for giant spider
// Giant Spider live-representative proof scene (lane L7 / bestiary-cr0-4.md).
// CR 1 creature: Bite via shared srd/attack/melee + definition-seeded
// natural weapon `srd/natural-weapon/giant-spider-bite`. Inline-authored by
// the live test (same carve-out as `proof-scene.ts`).
import { AC_RESOURCE_ID } from "../playing-the-game/armor-class-units";
import { HP_ID } from "../playing-the-game/hp-units";
import type { VerbCall } from "../verb-runner";
import { BUNDLE_ID } from "./creature-units";
import { GIANT_SPIDER_BITE_ENTITY_ID } from "./natural-weapon-units";

export const GIANT_SPIDER_PROOF_BUNDLE_ID = "srd_giant_spider_proof";
export const GIANT_SPIDER_PROOF_BUNDLE_ROW = {
	bundle_id: GIANT_SPIDER_PROOF_BUNDLE_ID,
	display_name: "Giant Spider CR 1 proof scene",
	author: "spellkave-srd-cc",
	version: "0.1.0",
	depends_on: [BUNDLE_ID],
	description:
		"TEST-ONLY proof: Giant Spider (CR 1) Bite resolves via shared srd/attack/melee. " +
		"Never shipped in fixtures/manifest.toml.",
};

export const GIANT_SPIDER_PROOF_GRAPH_ID = `${GIANT_SPIDER_PROOF_BUNDLE_ID}_scene`;
export const GIANT_SPIDER_PROOF_ANCHOR_NODE_ID = `${GIANT_SPIDER_PROOF_GRAPH_ID}/anchor`;

const HERO_DEF_LOCAL_ID = "hero";
export const GIANT_SPIDER_HERO_DEF_ID = `${GIANT_SPIDER_PROOF_BUNDLE_ID}/${HERO_DEF_LOCAL_ID}`;
const HERO_SPAWN_KEY_PREFIX = "hero";
export const GIANT_SPIDER_HERO_ENTITY_KEY = `${GIANT_SPIDER_PROOF_BUNDLE_ID}/${HERO_SPAWN_KEY_PREFIX}_1`;
export const GIANT_SPIDER_HERO_AC = 15;
export const GIANT_SPIDER_HERO_HP = 30;

const SPIDER_SPAWN_KEY_PREFIX = "giant-spider";
export const GIANT_SPIDER_ENTITY_KEY = `${GIANT_SPIDER_PROOF_BUNDLE_ID}/${SPIDER_SPAWN_KEY_PREFIX}_1`;
export const GIANT_SPIDER_ATTACK_ACTION_ID = "srd/attack/melee";
/** DEX 16 (+3) + PB 2 = +5 — open5e CreatureActionAttack to_hit_mod. */
export const GIANT_SPIDER_TO_HIT_MOD = 5;
export const GIANT_SPIDER_BITE_ITEM_ENTITY_KEY = `${GIANT_SPIDER_PROOF_BUNDLE_ID}/giant-spider-bite-item_1`;

export const GIANT_SPIDER_PROOF_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_bundle",
		label: "giant-spider-proof-bundle-header",
		params: GIANT_SPIDER_PROOF_BUNDLE_ROW,
	},
	{
		toolName: "spellkave_author_place",
		label: "giant-spider-proof-anchor",
		params: {
			bundle: GIANT_SPIDER_PROOF_BUNDLE_ID,
			substrate: "outdoor",
			display_name: "Giant Spider Proof Anchor",
			nodes: [{ id: GIANT_SPIDER_PROOF_ANCHOR_NODE_ID, name: "Giant Spider Proof Anchor" }],
			edges: [],
		},
	},
	{
		toolName: "spellkave_define_entity_type",
		label: "giant-spider-proof-hero-def",
		params: {
			bundle: GIANT_SPIDER_PROOF_BUNDLE_ID,
			id: HERO_DEF_LOCAL_ID,
			display_name: "Giant Spider Proof Hero",
			description: "TEST-ONLY punching bag for the Giant Spider Bite proof.",
			initial_states: [
				{ state: AC_RESOURCE_ID, value_int: GIANT_SPIDER_HERO_AC },
				{ state: `${BUNDLE_ID}/${HP_ID}`, value_int: GIANT_SPIDER_HERO_HP },
			],
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "giant-spider-proof-hero-placement",
		params: {
			bundle: GIANT_SPIDER_PROOF_BUNDLE_ID,
			kind: "player",
			entity_def: GIANT_SPIDER_HERO_DEF_ID,
			at: GIANT_SPIDER_PROOF_ANCHOR_NODE_ID,
			key_prefix: HERO_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY hero instance.",
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "giant-spider-proof-spider-placement",
		params: {
			bundle: GIANT_SPIDER_PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: `${BUNDLE_ID}/creature/giant-spider`,
			at: GIANT_SPIDER_PROOF_ANCHOR_NODE_ID,
			key_prefix: SPIDER_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY Giant Spider instance (definition-seeded Bite natural weapon).",
		},
	},
	// Belt-and-braces wielded item (same as wolf starter-arena) in case the
	// placement path does not materialise definition equipment in this harness.
	{
		toolName: "spellkave_write_rows",
		label: "giant-spider-proof-bite-item",
		params: {
			bundle: GIANT_SPIDER_PROOF_BUNDLE_ID,
			kind: "entities",
			rows: [
				{
					entity_key: GIANT_SPIDER_BITE_ITEM_ENTITY_KEY,
					bundle_id: GIANT_SPIDER_PROOF_BUNDLE_ID,
					entity_def_id: GIANT_SPIDER_BITE_ENTITY_ID,
					name: "Giant Spider Bite",
					kind: "item",
					place_node_id: "",
				},
			],
		},
	},
	{
		toolName: "spellkave_stow_item",
		label: "giant-spider-proof-bite-containment",
		params: {
			bundle: GIANT_SPIDER_PROOF_BUNDLE_ID,
			actor_entity_key: GIANT_SPIDER_ENTITY_KEY,
			item_entity_key: GIANT_SPIDER_BITE_ITEM_ENTITY_KEY,
		},
	},
];
