import {
	type AuthorToolContext,
	type AuthorWorkspace,
	queryToolDef,
} from "@spellkave/tool-authoring";
import { bindTool } from "@spellkave/tool-runtime";
import { loadFlattened } from "@spellkave/world-author";
import { describe, expect } from "vitest";
import { findingEvidence } from "../../../spellkave-srd-cc/src/test/srd-coverage/evidence";
import { cursed_crypt } from "../../author/cursed-crypt";
import { deep_tomb } from "../../author/deep-tomb";
import { forest_lodge } from "../../author/forest-lodge";
import { goblin_warren } from "../../author/goblin-warren";
import { hamlet } from "../../author/hamlet";
import { hobgoblin_camp } from "../../author/hobgoblin-camp";
import { inn } from "../../author/inn";
import { FIXTURE_ROOT } from "../../author/lib/paths";
import type { GraphSlice } from "../../author/lib/place";
import { mill } from "../../author/mill";
import { mine } from "../../author/mine";
import { region } from "../../author/region";
import { river_crossing } from "../../author/river-crossing";
import { shrine } from "../../author/shrine";
import { swamp } from "../../author/swamp";
import { tomb } from "../../author/tomb";
import { village } from "../../author/village";
import { well } from "../../author/well";

/** Read-only workspace over the COMMITTED adventure bundle's flattened bytes. */
function readOnlyWorkspace(toml: string): AuthorWorkspace {
	return {
		readToml: () => toml,
		writeToml: () => {
			throw new Error("elven-mini-node-descriptions test: this workspace is read-only.");
		},
	};
}

/**
 * One `spellkave_query` list call per kind, projecting `description`, indexed
 * by id. The former shape (one detail query per node) re-parsed the whole
 * flattened bundle 150 times and took 3 s alone, 20+ s under the parallel
 * pre-push slice (sk-jay0.7.88); two list calls parse it twice. Still the
 * one authoring engine's read path, never a hand parse of the fixture.
 */
async function queryDescriptions(
	toml: string,
	kind: string,
): Promise<Map<string, string | undefined>> {
	const context: AuthorToolContext = { workspace: readOnlyWorkspace(toml) };
	const tool = bindTool(queryToolDef, { context, capabilities: {} });
	const result = await tool.execute("elven-mini-node-descriptions-test", {
		kind,
		fields: ["description"],
	});
	if (result.details.shape !== "list") {
		throw new Error(
			`elven-mini-node-descriptions test: expected list, got ${result.details.shape}.`,
		);
	}
	const byId = new Map<string, string | undefined>();
	for (const item of result.details.items) {
		byId.set(item.id, typeof item.description === "string" ? item.description : undefined);
	}
	return byId;
}

interface ExpectedGraph {
	graphId: string;
	nodes: { id: string; description: string }[];
}

/** Pulls the node id/description set straight off the `spellkave_author_place`
 * VerbCall each elven-mini graph function emits — the SAME params object the
 * pipeline renders into `fixtures/`, never a re-typed literal list. */
function deriveExpectedGraph(slice: GraphSlice): ExpectedGraph {
	const authorCall = slice.calls[0];
	if (authorCall?.toolName !== "spellkave_author_place") {
		throw new Error(
			"elven-mini-node-descriptions test: expected calls[0] to be spellkave_author_place.",
		);
	}
	const params = authorCall.params as { nodes: Array<{ id: string; description?: string }> };
	const nodes = params.nodes.map((n) => {
		if (n.description === undefined) {
			throw new Error(
				`elven-mini-node-descriptions test: node '${n.id}' carries no description in its ` +
					"own author module — every elven-mini node must (finding #96 scope).",
			);
		}
		return { id: n.id, description: n.description };
	});
	const firstId = nodes[0]?.id;
	if (firstId === undefined) {
		throw new Error("elven-mini-node-descriptions test: graph slice authored zero nodes.");
	}
	// place_nodes id shape is '<place_graph_id>/<local_id>' (server/src/spatial/
	// place_node.rs) — strip the last segment to recover the graph id.
	const graphId = firstId.slice(0, firstId.lastIndexOf("/"));
	return { graphId, nodes };
}

