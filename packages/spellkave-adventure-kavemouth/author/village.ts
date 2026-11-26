/**
 * // pattern: bundle-movement-default
 *
 * Outdoor bough village. Child of hamlet.
 */
import { GRAPHS } from "./lib/ids.ts";
import { GRAPH_SCALE_M, VILLAGE_NODE_CELLS } from "./lib/outdoor-h3.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";
import { planMetrics, planPins } from "./lib/layouts.ts";

const VILLAGE_MAP = planMetrics("village");
const VILLAGE_PINS = planPins("village");

const NODE_DESCRIPTIONS: Record<string, string> = {
	path_from_hamlet:
		"A climbing path leaves the fortified walls behind, moss underfoot and lantern-rope strung between the first platforms.",
	central_circle:
		"A broad circular platform of living wood, dwellings packed around a central open court.",
	west_platform:
		"A western platform hung with drying herbs, the stream glittering far below its rim.",
	north_platform:
		"Northern platforms stacked two-high, their bridges swaying gently in the valley wind.",
	east_platform:
		"The eastern platform looks back toward the hamlet walls, a sentry bell hanging unused.",
	tree_dwellings: "Dwelling-pods grow from a great tree, walkways spiraling among leaf and bark.",
	green:
		"A small green of moonpetal flowers between the central circle and the tree dwellings — Tamsin's gathering place. Reed-stained charms hang from a post here, a warning of Ulda Reedwife: her hut lies in the swamp, reached from the East Road by the way Downstream to Swamp.",
};

export function village(): GraphSlice {
	return placeGraph("village", {
		graph: GRAPHS.village,
		substrate: "outdoor",
		display_name: "Village",
		description:
			"The elven quarter above the walls — circular platforms and tree dwellings linked by rope bridges over the stream.",
		provenance: {
			template: "First-party plan (author/lib/layouts.ts)",
			composition: "Outdoor child of hamlet (composition).",
		},
		parent_graph_id: GRAPHS.hamlet,
		metres_per_unit: GRAPH_SCALE_M,
		bearing: 0,
		nodes: VILLAGE_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			cell_res10: VILLAGE_NODE_CELLS[p.local],
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(
				p.footprint,
				VILLAGE_MAP.grid_distance_m,
				VILLAGE_MAP.vertical_half_extent_m,
			),
		})),
		edgeLocals: [
			["path_from_hamlet", "central_circle"],
			["central_circle", "west_platform"],
			["central_circle", "north_platform"],
			["central_circle", "east_platform"],
			["central_circle", "green"],
			["green", "tree_dwellings"],
			["east_platform", "tree_dwellings"],
		],
	});
}
