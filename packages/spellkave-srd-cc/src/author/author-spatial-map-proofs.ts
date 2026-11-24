#!/usr/bin/env tsx
/**
 * Spatial map-view proofs (phases A–D) — companion verbs only.
 *
 * Output root: packages/spellkave-srd-cc/fixtures/spatial/
 *
 *   pnpm --filter @spellkave/srd-cc author:spatial-map-proofs
 *   pnpm --filter @spellkave/srd-cc author:spatial-map-proofs:check
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { inspectManifest, renderSchemaManifest } from "@spellkave/world-author";
import { rasterizeSvgToPng } from "@spellkave/world-map/node";
import {
	buildSpatialGraphView,
	type SpatialGraphToolRows,
	type SpatialViewOptions,
} from "@spellkave/world-map/svg";

import { STEP_EDGE_BINDINGS_JSON } from "../chapters/playing-the-game/grid-units";
import type { VerbCall } from "../chapters/verb-runner";
import { driveSrdScene } from "../chapters/verb-runner";
import { FIXTURES_DIR } from "../fixture-paths";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = join(HERE, "../../fixtures/spatial");
const CHECK = process.argv.includes("--check");
/**
 * Skip the .png render products — see `writeCheckedBinary`. Env-var rather than
 * a flag so the derived CI gate keeps calling the plain `author:*:check`
 * scripts it enumerates from package.json; unset locally, so a hand run still
 * byte-checks the images.
 */
const TEXT_ONLY = process.env.SRD_CC_AUTHOR_CHECK_TEXT_ONLY === "1";

const PROOF_BUNDLE = "srd_proof";
const STEP_AFFORDANCE_ID = "srd/affordance/step";
const STEP_BINDINGS = STEP_EDGE_BINDINGS_JSON;

interface SceneSpec {
	id: string;
	title: string;
	description: string;
	/** Verb sequence that authors this scene (after shared define_bundle). */
	buildCalls: () => VerbCall[];
	renders: Array<{ stem: string; label: string; options: SpatialViewOptions }>;
}

function n(graph: string, local: string): string {
	return `${graph}/${local}`;
}

function biEdges(pairs: Array<[string, string]>): Array<[string, string]> {
	const out: Array<[string, string]> = [];
	for (const [a, b] of pairs) out.push([a, b], [b, a]);
	return out;
}

function authorPlace(
	label: string,
	graph: string,
	substrate: "outdoor" | "indoor",
	description: string,
	nodes: Array<{ local: string; name: string; x?: number; y?: number; elevation?: number }>,
	edgeLocals: Array<[string, string]>,
): { calls: VerbCall[]; edgeKeys: string[] } {
	const fqNodes = nodes.map((node) => ({
		id: n(graph, node.local),
		name: node.name,
		...(node.x !== undefined ? { x: node.x } : {}),
		...(node.y !== undefined ? { y: node.y } : {}),
		...(node.elevation !== undefined ? { elevation: node.elevation } : {}),
	}));
	const edges = biEdges(edgeLocals.map(([a, b]) => [n(graph, a), n(graph, b)] as [string, string]));
	const edgeKeys = edges.map(([a, b]) => `${a}->${b}`);
	return {
		edgeKeys,
		calls: [
			{
				toolName: "spellkave_author_place",
				label,
				params: {
					bundle: PROOF_BUNDLE,
					substrate,
					description,
					nodes: fqNodes,
					edges,
				},
			},
		],
	};
}

/** ADR-0101 (task 6.2): a bundle-scoped `[[movement_defaults]]` row
 * (authored once per scene run in `main()`, right after `spellkave_define_
 * bundle`) replaces this per-edge helper — every scene's edges now inherit
 * ordinary walking for free instead of carrying their own
 * `srd/affordance/step` row. */
function movementDefaultStep(): VerbCall {
	return {
		toolName: "spellkave_set_movement_default",
		label: "movement-default-step",
		params: {
			bundle: PROOF_BUNDLE,
			affordance_template_id: STEP_AFFORDANCE_ID,
			bindings_json: STEP_BINDINGS,
		},
	};
}

function placeNpc(label: string, at: string, key_prefix: string, kind: "npc" | "item"): VerbCall {
	return {
		toolName: kind === "npc" ? "spellkave_place_actor" : "spellkave_place_entity",
		label,
		params: {
			bundle: PROOF_BUNDLE,
			kind,
			at,
			key_prefix,
		},
	};
}

