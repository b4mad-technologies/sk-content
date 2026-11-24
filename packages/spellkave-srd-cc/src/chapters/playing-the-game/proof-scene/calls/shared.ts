import type { VerbCall } from "../../../verb-runner";
import {
	PROOF_BUNDLE_ID,
	PROOF_BUNDLE_ROW,
	PROOF_FAR_NODE_ID,
	PROOF_GRAPH_ID,
	PROOF_PLACE_NODE_ID,
	PROOF_PRESSURE_PLATE_NODE_ID,
	PROOF_REACTION_NODE_ID,
} from "..";

export const SHARED_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_bundle",
		label: "proof-bundle-header",
		params: PROOF_BUNDLE_ROW,
	},
	{
		toolName: "spellkave_author_place",
		label: "proof-place",
		params: {
			bundle: PROOF_BUNDLE_ID,
			// #2093 rename side-effect: `authoring-verbs.ts`'s own
			// `spellkave_author_place` derives an UNSPECIFIED `display_name` from
			// the graph id's own local segment (`graphId.slice(graphId.lastIndexOf
			// ("/") + 1)`, titleCased) — the OLD slash-embedded `PROOF_GRAPH_ID`
			// happened to yield "scene" -> "Scene" as a side effect of that
			// derivation, not because it was authored. The new slash-free id has
			// no `/` to slice on, so the derivation falls back to the WHOLE id.
			// Pin the display name explicitly instead of relying on the
			// derivation, so the rename stays a pure id change with zero content
			// drift.
			display_name: "Scene",
			nodes: [
				{ id: PROOF_PLACE_NODE_ID, name: "Proof Cell" },
				{ id: PROOF_REACTION_NODE_ID, name: "Reaction Exit Cell" },
				{ id: PROOF_PRESSURE_PLATE_NODE_ID, name: "Pressure Plate" },
				{ id: PROOF_FAR_NODE_ID, name: "Far Cell" },
			],
			edges: [
				[PROOF_PLACE_NODE_ID, PROOF_PRESSURE_PLATE_NODE_ID],
				[PROOF_PRESSURE_PLATE_NODE_ID, PROOF_PLACE_NODE_ID],
				[PROOF_PLACE_NODE_ID, PROOF_REACTION_NODE_ID],
				[PROOF_REACTION_NODE_ID, PROOF_PLACE_NODE_ID],
				[PROOF_REACTION_NODE_ID, PROOF_FAR_NODE_ID],
				[PROOF_FAR_NODE_ID, PROOF_REACTION_NODE_ID],
			],
			description:
				"TEST-ONLY four-cell scene: a safe reset point, a clean reaction exit " +
				"cell, a pressure-plate node for the automatic Saving Throw proof, and " +
				"a far cell two hops from the reset point for hall-scale shout proofs.",
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-place-metric-embedding (finding #50 workaround)",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "place_nodes",
			rows: [
				{
					node_id: PROOF_PLACE_NODE_ID,
					bundle_id: PROOF_BUNDLE_ID,
					place_graph_id: PROOF_GRAPH_ID,
					local_id: "cell_a",
					substrate_id: "outdoor",
					display_name: "Proof Cell",
					pos_x: 0,
					pos_y: 0,
					pos_present: true,
				},
				{
					node_id: PROOF_REACTION_NODE_ID,
					bundle_id: PROOF_BUNDLE_ID,
					place_graph_id: PROOF_GRAPH_ID,
					local_id: "cell_b",
					substrate_id: "outdoor",
					display_name: "Reaction Exit Cell",
					pos_x: 1,
					pos_y: 1,
					pos_present: true,
				},
				{
					node_id: PROOF_PRESSURE_PLATE_NODE_ID,
					bundle_id: PROOF_BUNDLE_ID,
					place_graph_id: PROOF_GRAPH_ID,
					local_id: "pressure_plate",
					substrate_id: "outdoor",
					display_name: "Pressure Plate",
					pos_x: 1,
					pos_y: 0,
					pos_present: true,
				},
				{
					node_id: PROOF_FAR_NODE_ID,
					bundle_id: PROOF_BUNDLE_ID,
					place_graph_id: PROOF_GRAPH_ID,
					local_id: "cell_far",
					substrate_id: "outdoor",
					display_name: "Far Cell",
					pos_x: 30,
					pos_y: 0,
					pos_present: true,
				},
			],
		},
	},
];
