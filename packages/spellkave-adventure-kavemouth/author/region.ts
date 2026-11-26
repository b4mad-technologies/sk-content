/**
 * // pattern: bundle-movement-default
 *
 * Outdoor region around Waymeet.
 * Composition root: real H3 origin + outdoor cell stamps (verb-native).
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { FLY_EDGE_BINDINGS_JSON, SWIM_EDGE_BINDINGS_JSON } from "./lib/edge-bindings.ts";
import { FLY_AFFORDANCE_ID, GRAPHS, nodeId, SWIM_AFFORDANCE_ID } from "./lib/ids.ts";
import { GRAPH_SCALE_M, H3_CLUSTER, REGION_NODE_CELLS } from "./lib/outdoor-h3.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";
import { planMetrics, planPins } from "./lib/layouts.ts";

const REGION_MAP = planMetrics("region");
const REGION_PINS = planPins("region");

// T5 build-out follow-up (2026-08-04) — see inn.ts's own comment on this map.
const NODE_DESCRIPTIONS: Record<string, string> = {
	waymeet:
		"Waymeet, a rutted meeting of four roads in open country. A leaning signpost names the roads: Hamlet Road back to the palisade; East Road to the Stonebridge, the ford and the swamp; Upland Road to the warren, the forest and the mine; West Road to the ravine. The carved arrows were knocked askew long ago, so read the names, not the arrows.",
	road_north:
		"The upland road climbs away from Waymeet through low scrub, the hamlet already lost behind a rise.",
	road_east:
		"The east road runs flat and empty toward a treeline, wind hissing through roadside grass.",
	road_south:
		"The hamlet road drops gently toward the palisade, smoke from its chimneys visible ahead.",
	road_west:
		"The west road fades into wilder country, the packed earth giving way to root and bramble underfoot.",
	// ADR-0101 (task 6.2): two clearly-labelled OPTIONAL detours off the
	// region graph's own leaf roads — neither sits on the recorded story path
	// (region -> road_south -> hamlet is the only edge the story replay ever
	// walks), so adding them cannot change recorded behaviour. Both are
	// off-artwork (no REGION_PINS/H3 cell entry — see the extra nodes below),
	// same idiom `dm-threshold.ts`'s creation-limbo door uses for a
	// synthetic, unpositioned edge.
	ravine_edge:
		"Beyond the west road the ground drops away into a jagged ravine, too wide to leap and too sheer to " +
		"climb down — only wings cross it.",
	river_ford:
		"Beyond the east road a shallow, cold stream cuts across the wild grass — a ford shallow enough to " +
		"wade, or swim if the footing gives way.",
	// sk-609b.8 destination stubs (off-artwork, same idiom as ravine/ford).

	road_to_river: "A packed spur leaves the east road toward the river bridge and the mill beyond.",

	road_to_warren:
		"A hill track climbs north into scrub where goblin smoke sometimes smudges the sky.",

	road_to_forest: "The forest road ducks under old oaks toward the gamekeeper's lodge.",

	road_to_swamp: "Downstream the river frays into reed and standing water — the hag's country.",

	road_to_mine: "The north pass road climbs toward a dark mine adit cut into the rock.",

	road_to_shrine: "A pilgrim path threads the old oaks toward the Twin Lamp shrine.",

	road_to_camp: "A side trail off the forest road shows hobgoblin boot-prints and worg scat.",
};

export function region(): GraphSlice {
	const base = placeGraph("region", {
		graph: GRAPHS.region,
		substrate: "outdoor",
		display_name: "Region",
		description:
			"Open country where the road forks four ways — north, east, south toward the hamlet, and west into the wild.",
		provenance: {
			template: "First-party plan (author/lib/layouts.ts)",
			composition: "Outdoor composition root; real H3 origin.",
		},
		origin_cell_res10: H3_CLUSTER.origin10,
		metres_per_unit: GRAPH_SCALE_M,
		bearing: 0,
		nodes: [
			...REGION_PINS.map((p) => ({
				local: p.local,
				name: p.name,
				x: p.x,
				y: p.y,
				cell_res10: REGION_NODE_CELLS[p.local],
				description: NODE_DESCRIPTIONS[p.local],
				...footprintFromCells(
					p.footprint,
					REGION_MAP.grid_distance_m,
					REGION_MAP.vertical_half_extent_m,
				),
			})),
			// Off-artwork detour nodes (task 6.2) — no cell_res10 (optional,
			// tool-reference.md's own `nodes[].cell_res10` doc comment), same
			// small cube footprint shape as the ordinary pins, positioned just
			// beyond their parent road along the SAME lateral line.
			{
				local: "ravine_edge",
				name: "Ravine's Edge",
				x: REGION_PINS.find((p) => p.local === "road_west")!.x - 6,
				y: REGION_PINS.find((p) => p.local === "road_west")!.y,
				description: NODE_DESCRIPTIONS.ravine_edge,
				...footprintFromCells(
					{ shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
					REGION_MAP.grid_distance_m,
					REGION_MAP.vertical_half_extent_m,
				),
			},
			{
				local: "river_ford",
				name: "River Ford",
				x: REGION_PINS.find((p) => p.local === "road_east")!.x + 6,
				y: REGION_PINS.find((p) => p.local === "road_east")!.y,
				description: NODE_DESCRIPTIONS.river_ford,
				...footprintFromCells(
					{ shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
					REGION_MAP.grid_distance_m,
					REGION_MAP.vertical_half_extent_m,
				),
			},
			...(
				[
					["road_to_river", "Road to Stonebridge", "road_east", 10, 0],
					["road_to_warren", "Hill Road to Warren", "road_north", 0, -8],
					["road_to_forest", "Forest Road", "road_north", 8, -4],
					["road_to_swamp", "Downstream to Swamp", "road_east", 10, 6],
					["road_to_mine", "North Pass to Mine", "road_north", -6, -8],
					["road_to_shrine", "Pilgrim Path to Shrine", "road_north", 10, -6],
					["road_to_camp", "Trail to the War Camp", "road_north", 12, -2],
				] as const
			).map(([local, name, from, dx, dy]) => {
				const base = REGION_PINS.find((p) => p.local === from)!;
				return {
					local,
					name,
					x: base.x + dx,
					y: base.y + dy,
					cell_res10: REGION_NODE_CELLS[local],
					description: NODE_DESCRIPTIONS[local],
					...footprintFromCells(
						{ shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
						REGION_MAP.grid_distance_m,
						REGION_MAP.vertical_half_extent_m,
					),
				};
			}),
		],
		edgeLocals: [
			["waymeet", "road_north"],
			["waymeet", "road_east"],
			["waymeet", "road_south"],
			["waymeet", "road_west"],
			["road_west", "ravine_edge"],
			["road_east", "river_ford"],
			["road_east", "road_to_river"],
			["road_north", "road_to_warren"],
			["road_north", "road_to_forest"],
			["road_east", "road_to_swamp"],
			["road_north", "road_to_mine"],
			["road_to_forest", "road_to_shrine"],
			["road_to_forest", "road_to_camp"],
		],
	});

	// ADR-0101 (A-2/A-3 content): the fly-only chasm and the walk-OR-swim
	// ford — the two alternative-mode edges this change's acceptance cases
	// need. Both edges keep the bundle's default walk mode UNLESS explicitly
	// replaced.
	const ravineEdgeNode = nodeId(GRAPHS.region, "ravine_edge");
	const roadWestNode = nodeId(GRAPHS.region, "road_west");
	const riverFordNode = nodeId(GRAPHS.region, "river_ford");
	const roadEastNode = nodeId(GRAPHS.region, "road_east");
	const modeCalls: VerbCall[] = [
		// Fly-only: REPLACE the injected bundle default (inherit_movement_
		// default=false) — nobody without srd/capability/fly may ever cross.
		{
			toolName: "spellkave_bind_edge_affordance",
			label: "region-ravine-fly",
			params: {
				from: roadWestNode,
				to: ravineEdgeNode,
				affordance_template_id: FLY_AFFORDANCE_ID,
				bindings_json: FLY_EDGE_BINDINGS_JSON,
				mode_id: "fly",
				inherit_movement_default: false,
				bidirectional: true,
			},
		},
		// Walk-OR-swim: the injected bundle default supplies the walk mode
		// (""); this row adds swim as a SIBLING alternative mode — the kernel
		// admits the edge if either mode passes, charging the cheaper.
		{
			toolName: "spellkave_bind_edge_affordance",
			label: "region-ford-swim",
			params: {
				from: roadEastNode,
				to: riverFordNode,
				affordance_template_id: SWIM_AFFORDANCE_ID,
				bindings_json: SWIM_EDGE_BINDINGS_JSON,
				mode_id: "swim",
				bidirectional: true,
			},
		},
	];

	return { edgeKeys: base.edgeKeys, calls: [...base.calls, ...modeCalls] };
}
