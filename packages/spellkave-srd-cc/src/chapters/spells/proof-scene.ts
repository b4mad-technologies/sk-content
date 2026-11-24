// pattern: none — proof scene fixture for spells
// Spells chapter — LIVE PROOF scene for curated behaviours + L6 Burning Hands.
// Authored INLINE at test setup via driveSrdScene (never in
// fixtures/manifest.toml). Same posture as monsters/proof-scene.ts.
import { AC_RESOURCE_ID } from "../playing-the-game/armor-class-units";
import { HP_ID } from "../playing-the-game/hp-units";
import type { VerbCall } from "../verb-runner";
import { BUNDLE_ID } from "./spell-units";

export const PROOF_BUNDLE_ID = "srd_spells_proof";
export const PROOF_BUNDLE_ROW = {
	bundle_id: PROOF_BUNDLE_ID,
	display_name: "Spells behaviour proof scene",
	author: "spellkave-srd-cc",
	version: "0.2.0",
	depends_on: [BUNDLE_ID],
	description:
		"TEST-ONLY proof scene for spell behaviours (slot-cast + Burning Hands AoE). " +
		"Never shipped in fixtures/manifest.toml — applied inline by live-self-seeding tests.",
};

export const PROOF_GRAPH_ID = `${PROOF_BUNDLE_ID}_scene`;
export const PROOF_CASTER_NODE_ID = `${PROOF_GRAPH_ID}/caster`;
export const PROOF_TARGET_A_NODE_ID = `${PROOF_GRAPH_ID}/target_a`;
export const PROOF_TARGET_B_NODE_ID = `${PROOF_GRAPH_ID}/target_b`;
/** Misty Step landing — within 30 ft, NO walkable edge from caster (RelocateEntity proof). */
export const PROOF_MISTY_LANDING_NODE_ID = `${PROOF_GRAPH_ID}/misty_landing`;
/** @deprecated alias — single-target proofs still use target A. */
export const PROOF_ANCHOR_NODE_ID = PROOF_CASTER_NODE_ID;

const TARGET_DEF_LOCAL_ID = "target";
export const TARGET_DEF_ID = `${PROOF_BUNDLE_ID}/${TARGET_DEF_LOCAL_ID}`;
const TARGET_A_SPAWN_KEY_PREFIX = "target_a";
const TARGET_B_SPAWN_KEY_PREFIX = "target_b";
const MISTY_BEACON_SPAWN_KEY_PREFIX = "misty_beacon";
export const TARGET_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${TARGET_A_SPAWN_KEY_PREFIX}_1`;
export const TARGET_B_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${TARGET_B_SPAWN_KEY_PREFIX}_1`;
/** Beacon at misty landing — Misty Step targets this body; RelocateEntity uses TargetSpatialRef. */
export const MISTY_BEACON_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${MISTY_BEACON_SPAWN_KEY_PREFIX}_1`;
export const TARGET_AC = 15;
export const TARGET_HP = 40;

const CASTER_DEF_LOCAL_ID = "caster";
export const CASTER_DEF_ID = `${PROOF_BUNDLE_ID}/${CASTER_DEF_LOCAL_ID}`;
const CASTER_SPAWN_KEY_PREFIX = "caster";
export const CASTER_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${CASTER_SPAWN_KEY_PREFIX}_1`;

export const CASTER_SPELL_SLOT_1_INITIAL = 4;
export const CASTER_SPELL_SLOT_2_INITIAL = 1;

export const FIRE_BOLT_ACTION_ID = "srd/spell/fire-bolt/cast";
export const MAGIC_MISSILE_ACTION_ID = "srd/spell/magic-missile/cast";
export const BURNING_HANDS_ACTION_ID = "srd/spell/burning-hands/cast";
export const MISTY_STEP_ACTION_ID = "srd/spell/misty-step/cast";

const CAST_ACTION_CAPABILITY_ID = `${BUNDLE_ID}/action/magic`;

