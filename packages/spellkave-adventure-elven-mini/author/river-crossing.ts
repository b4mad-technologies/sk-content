/**
 * // pattern: bundle-movement-default
 *
 * Outdoor river crossing — map 34. Child of region.
 */
import { GRAPHS } from "./lib/ids.ts";
import { GRAPH_SCALE_M, RIVER_CROSSING_NODE_CELLS } from "./lib/outdoor-h3.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";
import { RIVER_CROSSING_MAP, RIVER_CROSSING_PINS } from "./lib/river-crossing-alignment.ts";

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

export function river_crossing(): GraphSlice {
	return placeGraph("river_crossing", {
		graph: GRAPHS.river_crossing,
		substrate: "outdoor",
		display_name: "River Crossing",
		description: "A stone-and-timber bridge spans the river where the road climbs toward the mill.",
		provenance: {
			template: "Elven Tower map 34",
			composition: "Outdoor child of region (composition).",
		},
		parent_graph_id: GRAPHS.region,
		metres_per_unit: GRAPH_SCALE_M,
		bearing: 0,
		nodes: RIVER_CROSSING_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			cell_res10: RIVER_CROSSING_NODE_CELLS[p.local],
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(
				p.footprint,
				RIVER_CROSSING_MAP.grid_distance_m,
				RIVER_CROSSING_MAP.vertical_half_extent_m,
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
