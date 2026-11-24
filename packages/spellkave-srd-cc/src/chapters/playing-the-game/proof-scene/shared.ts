import { BUNDLE_ID } from "../index";

export const PROOF_BUNDLE_ID = "srd_proof";
export const PROOF_BUNDLE_ROW = {
	bundle_id: PROOF_BUNDLE_ID,
	display_name: "Playing the Game identity proof scene",
	author: "spellkave-srd-cc",
	version: "0.1.0",
	depends_on: [BUNDLE_ID],
	description:
		"TEST-ONLY proof scene for the Playing the Game ability/skill identity rows " +
		"(str/wis + srd/skill/perception). Loaded explicitly by the live-self-seeding " +
		"identity test — never shipped in fixtures/manifest.toml.",
	// place-node-extent (sk-71u): cell_a/cell_b/pressure_plate/combat_arena_gate
	// author position only, no per-node extent — a bundle default keeps them
	// well-formed. core/area/cube is kernel vocabulary (KNOWN_AREA_SHAPE_IDS),
	// not srd/* content.
	default_extent_shape_id: "core/area/cube",
	default_extent_params_json: '{"extent_m": 4.5}',
};
// Graph id is underscore-joined for readability. Hierarchical slash-joined
// `place_graph_id` values are legal: `parse_node_id` splits on the LAST `/`
// (sk-j8e.1). #2093/#2127 originally truncated first-slash parses; this
// constant used to be `${PROOF_BUNDLE_ID}/scene` and that was the trigger.
export const PROOF_GRAPH_ID = `${PROOF_BUNDLE_ID}_scene`;
/** Safe reset point for the re-runnable pressure-plate and reaction proofs. */
export const PROOF_PLACE_NODE_ID = `${PROOF_GRAPH_ID}/cell_a`;
export const PROOF_REACTION_NODE_ID = `${PROOF_GRAPH_ID}/cell_b`;
export const PROOF_PRESSURE_PLATE_NODE_ID = `${PROOF_GRAPH_ID}/pressure_plate`;
/** Two hops from `PROOF_PLACE_NODE_ID` via cell_b; 30 authored units away so
 * a hall-scale `SPEAK_TO_ROOM_RADIUS_M` (10) does not reach it. */
export const PROOF_FAR_NODE_ID = `${PROOF_GRAPH_ID}/cell_far`;
export const PROOF_PRESSURE_PLATE_EDGE_ID = `${PROOF_PLACE_NODE_ID}->${PROOF_PRESSURE_PLATE_NODE_ID}`;
export const PROOF_PRESSURE_PLATE_RETURN_EDGE_ID = `${PROOF_PRESSURE_PLATE_NODE_ID}->${PROOF_PLACE_NODE_ID}`;
export const PROOF_REACTION_EDGE_ID = `${PROOF_PLACE_NODE_ID}->${PROOF_REACTION_NODE_ID}`;
export const PROOF_REACTION_RETURN_EDGE_ID = `${PROOF_REACTION_NODE_ID}->${PROOF_PLACE_NODE_ID}`;
export const PROOF_FAR_EDGE_ID = `${PROOF_REACTION_NODE_ID}->${PROOF_FAR_NODE_ID}`;
export const PROOF_FAR_RETURN_EDGE_ID = `${PROOF_FAR_NODE_ID}->${PROOF_REACTION_NODE_ID}`;
export const PROOF_TRAVERSAL_CAPABILITY_ID = `${PROOF_BUNDLE_ID}/move/proof-edge`;
export const PROOF_TRAVERSAL_NICHE_ID = `${PROOF_BUNDLE_ID}/edge/open`;
export const PROOF_TRAVERSAL_AFFORDANCE_ID = `${PROOF_BUNDLE_ID}/edge/open/affordance`;
export const PROOF_TRAVERSAL_OUTCOME_ID = `${PROOF_BUNDLE_ID}/edge/open/outcome`;
export const PROOF_MOVEMENT_REACH_STATE_ID = `${PROOF_BUNDLE_ID}/movement_reach`;
export const PROOF_MOVEMENT_REACH = 1_000_000;
export const PROOF_ENTITY_DEF_LOCAL_ID = "hero";
export const PROOF_ENTITY_DEF_ID = `${PROOF_BUNDLE_ID}/${PROOF_ENTITY_DEF_LOCAL_ID}`;
export const PROOF_SPAWN_KEY_PREFIX = "hero";
/** `spellkave_spawn`'s own naming: `<bundle>/<key_prefix>_<ordinal>`, first ordinal 1. */
export const PROOF_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${PROOF_SPAWN_KEY_PREFIX}_1`;
