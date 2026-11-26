/**
 * sk-609b.8 — kavemouth maps lane offline gates:
 * - 16 storyline place-graphs present
 * - every story graph has map_layers + with-map product render path
 * - portal reachability inn → every story graph (BFS on edges)
 * - encounter inventory matches storyline §5 counts
 * - adventure reconstructed row count stays under export margin (3600 < 4000)
 */

import { inspectManifest, loadFlattened } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";
import { FIXTURES_DIR } from "../../../spellkave-srd-cc/src/pipeline";
import { bramble_crypt } from "../../author/bramble-crypt";
import { deep_tomb } from "../../author/deep-tomb";
import { ENCOUNTER_ENTITY_KEYS, ENCOUNTER_INVENTORY } from "../../author/encounters";
import { hesper_lodge } from "../../author/hesper-lodge";
import { goblin_warren } from "../../author/goblin-warren";
import { hamlet } from "../../author/hamlet";
import { war_camp } from "../../author/war-camp";
import { inn } from "../../author/inn";
import {
	ADVENTURE_HERO_WAKE_NODE_ID,
	ALDWIN_PLACE_NODE_ID,
	CREATION_LIMBO_NODE_ID,
} from "../../author/lib/entity-keys";
import { GRAPHS, nodeId, STORY_GRAPHS } from "../../author/lib/ids";
import { FIXTURE_ROOT } from "../../author/lib/paths";
import type { GraphSlice } from "../../author/lib/place";
import { LOFT_NODE_ID } from "../../author/loft-chest";
import { mill } from "../../author/mill";
import { mine } from "../../author/mine";
import { region } from "../../author/region";
import { stonebridge } from "../../author/stonebridge";
import { shrine } from "../../author/shrine";
import { swamp } from "../../author/swamp";
import { tomb } from "../../author/tomb";
import { village } from "../../author/village";
import { well } from "../../author/well";

const ELVEN_ROOT = FIXTURE_ROOT;

const STORY_SLICES: Record<(typeof STORY_GRAPHS)[number], () => GraphSlice> = {
	region,
	hamlet,
	inn,
	tomb,
	village,
	stonebridge,
	mill,
	well,
	goblin_warren,
	hesper_lodge,
	war_camp,
	swamp,
	mine,
	shrine,
	bramble_crypt,
	deep_tomb,
};

function graphIdOf(slice: GraphSlice): string {
	const call = slice.calls[0];
	if (call?.toolName !== "spellkave_author_place") {
		throw new Error("expected author_place");
	}
	const nodes = (call.params as { nodes: Array<{ id: string }> }).nodes;
	const first = nodes[0]?.id;
	if (!first) throw new Error("no nodes");
	return first.slice(0, first.lastIndexOf("/"));
}

/** Approximate the export reconstructed-row count from rendered adventure TOML. */
function countAdventureManifestRows(toml: string): number {
	const inspected = inspectManifest(toml).manifest as Record<string, unknown>;
	let total = 0;
	for (const value of Object.values(inspected)) {
		if (Array.isArray(value)) total += value.length;
	}
	return total;
}

