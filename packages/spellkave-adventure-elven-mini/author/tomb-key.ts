// pattern: consumable-inventory-consume
// pattern: milestone-gate-terminal-flags
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { BUNDLE, edgeKey, GRAPHS, nodeId } from "./lib/ids.ts";

export const TOMB_SEAL_FLAG = "q9_tomb_opened";
export const TOMB_SEAL_RESOURCE = `${BUNDLE}/quest/flag/${TOMB_SEAL_FLAG}`;
export const TOMB_SEAL_ACTION = `${BUNDLE}/quest/open-tomb`;
export const TOMB_SEAL_NICHE = `${BUNDLE}/niche/ironfold-seal`;
export const TOMB_SEAL_STATE = `${BUNDLE}/ironfold-seal-open`;
export const TOMB_SEAL_NODE = nodeId(GRAPHS.tomb, "crypt");
export const DEEP_TOMB_ENTRY = nodeId(GRAPHS.deep_tomb, "stair_from_tomb");

export function tombKeyDefinitions(): VerbCall[] {
	return [
		{
			toolName: "spellkave_define_resource",
			label: "tomb-seal-progress",
			params: {
				bundle: BUNDLE,
				id: `quest/flag/${TOMB_SEAL_FLAG}`,
				display_name: "Ironfold seal opened",
				description:
					"The key has been spent opening the deep tomb, witnessed as a public quest outcome.",
				min_value: 0,
				max_value: 1,
				initial_value: 0,
				recovery_rule: "persistent",
			},
		},
	];
}

/** The key is a one-use ward-key. RemoveItem prevalidation proves possession
 * before ANY write. Aldwin observes the public outcome, not private inventory.
 * The shared edge state opens the route for companions as well as the hero. */
export function tombKeyActions(): VerbCall[] {
	const capability = `${BUNDLE}/quest/open-tomb`;
	const gate = `${BUNDLE}/affordance/ironfold-seal`;
	return [
		{
			toolName: "spellkave_define_capability",
			label: "tomb-key-capability",
			params: {
				bundle: BUNDLE,
				id: "quest/open-tomb",
				actor_kind: "entity",
				display_name: "Use the Ironfold key",
				description: "Spend the ward-key at the deep stair.",
			},
		},
		{
			toolName: "spellkave_define_niche",
			label: "tomb-key-niche",
			params: {
				bundle: BUNDLE,
				id: "niche/ironfold-seal",
				display_name: "Ironfold ward-key socket",
				description: "The sealed stair beneath the Crypt Warden.",
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "tomb-key-socket",
			params: {
				bundle: BUNDLE,
				kind: "spatial_niche_attachments",
				rows: [{ bundle_id: BUNDLE, place_node_id: TOMB_SEAL_NODE, niche_id: TOMB_SEAL_NICHE }],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "tomb-seal-state-definition",
			params: {
				bundle: BUNDLE,
				kind: "spatial_state_definitions",
				rows: [
					{
						bundle_id: BUNDLE,
						state_id: TOMB_SEAL_STATE,
						value_type: "bool",
						writer_policy: "world_interaction",
						freshness_rule: "",
						merge_rule: "replace",
						lod_policy: "retain_latest",
						description: "The Ironfold ward has been opened permanently.",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "tomb-seal-initial-state",
			params: {
				bundle: BUNDLE,
				kind: "spatial_environment_state",
				rows: [
					{
						bundle_id: BUNDLE,
						place_edge_key: edgeKey(TOMB_SEAL_NODE, DEEP_TOMB_ENTRY),
						state_id: TOMB_SEAL_STATE,
						value_bool: false,
						visibility: "Public",
						updated_tick: 0,
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "open-ironfold-seal",
			params: {
				bundle: BUNDLE,
				id: "quest/open-tomb",
				required_capability: capability,
				niche_id: TOMB_SEAL_NICHE,
				display_name: "Open the deep tomb with the Ironfold key",
				description: "The ward consumes its key as the stair opens for your party.",
				predicate_source: `actor.stat('${TOMB_SEAL_RESOURCE}') == 0`,
				cost_time_ms: 0,
				range_m: 0,
				consequence: {
					frame_writes: [
						{
							RemoveItem: {
								source: {
									ActorInventoryItem: {
										actor_ref: "Actor",
										item_def_id: `${BUNDLE}/adventure/item/tomb_key`,
									},
								},
								count: 1,
							},
						},
						{ ModifyResource: { actor: "Actor", resource: TOMB_SEAL_RESOURCE, delta_source: "1" } },
						{
							Inscribe: {
								kind: "spatial_environment_state",
								location_kind: "binding",
								location_ref: "ActorIncidentEdges",
								payload_json: JSON.stringify({
									state_id: TOMB_SEAL_STATE,
									value: true,
									visibility: "Public",
								}),
							},
						},
					],
				},
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "tomb-seal-gate",
			params: {
				bundle: BUNDLE,
				kind: "affordance_templates",
				rows: [
					{
						template_id: gate,
						bundle_id: BUNDLE,
						niche_id: TOMB_SEAL_NICHE,
						capability_id: "srd/capability/walk",
						display_name: "Pass the opened Ironfold seal",
						predicate_source: `target.state('${TOMB_SEAL_STATE}') == true`,
						outcome_template_id: "",
						range_m: 0,
					},
				],
			},
		},
		{
			toolName: "spellkave_bind_edge_affordance",
			label: "bind-tomb-seal",
			params: {
				from: TOMB_SEAL_NODE,
				to: DEEP_TOMB_ENTRY,
				affordance_template_id: gate,
				bindings_json: "",
				bidirectional: false,
			},
		},
	];
}