const EXPECTED_GRAPHS: ExpectedGraph[] = [
	inn(),
	hamlet(),
	region(),
	tomb(),
	village(),
	river_crossing(),
	mill(),
	well(),
	goblin_warren(),
	forest_lodge(),
	hobgoblin_camp(),
	swamp(),
	mine(),
	shrine(),
	cursed_crypt(),
	deep_tomb(),
].map(deriveExpectedGraph);

describe("elven-mini place nodes carry their own arrival description (offline, read path = committed fixtures/elven-mini/adventure.manifest.toml)", () => {
	findingEvidence(
		{
			id: "96",
			title:
				"Per-node place descriptions are authorable through spellkave_author_place and land in fixtures",
			expected:
				"Every elven-mini place_node fixture row carries its own non-empty description, authored " +
				"through spellkave_author_place's nodes[].description, and distinct from its graph's own " +
				"description (rooms are narratively distinguishable on arrival).",
			observed:
				"Former state: PLACE_NODE_PARAMS had no per-node description field, so the column was " +
				"unreachable through the one authoring engine (recorded as an 'ASPIRATIONAL — never wired " +
				"through' stop-clause in src/author/lib/place.ts, 2026-08-03); every elven-mini " +
				"node_description was empty and describeArrival fell back to repeating the graph blurb, " +
				"surfacing as observation_gap entries in the recorded adventure story. Closed by wiring the " +
				"param through the TS tool schema (shared AUTHOR tool layer, 2026-08-04) and authoring all elven-mini " +
				"nodes.",
			impact:
				"Without it, rooms were narratively indistinguishable for the PLAYER (bar / common room / " +
				"tomb hall identical) and every within-graph move wasted tokens repeating the graph blurb.",
			references: [
				"packages/spellkave-tool-authoring/src/authoring-verbs.ts",
				"packages/spellkave-srd-cc/src/author/lib/place.ts",
			],
		},
		async () => {
			const toml = loadFlattened(FIXTURE_ROOT, "adventure.manifest.toml");
			const graphDescriptions = await queryDescriptions(toml, "place_graphs");
			const nodeDescriptions = await queryDescriptions(toml, "place_nodes");

			// Guard against a vacuous pass: adventure-seeded storyline graphs.
			expect(EXPECTED_GRAPHS.length).toBe(16);

			for (const graph of EXPECTED_GRAPHS) {
				expect(
					graph.nodes.length,
					`graph '${graph.graphId}' must author at least one node`,
				).toBeGreaterThan(0);

				expect(
					graphDescriptions.has(graph.graphId),
					`place_graphs/${graph.graphId} must exist in fixtures`,
				).toBe(true);
				const graphDescription = graphDescriptions.get(graph.graphId);
				expect(
					typeof graphDescription === "string" && graphDescription.length > 0,
					`place_graphs/${graph.graphId}.description must be non-empty`,
				).toBe(true);

				for (const node of graph.nodes) {
					expect(
						nodeDescriptions.has(node.id),
						`place_nodes/${node.id} must exist in fixtures`,
					).toBe(true);

					const fixtureDescription = nodeDescriptions.get(node.id);
					expect(
						fixtureDescription,
						`place_nodes/${node.id}.description must equal its author-module spec`,
					).toBe(node.description);
					expect(
						typeof fixtureDescription === "string" && fixtureDescription.length > 0,
						`place_nodes/${node.id}.description must be non-empty`,
					).toBe(true);
					expect(
						fixtureDescription,
						`place_nodes/${node.id}.description must differ from its graph's own description ` +
							"(rooms must be narratively distinguishable on arrival, not a repeat of the graph blurb)",
					).not.toBe(graphDescription);
				}
			}
		},
	);
});