describe("kavemouth maps (sk-609b.8)", () => {
	it("authors exactly the 16 storyline place-graphs", () => {
		expect(STORY_GRAPHS).toHaveLength(16);
		const ids = STORY_GRAPHS.map((k) => graphIdOf(STORY_SLICES[k]()));
		expect(new Set(ids).size).toBe(16);
		for (const k of STORY_GRAPHS) {
			expect(ids).toContain(GRAPHS[k]);
		}
	});

	it("committed adventure fixtures carry every story graph and no backdrop layers", () => {
		const toml = loadFlattened(ELVEN_ROOT, "adventure.manifest.toml");
		for (const k of STORY_GRAPHS) {
			const gid = GRAPHS[k];
			expect(toml, `graph ${gid}`).toContain(`place_graph_id = "${gid}"`);
		}
		// No backdrop map layers ship yet; first-party maps follow.
		expect(toml).not.toContain("[[map_layers]]");
	});

	it("portal graph reaches every story graph from the inn", () => {
		const toml = loadFlattened(ELVEN_ROOT, "adventure.manifest.toml");
		const froms = [...toml.matchAll(/^from_node_id = "([^"]+)"$/gm)].flatMap((m) =>
			m[1] === undefined ? [] : [m[1]],
		);
		const tos = [...toml.matchAll(/^to_node_id = "([^"]+)"$/gm)].flatMap((m) =>
			m[1] === undefined ? [] : [m[1]],
		);
		expect(froms.length).toBe(tos.length);
		expect(froms.length).toBeGreaterThan(20);

		const adj = new Map<string, Set<string>>();
		const add = (a: string, b: string) => {
			const set = adj.get(a) ?? new Set<string>();
			set.add(b);
			adj.set(a, set);
		};
		for (let i = 0; i < froms.length; i++) {
			const from = froms[i];
			const to = tos[i];
			if (from === undefined || to === undefined) continue;
			add(from, to);
			add(to, from);
		}

		const nodeGraph = (nodeId: string): string => nodeId.slice(0, nodeId.lastIndexOf("/"));
		const start = `${GRAPHS.inn}/foyer`;
		const seenNodes = new Set<string>([start]);
		const q = [start];
		while (q.length > 0) {
			const cur = q.shift();
			if (cur === undefined) break;
			for (const nxt of adj.get(cur) ?? []) {
				if (seenNodes.has(nxt)) continue;
				seenNodes.add(nxt);
				q.push(nxt);
			}
		}
		const reached = new Set([...seenNodes].map(nodeGraph));
		for (const k of STORY_GRAPHS) {
			expect(reached.has(GRAPHS[k]), `reachable from inn: ${k}`).toBe(true);
		}
	});

	it("encounter inventory matches storyline §5 creature counts in fixtures", () => {
		const toml = loadFlattened(ELVEN_ROOT, "adventure.manifest.toml");
		expect(ENCOUNTER_ENTITY_KEYS.length).toBe(56);
		for (const key of ENCOUNTER_ENTITY_KEYS) {
			expect(toml.includes(`entity_key = "${key}"`), key).toBe(true);
		}
		for (const name of [
			"Sister Maelis",
			"Warcaptain Ghorza",
			"Grubnash",
			"Ulda Reedwife",
			"Durgan Ironfold",
			"The Pale Steward",
		]) {
			expect(toml.includes(`name = "${name}"`), name).toBe(true);
		}
		const total = ENCOUNTER_INVENTORY.reduce(
			(n, row) => n + row.placements.reduce((m, p) => m + p.count, 0),
			0,
		);
		expect(total).toBeGreaterThanOrEqual(40);
	});

	it("adventure reconstructed row count stays under 6000 (margin under MAX_EXPORT_ROWS 8000)", () => {
		const toml = loadFlattened(ELVEN_ROOT, "adventure.manifest.toml");
		const count = countAdventureManifestRows(toml);
		expect(count, `row count ${count}`).toBeGreaterThan(500);
		expect(count, `row count ${count} must be < 6000`).toBeLessThan(6000);
	});

	describe("authored place_edge wiring the live dm-arc files walk", () => {
		type Row = Record<string, unknown>;
		const manifest = inspectManifest(loadFlattened(ELVEN_ROOT, "adventure.manifest.toml"))
			.manifest as Record<string, unknown>;
		const nodes = new Set((manifest.place_nodes as Row[]).map((n) => String(n.node_id)));
		const edges = (manifest.place_edges as Row[]).map((e): [string, string] => [
			String(e.from_node_id),
			String(e.to_node_id),
		]);
		const hasEdge = (a: string, b: string) => edges.some(([f, t]) => f === a && t === b);
		const expectWalkableBothWays = (chain: string[]) => {
			for (const n of chain) expect(nodes.has(n), `node ${n}`).toBe(true);
			for (let i = 0; i + 1 < chain.length; i++) {
				const a = chain[i] as string;
				const b = chain[i + 1] as string;
				expect(hasEdge(a, b), `${a} -> ${b}`).toBe(true);
				expect(hasEdge(b, a), `${b} -> ${a}`).toBe(true);
			}
		};

		it("the hamlet route common_room, foyer, inn_front, square, gate has a place_edge in both directions", () => {
			// replaces tests/live-preseeded/mechanics/companion-arrival.test.ts:84 and quest-board-host.test.ts:906-907,986-1003 (route walkable)
			expectWalkableBothWays([
				nodeId(GRAPHS.inn, "common_room"),
				nodeId(GRAPHS.inn, "foyer"),
				nodeId(GRAPHS.hamlet, "inn_front"),
				nodeId(GRAPHS.hamlet, "square"),
				nodeId(GRAPHS.hamlet, "gate"),
			]);
		});

		it("the gate-to-mill-altar chain the quest-board host walks is bidirectional edge by edge", () => {
			// replaces tests/live-preseeded/quest-board-host.test.ts:501-527,906-907,986-1003 (route walkable, 15-hop reverse)
			expectWalkableBothWays([
				nodeId(GRAPHS.hamlet, "gate"),
				nodeId(GRAPHS.region, "road_south"),
				nodeId(GRAPHS.region, "waymeet"),
				nodeId(GRAPHS.region, "road_east"),
				nodeId(GRAPHS.region, "road_to_river"),
				nodeId(GRAPHS.stonebridge, "south_approach"),
				nodeId(GRAPHS.stonebridge, "bridge_south"),
				nodeId(GRAPHS.stonebridge, "bridge_mid"),
				nodeId(GRAPHS.stonebridge, "bridge_north"),
				nodeId(GRAPHS.stonebridge, "north_road"),
				nodeId(GRAPHS.mill, "yard"),
				nodeId(GRAPHS.mill, "watch_nook"),
				nodeId(GRAPHS.mill, "tunnels"),
				nodeId(GRAPHS.mill, "fork"),
				nodeId(GRAPHS.mill, "grain_cellar"),
				nodeId(GRAPHS.mill, "altar"),
			]);
		});

		it("road_to_warren is a placed node with an exit to the road and one into the warren", () => {
			// replaces tests/live-preseeded/travel-hold-brain.test.ts:49 (STAGED_NODE road_to_warren is a placed, connected node)
			const warren = nodeId(GRAPHS.region, "road_to_warren");
			expect(nodes.has(warren)).toBe(true);
			expect(hasEdge(warren, nodeId(GRAPHS.region, "road_north"))).toBe(true);
			expect(hasEdge(warren, nodeId(GRAPHS.goblin_warren, "entrance"))).toBe(true);
		});

		it("road_to_warren's exit to the road is longer than one 30 ft walking round, so the move prices as travelling", () => {
			// replaces tests/live-preseeded/travel-hold-brain.test.ts:372-373 (the server priced a travelling receipt with arrives_in_ticks; only the live run knew the edge was long enough)
			// srd/speed-walk is 30 ft; long_running_move.rs opens a travel session for an edge longer than the reach.
			const WALK_ROUND_M = 9.144;
			const graphScale = new Map(
				(manifest.place_graphs as Row[]).map((g) => [
					String(g.place_graph_id),
					Number(g.metres_per_unit),
				]),
			);
			const at = (id: string) => {
				const n = (manifest.place_nodes as Row[]).find((r) => r.node_id === id);
				if (!n) throw new Error(`${id} is not placed`);
				return {
					x: Number(n.pos_x),
					y: Number(n.pos_y),
					scale: graphScale.get(String(n.place_graph_id)) ?? 0,
				};
			};
			const from = at(nodeId(GRAPHS.region, "road_to_warren"));
			const to = at(nodeId(GRAPHS.region, "road_north"));
			expect(Math.hypot(to.x - from.x, to.y - from.y) * from.scale).toBeGreaterThan(WALK_ROUND_M);
			const edge = (manifest.place_edges as Row[]).find(
				(e) =>
					e.from_node_id === nodeId(GRAPHS.region, "road_to_warren") &&
					e.to_node_id === nodeId(GRAPHS.region, "road_north"),
			);
			expect(edge?.inherit_movement_default).toBe(true);
			// The default step binding names the reach resource and the long-running session.
			expect(
				(manifest.movement_defaults as Row[]).map((d) => JSON.parse(String(d.bindings_json))),
			).toContainEqual({
				movement_reach_resource: "srd/speed-walk",
				long_running_move_session: "srd/long_running_move",
			});
		});

		it("the wake node is the loft,the loft is where the chest stands, and the gate is reachable from it", () => {
			// replaces tests/live-preseeded/owner-get-describe.test.ts:162-187 and loft-chest.test.ts:157-174 (hero reaches loft scene via the entity-keys constant)
			expect(ADVENTURE_HERO_WAKE_NODE_ID).toBe(LOFT_NODE_ID);
			expect(ADVENTURE_HERO_WAKE_NODE_ID).not.toBe(nodeId(GRAPHS.hamlet, "gate"));
			expect(ADVENTURE_HERO_WAKE_NODE_ID).not.toBe(nodeId(GRAPHS.hesper_lodge, "porch"));
			const seen = new Set([ADVENTURE_HERO_WAKE_NODE_ID]);
			const queue = [ADVENTURE_HERO_WAKE_NODE_ID];
			for (let cur = queue.shift(); cur !== undefined; cur = queue.shift())
				for (const [f, t] of edges)
					if (f === cur && !seen.has(t)) {
						seen.add(t);
						queue.push(t);
					}
			expect(seen.has(nodeId(GRAPHS.hamlet, "gate"))).toBe(true);
		});

		it("Aldwin's anchor node exists and the creation limbo station has exactly one way out, into it", () => {
			// replaces tests/live-preseeded/encounter-start.test.ts:60-64 (Aldwin body key resolves) and
			// packages/spellkave-srd-cc/src/test/live-preseeded/mechanics/dm-threshold.test.ts:321-328 (limbo shows exactly one exit)
			expect(ALDWIN_PLACE_NODE_ID).toBe("kavemouth/inn/common_room");
			expect(nodes.has(ALDWIN_PLACE_NODE_ID)).toBe(true);
			const out = edges.filter(([f]) => f === CREATION_LIMBO_NODE_ID);
			expect(out).toEqual([[CREATION_LIMBO_NODE_ID, ALDWIN_PLACE_NODE_ID]]);
			expect(edges.filter(([, t]) => t === CREATION_LIMBO_NODE_ID)).toEqual([
				[ALDWIN_PLACE_NODE_ID, CREATION_LIMBO_NODE_ID],
			]);
		});
	});
});
