/**
 * // pattern: bundle-movement-default
 *
 * Swamp — map 257. Outdoor child of region.
 */
import { GRAPHS } from "./lib/ids.ts";
import { GRAPH_SCALE_M, SWAMP_NODE_CELLS } from "./lib/outdoor-h3.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";
import { SWAMP_MAP, SWAMP_PINS } from "./lib/swamp-alignment.ts";

const NODE_DESCRIPTIONS: Record<string, string> = {
	river_edge: "The river frays into channels and standing water, the solid bank ending here.",
	reed_path: "A precarious path of packed reed and mud, sucking at every step.",
	frog_pool: "A deep pool loud with giant frogs, eyes like coins on the surface.",
	will_o_wisp_glade: "A glade where cold lights drift above the water, never quite where you look.",
	hag_hut: "A crooked hut on stilts, smoke the wrong color leaking from its roof.",
	bone_garden: "Stakes of bone and charm-rags ring the hut like a garden fence.",
	backwater: "A still backwater behind the hut, black as ink.",
};

export function swamp(): GraphSlice {
	return placeGraph("swamp", {
		graph: GRAPHS.swamp,
		substrate: "outdoor",
		display_name: "Swamp",
		description: "A drowned reach of the river where a green hag keeps her hut among the reeds.",
		provenance: {
			template: "Elven Tower map 257",
			composition: "Outdoor child of region (downstream).",
		},
		parent_graph_id: GRAPHS.region,
		metres_per_unit: GRAPH_SCALE_M,
		bearing: 0,
		nodes: SWAMP_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			cell_res10: SWAMP_NODE_CELLS[p.local],
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(
				p.footprint,
				SWAMP_MAP.grid_distance_m,
				SWAMP_MAP.vertical_half_extent_m,
			),
		})),
		edgeLocals: [
			["river_edge", "reed_path"],
			["reed_path", "frog_pool"],
			["reed_path", "will_o_wisp_glade"],
			["frog_pool", "hag_hut"],
			["will_o_wisp_glade", "hag_hut"],
			["hag_hut", "bone_garden"],
			["hag_hut", "backwater"],
		],
	});
}