export const SPELLS_PROOF_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_bundle",
		label: "spells-proof-bundle-header",
		params: PROOF_BUNDLE_ROW,
	},
	{
		toolName: "spellkave_author_place",
		label: "spells-proof-graph",
		params: {
			bundle: PROOF_BUNDLE_ID,
			substrate: "outdoor",
			display_name: "Spells Proof Arena",
			nodes: [
				{ id: PROOF_CASTER_NODE_ID, name: "Caster Cell" },
				{ id: PROOF_TARGET_A_NODE_ID, name: "Target A Cell" },
				{ id: PROOF_TARGET_B_NODE_ID, name: "Target B Cell" },
				// No edges to misty_landing — RelocateEntity must cross the gap.
				{ id: PROOF_MISTY_LANDING_NODE_ID, name: "Misty Landing" },
			],
			edges: [
				[PROOF_CASTER_NODE_ID, PROOF_TARGET_A_NODE_ID],
				[PROOF_TARGET_A_NODE_ID, PROOF_CASTER_NODE_ID],
				[PROOF_CASTER_NODE_ID, PROOF_TARGET_B_NODE_ID],
				[PROOF_TARGET_B_NODE_ID, PROOF_CASTER_NODE_ID],
				[PROOF_TARGET_A_NODE_ID, PROOF_TARGET_B_NODE_ID],
				[PROOF_TARGET_B_NODE_ID, PROOF_TARGET_A_NODE_ID],
			],
			description:
				"Metric arena: caster + two cone targets east; misty_landing west with NO edges " +
				"(Misty Step RelocateEntity gap proof).",
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "spells-proof-metric-embedding",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "place_nodes",
			rows: [
				{
					node_id: PROOF_CASTER_NODE_ID,
					bundle_id: PROOF_BUNDLE_ID,
					place_graph_id: PROOF_GRAPH_ID,
					local_id: "caster",
					substrate_id: "outdoor",
					display_name: "Caster Cell",
					pos_x: 0,
					pos_y: 0,
					pos_present: true,
				},
				{
					node_id: PROOF_TARGET_A_NODE_ID,
					bundle_id: PROOF_BUNDLE_ID,
					place_graph_id: PROOF_GRAPH_ID,
					local_id: "target_a",
					substrate_id: "outdoor",
					display_name: "Target A Cell",
					// ~2 units east — inside 15 ft (4.57 m) cone (pos is i32).
					pos_x: 2,
					pos_y: 0,
					pos_present: true,
				},
				{
					node_id: PROOF_TARGET_B_NODE_ID,
					bundle_id: PROOF_BUNDLE_ID,
					place_graph_id: PROOF_GRAPH_ID,
					local_id: "target_b",
					substrate_id: "outdoor",
					display_name: "Target B Cell",
					// Slightly north of A so both sit in an east-facing cone.
					pos_x: 2,
					pos_y: 1,
					pos_present: true,
				},
				{
					node_id: PROOF_MISTY_LANDING_NODE_ID,
					bundle_id: PROOF_BUNDLE_ID,
					place_graph_id: PROOF_GRAPH_ID,
					local_id: "misty_landing",
					substrate_id: "outdoor",
					display_name: "Misty Landing",
					// ~6 m west (~20 ft) — inside 30 ft Misty Step range, no edge.
					pos_x: -6,
					pos_y: 0,
					pos_present: true,
				},
			],
		},
	},
	{
		toolName: "spellkave_define_entity_type",
		label: "spells-proof-target-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: TARGET_DEF_LOCAL_ID,
			display_name: "Spells Proof Target",
			description:
				"TEST-ONLY spells proof target — AC/HP punching bag for single-target and AoE casts.",
			initial_states: [
				{ state: AC_RESOURCE_ID, value_int: TARGET_AC },
				{ state: `${BUNDLE_ID}/${HP_ID}`, value_int: TARGET_HP },
			],
		},
	},
	{
		toolName: "spellkave_define_entity_type",
		label: "spells-proof-caster-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: CASTER_DEF_LOCAL_ID,
			display_name: "Spells Proof Caster",
			description:
				"TEST-ONLY spells proof caster — seeded spell slots; fire-immune so cone self-select " +
				"at origin deals 0 (distance 0 is inside core/area/cone).",
			initial_states: [
				{ state: `${BUNDLE_ID}/spell_slot_1`, value_int: CASTER_SPELL_SLOT_1_INITIAL },
				{ state: `${BUNDLE_ID}/spell_slot_2`, value_int: CASTER_SPELL_SLOT_2_INITIAL },
				{ state: `${BUNDLE_ID}/proficiency_bonus`, value_int: 2 },
				{ state: `${BUNDLE_ID}/spellcasting_mod`, value_int: 3 },
				{ state: AC_RESOURCE_ID, value_int: 14 },
				{ state: `${BUNDLE_ID}/${HP_ID}`, value_int: 50 },
			],
			// Documentary fire immunity so origin self-hit from cone is a no-op.
			tags: ["damage_immune:fire"],
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "spells-proof-target-a",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "player",
			entity_def: TARGET_DEF_ID,
			at: PROOF_TARGET_A_NODE_ID,
			key_prefix: TARGET_A_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY target A (east of caster).",
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "spells-proof-target-b",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "player",
			entity_def: TARGET_DEF_ID,
			at: PROOF_TARGET_B_NODE_ID,
			key_prefix: TARGET_B_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY target B (east-northeast of caster).",
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "spells-proof-misty-beacon",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "player",
			entity_def: TARGET_DEF_ID,
			at: PROOF_MISTY_LANDING_NODE_ID,
			key_prefix: MISTY_BEACON_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY Misty Step landing beacon (no walk edge from caster).",
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "spells-proof-caster",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: CASTER_DEF_ID,
			at: PROOF_CASTER_NODE_ID,
			key_prefix: CASTER_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY caster at origin.",
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "spells-proof-cast-capability-grant",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "actor_capabilities",
			rows: [
				{
					actor_entity_key: CASTER_ENTITY_KEY,
					bundle_id: PROOF_BUNDLE_ID,
					capability_id: CAST_ACTION_CAPABILITY_ID,
					source: PROOF_BUNDLE_ID,
				},
			],
		},
	},
];