const cottageId = `${PROOF_BUNDLE}/cottage`;
const tavernId = `${PROOF_BUNDLE}/tavern`;
const dungeonId = `${PROOF_BUNDLE}/dungeon`;

const SCENES: SceneSpec[] = [
	{
		id: "cottage",
		title: "Cottage (multi-floor indoor)",
		description: "Foyer–hall–kitchen with cellar under kitchen (shared x,y, z=-3).",
		buildCalls: () => {
			const place = authorPlace(
				"cottage-place",
				cottageId,
				"indoor",
				"Small cottage with cellar",
				[
					{ local: "foyer", name: "Foyer", x: 0, y: 0, elevation: 0 },
					{ local: "hall", name: "Hall", x: 0, y: 4, elevation: 0 },
					{ local: "kitchen", name: "Kitchen", x: 4, y: 4, elevation: 0 },
					{ local: "cellar", name: "Cellar", x: 4, y: 4, elevation: -3 },
				],
				[
					["foyer", "hall"],
					["hall", "kitchen"],
					["kitchen", "cellar"],
				],
			);
			// place_actor (not place_entity): furnished LOD badges read ASL rows.
			return [
				...place.calls,
				placeNpc("cottage-pegs", n(cottageId, "foyer"), "cottage/coat_pegs", "npc"),
				placeNpc("cottage-table", n(cottageId, "kitchen"), "cottage/table", "npc"),
				placeNpc("cottage-stove", n(cottageId, "kitchen"), "cottage/stove", "npc"),
				placeNpc("cottage-chest", n(cottageId, "cellar"), "cottage/chest", "npc"),
			];
		},
		renders: [
			{
				stem: "cottage-z0",
				label: "A elevation_band z=0",
				options: { graphId: cottageId, slice: "elevation_band", z: 0 },
			},
			{
				stem: "cottage-z-3",
				label: "A elevation_band z=-3",
				options: { graphId: cottageId, slice: "elevation_band", z: -3 },
			},
			{
				stem: "cottage-floors",
				label: "B all_floors_offset",
				options: { graphId: cottageId, slice: "all_floors_offset" },
			},
			{
				stem: "cottage-structure",
				label: "C structure LOD",
				options: { graphId: cottageId, slice: "elevation_band", z: 0, lod: "structure" },
			},
			{
				stem: "cottage-furnished",
				label: "C furnished LOD",
				options: { graphId: cottageId, slice: "elevation_band", z: 0, lod: "furnished" },
			},
			{
				stem: "cottage-metric-flat",
				label: "metric (stacked z — bad default)",
				options: { graphId: cottageId, slice: "metric" },
			},
		],
	},
	{
		id: "tavern",
		title: "Tavern (detailed ground + cellar)",
		description: "Common room, bar, kitchen, stairs, private booth; cellar stores.",
		buildCalls: () => {
			const place = authorPlace(
				"tavern-place",
				tavernId,
				"indoor",
				"Detailed tavern ground + cellar",
				[
					{ local: "common", name: "Common Room", x: 0, y: 0, elevation: 0 },
					{ local: "bar", name: "Bar", x: 3, y: 0, elevation: 0 },
					{ local: "kitchen", name: "Kitchen", x: 6, y: 0, elevation: 0 },
					{ local: "booth", name: "Private Booth", x: 0, y: 3, elevation: 0 },
					{ local: "stairs", name: "Stairs", x: 3, y: 3, elevation: 0 },
					{ local: "cellar_hall", name: "Cellar Hall", x: 3, y: 3, elevation: -3 },
					{ local: "cellar_stores", name: "Cellar Stores", x: 6, y: 3, elevation: -3 },
					{ local: "cellar_ale", name: "Ale Casks", x: 0, y: 3, elevation: -3 },
				],
				[
					["common", "bar"],
					["bar", "kitchen"],
					["common", "booth"],
					["common", "stairs"],
					["bar", "stairs"],
					["stairs", "cellar_hall"],
					["cellar_hall", "cellar_stores"],
					["cellar_hall", "cellar_ale"],
				],
			);
			return [
				...place.calls,
				placeNpc("tavern-p1", n(tavernId, "common"), "tavern/patron_1", "npc"),
				placeNpc("tavern-p2", n(tavernId, "common"), "tavern/patron_2", "npc"),
				placeNpc("tavern-barkeep", n(tavernId, "bar"), "tavern/barkeep", "npc"),
				placeNpc("tavern-cook", n(tavernId, "kitchen"), "tavern/cook", "npc"),
				placeNpc("tavern-spy", n(tavernId, "booth"), "tavern/spy", "npc"),
				placeNpc("tavern-rat", n(tavernId, "cellar_ale"), "tavern/rat", "npc"),
			];
		},
		renders: [
			{
				stem: "tavern-z0",
				label: "A ground floor",
				options: { graphId: tavernId, slice: "elevation_band", z: 0, lod: "furnished" },
			},
			{
				stem: "tavern-z-3",
				label: "A cellar",
				options: { graphId: tavernId, slice: "elevation_band", z: -3, lod: "furnished" },
			},
			{
				stem: "tavern-floors",
				label: "B all floors",
				options: { graphId: tavernId, slice: "all_floors_offset", lod: "structure" },
			},
			{
				stem: "tavern-structure",
				label: "C structure EG",
				options: { graphId: tavernId, slice: "elevation_band", z: 0, lod: "structure" },
			},
		],
	},
	{
		id: "dungeon",
		title: "Dungeon (topology-only)",
		description: "Unpositioned rooms — adjacency layout only (phase D).",
		buildCalls: () => {
			// author_place always stamps metric positions; topology_only needs
			// pos_present=false — long-tail write_rows (plan gap A2 / layout:none).
			const locals = ["entrance", "guard", "hall", "crypt", "treasury"] as const;
			const names: Record<(typeof locals)[number], string> = {
				entrance: "Entrance",
				guard: "Guard Room",
				hall: "Great Hall",
				crypt: "Crypt",
				treasury: "Treasury",
			};
			const edgeLocals: Array<[string, string]> = [
				["entrance", "guard"],
				["guard", "hall"],
				["hall", "crypt"],
				["hall", "treasury"],
			];
			const edges = biEdges(
				edgeLocals.map(([a, b]) => [n(dungeonId, a), n(dungeonId, b)] as [string, string]),
			);
			const edgeKeys = edges.map(([a, b]) => `${a}->${b}`);
			return [
				{
					toolName: "spellkave_write_rows",
					label: "dungeon-graph",
					params: {
						bundle: PROOF_BUNDLE,
						kind: "place_graphs",
						rows: [
							{
								place_graph_id: dungeonId,
								bundle_id: PROOF_BUNDLE,
								substrate_id: "indoor",
								display_name: "Forgotten Crypt",
								description: "Topology-only dungeon (no metric positions)",
								anchor_node_id: n(dungeonId, "entrance"),
								metres_per_unit: 1.0,
								bearing: 0.0,
							},
						],
					},
				},
				{
					toolName: "spellkave_write_rows",
					label: "dungeon-nodes",
					params: {
						bundle: PROOF_BUNDLE,
						kind: "place_nodes",
						rows: locals.map((local) => ({
							node_id: n(dungeonId, local),
							place_graph_id: dungeonId,
							local_id: local,
							bundle_id: PROOF_BUNDLE,
							substrate_id: "indoor",
							display_name: names[local],
							pos_present: false,
							pose_elevation_present: false,
						})),
					},
				},
				{
					toolName: "spellkave_write_rows",
					label: "dungeon-edges",
					params: {
						bundle: PROOF_BUNDLE,
						kind: "place_edges",
						rows: edges.map(([from, to]) => ({
							edge_key: `${from}->${to}`,
							place_graph_id: dungeonId,
							bundle_id: PROOF_BUNDLE,
							from_node_id: from,
							to_node_id: to,
						})),
					},
				},
				placeNpc("dungeon-skel", n(dungeonId, "guard"), "dungeon/skeleton", "npc"),
				placeNpc("dungeon-wight", n(dungeonId, "crypt"), "dungeon/wight", "npc"),
			];
		},
		renders: [
			{
				stem: "dungeon-topology",
				label: "D topology_only",
				options: { graphId: dungeonId, slice: "topology_only", lod: "furnished" },
			},
			{
				stem: "dungeon-structure",
				label: "D topology structure",
				options: { graphId: dungeonId, slice: "topology_only", lod: "structure" },
			},
		],
	},
];

