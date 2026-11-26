/**
 * // pattern: bundle-movement-default
 *
 * Outdoor Stonebridge. Child of region.
 */
import { GRAPHS } from "./lib/ids.ts";
import { GRAPH_SCALE_M, STONEBRIDGE_NODE_CELLS } from "./lib/outdoor-h3.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";
import { planMetrics, planPins } from "./lib/layouts.ts";

const STONEBRIDGE_MAP = planMetrics("stonebridge");
const STONEBRIDGE_PINS = planPins("stonebridge");

const NODE_DESCRIPTIONS: Record<string, string> = {
	south_approach:
		"The south road opens onto the bridge approach, river mist hanging low over the banks.",
	bridge_south: "The south end of the bridge, planks worn smooth by cart wheels.",
	bridge_mid: "Midspan over dark water — the current tugs at the piers below.",
	bridge_north:
		"The north end of the bridge, a low railing and a path climbing toward the mill road.",
	north_road: "The mill road climbs away from the river through wet scrub.",
	east_bank: "A muddy path along the east bank, reeds whispering against the current.",
	west_bank: "The west bank path threads between roots and low boulders.",
};

export function stonebridge(): GraphSlice {
	return placeGraph("stonebridge", {
		graph: GRAPHS.stonebridge,
		substrate: "outdoor",
		display_name: "Stonebridge",
		description: "A stone-and-timber bridge spans the river where the road climbs toward the mill.",
		provenance: {
			template: "First-party plan (author/lib/layouts.ts)",
			composition: "Outdoor child of region (composition).",
		},
		parent_graph_id: GRAPHS.region,
		metres_per_unit: GRAPH_SCALE_M,
		bearing: 0,
		nodes: STONEBRIDGE_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			cell_res10: STONEBRIDGE_NODE_CELLS[p.local],
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(
				p.footprint,
				STONEBRIDGE_MAP.grid_distance_m,
				STONEBRIDGE_MAP.vertical_half_extent_m,
			),
		})),
		edgeLocals: [
			["south_approach", "bridge_south"],
			["bridge_south", "bridge_mid"],
			["bridge_mid", "bridge_north"],
			["bridge_north", "north_road"],
			["bridge_mid", "east_bank"],
			["bridge_mid", "west_bank"],
		],
	});
}
