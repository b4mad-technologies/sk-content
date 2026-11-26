/**
 * // pattern: none — operator bundle authoring helper
 *
 * The World Operator character remains outside the playable seat catalog.
 * Its publisher identity holds system-author presences over each adventure
 * root graph; authority is independent of the character body (ADR-0151 D-5).
 * The instance tag retained for the archived admin map panel is unchanged.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { BUNDLE, GRAPHS, nodeId, ROOT_PLACE_GRAPHS } from "./lib/ids.ts";

export const OPERATOR_SEAT_TAG = "spellkave.seat.operator";
export const OPERATOR_KEY_PREFIX = "adventure/operator";
export const OPERATOR_ENTITY_KEY = `${BUNDLE}/${OPERATOR_KEY_PREFIX}_1`;
export const OPERATOR_DISPLAY_NAME = "World Operator";
export const OPERATOR_DEF_LOCAL_ID = "adventure/operator";
export const OPERATOR_DEF_ID = `${BUNDLE}/${OPERATOR_DEF_LOCAL_ID}`;
export const OPERATOR_PLACE_NODE_ID = nodeId(GRAPHS.operator_offstage, "station");

/** Root graph inventory stays owned by ids.ts. */
export function operatorRootGraphIds(): readonly string[] {
	return ROOT_PLACE_GRAPHS;
}

export function operatorBindingId(graphId: string): string {
	const local = graphId.startsWith(`${BUNDLE}/`) ? graphId.slice(BUNDLE.length + 1) : graphId;
	return `${BUNDLE}/operator/${local}`;
}

/**
 * The operator body's own place_graph: one node, zero edges, unreachable from
 * any player path. The body used to stand at creation_limbo/station, so every
 * candidate hero saw "World Operator" as a scene occupant (sk-jay0.1.76.9).
 * Publisher authority is body-independent, so moving the body changes nothing
 * about the root-graph presences below.
 */
export function operatorOffstage(): VerbCall[] {
	return [
		{
			toolName: "spellkave_author_place",
			label: "author-operator-offstage",
			params: {
				bundle: BUNDLE,
				substrate: "indoor",
				description:
					"Offstage holding place for the publisher's observation body: one node, " +
					"DELIBERATELY not connected to any playable geography.",
				nodes: [{ id: OPERATOR_PLACE_NODE_ID, name: "Operator Offstage" }],
				edges: [],
			},
		},
	];
}

export function operatorSeat(): VerbCall[] {
	return [
		{
			toolName: "spellkave_define_entity_type",
			label: "define-world-operator",
			params: {
				bundle: BUNDLE,
				id: OPERATOR_DEF_LOCAL_ID,
				name: OPERATOR_DISPLAY_NAME,
				description:
					"Observation-only character blueprint, omitted from the playable seat catalog.",
			},
		},
		{
			toolName: "spellkave_place_actor",
			label: "place-world-operator",
			params: {
				bundle: BUNDLE,
				kind: "npc",
				entity_def: OPERATOR_DEF_ID,
				at: OPERATOR_PLACE_NODE_ID,
				key_prefix: OPERATOR_KEY_PREFIX,
				name: OPERATOR_DISPLAY_NAME,
				description:
					"World operator character. Publisher authority lives on independent root-graph presences.",
				tags: [OPERATOR_SEAT_TAG],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "bind-world-operator-publisher",
			params: {
				bundle: BUNDLE,
				kind: "actor_identities",
				rows: [
					{
						bundle_id: BUNDLE,
						entity_key: OPERATOR_ENTITY_KEY,
						identity: "$sender",
						role: "primary",
						provenance: "person",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "bind-publisher-system-author-root-presences",
			params: {
				bundle: BUNDLE,
				kind: "role_bindings",
				rows: operatorRootGraphIds().map((graphId) => ({
					binding_id: operatorBindingId(graphId),
					bundle_id: BUNDLE,
					subject: "$sender",
					role_id: "system-author",
					extent_kind_ref: "place_graph",
					extent_ref: graphId,
					description: `Publisher system-author authority over ${graphId}.`,
				})),
			},
		},
	];
}