function writeCheckedBinary(path: string, data: Buffer): void {
	// sk-dms.42: SVG rasterisation is not byte-reproducible across platforms, so
	// a committed .png rendered on macOS never equals one rendered on a Linux CI
	// runner. Under TEXT_ONLY the binaries are neither written nor compared —
	// what actually drives the seeded world is the TOML beside them, and that
	// IS reproducible. Skipping is honest here precisely because a byte gate on
	// these files is unachievable, not merely inconvenient.
	if (TEXT_ONLY) {
		return;
	}
	mkdirSync(dirname(path), { recursive: true });
	if (CHECK) {
		if (!existsSync(path)) {
			throw new Error(`--check: missing ${path}`);
		}
		const prev = readFileSync(path);
		if (!prev.equals(data)) {
			throw new Error(`--check: drift in ${path}`);
		}
		return;
	}
	writeFileSync(path, data);
}

function writeChecked(path: string, body: string): void {
	mkdirSync(dirname(path), { recursive: true });
	const normalized = `${body.replace(/\n+$/, "")}\n`;
	if (CHECK) {
		if (!existsSync(path)) {
			throw new Error(`--check: missing ${path}`);
		}
		const prev = readFileSync(path, "utf8");
		if (prev !== normalized) {
			throw new Error(`--check: drift in ${path}`);
		}
		return;
	}
	writeFileSync(path, normalized, "utf8");
}

function asRowTables(parsed: Record<string, unknown>): SpatialGraphToolRows & {
	bundles?: Array<Record<string, unknown>>;
	entities?: Array<Record<string, unknown>>;
	actors?: Array<Record<string, unknown>>;
	place_edge_affordance?: Array<Record<string, unknown>>;
	movement_defaults?: Array<Record<string, unknown>>;
} {
	const out: Record<string, unknown[]> = {};
	for (const [k, v] of Object.entries(parsed)) {
		if (Array.isArray(v)) out[k] = v as unknown[];
	}
	return out as SpatialGraphToolRows & {
		bundles?: Array<Record<string, unknown>>;
		entities?: Array<Record<string, unknown>>;
		actors?: Array<Record<string, unknown>>;
		place_edge_affordance?: Array<Record<string, unknown>>;
		movement_defaults?: Array<Record<string, unknown>>;
	};
}

async function main(): Promise<void> {
	mkdirSync(join(OUT_ROOT, "renders"), { recursive: true });
	const target = createLocalAuthorTarget(FIXTURES_DIR);
	const indexLines: string[] = [
		"# Spatial map-view proofs (phases A–D)",
		"",
		"Generated by `packages/spellkave-srd-cc/src/author/author-spatial-map-proofs.ts`.",
		"",
		`All scenes use proof bundle \`${PROOF_BUNDLE}\` (depends_on = ["srd"], companion verbs).`,
		"",
		"```bash",
		"pnpm --filter @spellkave/srd-cc author:spatial-map-proofs",
		"pnpm --filter @spellkave/srd-cc author:spatial-map-proofs:check",
		"```",
		"",
		"| Scene | TOML | Renders |",
		"|---|---|---|",
	];

	for (const scene of SCENES) {
		const calls: VerbCall[] = [
			{
				toolName: "spellkave_define_bundle",
				label: `${scene.id}-bundle`,
				params: {
					bundle_id: PROOF_BUNDLE,
					depends_on: ["srd"],
					display_name: scene.title,
					author: "spellkave-srd-cc",
					version: "1.0.0",
					description: scene.description,
					// place-node-extent (sk-71u): every scene's place_nodes stay
					// extent-less themselves (they author position/topology only, per
					// scene.buildCalls()) — a bundle-level default keeps them
					// well-formed instead of failing PlaceNodeExtentResolves. A modest
					// room-scale cube (core/area/cube is kernel vocabulary,
					// KNOWN_AREA_SHAPE_IDS — referencing it does not violate the srd
					// bundle's own self-sufficiency rule, which is about `srd/*`
					// content, not core substrate).
					default_extent_shape_id: "core/area/cube",
					default_extent_params_json: '{"extent_m": 4.5}',
				},
			},
			movementDefaultStep(),
			...scene.buildCalls(),
		];
		const toml = await driveSrdScene(calls, target);
		const tables = asRowTables(inspectManifest(toml).manifest as Record<string, unknown>);

		// Scene-scoped export (only this graph's rows + occupancy).
		const graphId =
			scene.id === "cottage" ? cottageId : scene.id === "tavern" ? tavernId : dungeonId;
		const place_graphs = (tables.place_graphs ?? []).filter((r) => r.place_graph_id === graphId);
		const place_nodes = (tables.place_nodes ?? []).filter((r) => r.place_graph_id === graphId);
		const place_edges = (tables.place_edges ?? []).filter((r) => r.place_graph_id === graphId);
		const edgeKeys = new Set(place_edges.map((e) => String(e.edge_key)));
		const place_edge_affordance = (tables.place_edge_affordance ?? []).filter((r) =>
			edgeKeys.has(String(r.edge_key)),
		);
		const nodeIds = new Set(place_nodes.map((r) => String(r.node_id)));
		const actor_spatial_locations = (tables.actor_spatial_locations ?? []).filter((r) =>
			nodeIds.has(String(r.place_node_id)),
		);
		const aslKeys = new Set(actor_spatial_locations.map((r) => String(r.entity_key)));
		const actors = (tables.actors ?? []).filter((r) => aslKeys.has(String(r.entity_key)));
		const entities = (tables.entities ?? []).filter(
			(r) => aslKeys.has(String(r.entity_key)) || nodeIds.has(String(r.place_node_id)),
		);
		const bundles = (tables.bundles ?? []).filter((r) => r.bundle_id === PROOF_BUNDLE);
		// ADR-0101 (task 6.2): the bundle-scoped movement_defaults row every
		// scene run authors via movementDefaultStep() — exported alongside the
		// scene's own rows or the scene's edges would carry NO traversal rows
		// at all (place_edge_affordance is now empty by design).
		const movement_defaults = (tables.movement_defaults ?? []).filter(
			(r) => r.bundle_id === PROOF_BUNDLE,
		);

		const sceneManifest = renderSchemaManifest({
			schema_version: "1.0.0",
			// ADR-0145: the three spatial scenes share bundle srd_proof; each root
			// is its own applyset so one scene's apply never retracts another's.
			applyset: `srd_proof.${scene.id}`,
			bundles,
			place_graphs,
			place_nodes,
			place_edges,
			place_edge_affordance,
			movement_defaults,
			actor_spatial_locations,
			actors,
			entities,
		});
		writeChecked(join(OUT_ROOT, `${scene.id}.manifest.toml`), sceneManifest);

		const renderNames: string[] = [];
		const rows: SpatialGraphToolRows = {
			place_graphs,
			place_nodes,
			place_edges,
			actor_spatial_locations,
		};
		for (const render of scene.renders) {
			const view = buildSpatialGraphView(rows, {
				...render.options,
				terminal: "ascii",
				width: 72,
				height: 28,
			});
			if (!view.hasLayout || view.svg === null) {
				throw new Error(`${scene.id}/${render.stem}: no layout (${view.inventory.slice(0, 120)})`);
			}
			const asciiBody = view.ascii ?? view.utf8;
			if (!asciiBody) {
				throw new Error(`${scene.id}/${render.stem}: missing ascii map`);
			}
			writeChecked(join(OUT_ROOT, "renders", `${render.stem}.svg`), view.svg);
			const map = asciiBody.replace(/\n+$/, "");
			writeChecked(
				join(OUT_ROOT, "renders", `${render.stem}.ascii.md`),
				[`# ${render.label}`, "", "```text", map, "```", ""].join("\n"),
			);
			writeChecked(
				join(OUT_ROOT, "renders", `${render.stem}.inventory.txt`),
				`${render.label}\n${view.inventory}`,
			);
			const { png } = await rasterizeSvgToPng(view.svg, { width: 480 });
			writeCheckedBinary(join(OUT_ROOT, "renders", `${render.stem}.png`), png);
			renderNames.push(`\`${render.stem}.{svg,png,ascii.md}\` (${render.label})`);
		}
		indexLines.push(
			`| **${scene.title}** | [\`${scene.id}.manifest.toml\`](./${scene.id}.manifest.toml) | ${renderNames.join(", ")} |`,
		);
	}

	indexLines.push("");
	indexLines.push("## Phase map");
	indexLines.push("");
	indexLines.push("| Phase | Mode | Purpose |");
	indexLines.push("|---|---|---|");
	indexLines.push("| A | `elevation_band` | One floor plan (default indoor multi-z) |");
	indexLines.push("| B | `all_floors_offset` | Side-by-side floors for small buildings |");
	indexLines.push("| C | `lod=structure\\|furnished` | Rooms-only vs occupancy badges |");
	indexLines.push("| D | `topology_only` | Unpositioned dungeons via adjacency layout |");
	indexLines.push("");

	writeChecked(join(OUT_ROOT, "README.md"), `${indexLines.join("\n")}\n`);
	console.log(
		CHECK
			? `[spatial-map-proofs] OK — ${SCENES.length} scenes match fixtures`
			: `[spatial-map-proofs] wrote ${SCENES.length} scenes under ${OUT_ROOT}`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
