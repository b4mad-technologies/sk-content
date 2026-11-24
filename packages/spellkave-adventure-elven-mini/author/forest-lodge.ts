/**
 * // pattern: bundle-movement-default
 *
 * Forest lodge — map 37. Outdoor child of region (indoor rooms on sheet).
 */

import { FOREST_LODGE_MAP, FOREST_LODGE_PINS } from "./lib/forest-lodge-alignment.ts";
import { GRAPHS } from "./lib/ids.ts";
import { FOREST_LODGE_NODE_CELLS, GRAPH_SCALE_M } from "./lib/outdoor-h3.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";

const NODE_DESCRIPTIONS: Record<string, string> = {
	forest_path: "A narrow forest path opens onto the lodge clearing, needles soft underfoot.",
	clearing: "A packed-earth clearing ringed by tall pines, the lodge at its heart.",
	porch: "A rough porch with a woodpile and a pair of muddy boots by the door.",
	main_room: "The main room of the lodge — table, racks of tools, and a smell of pine resin.",
	hearth: "A stone hearth still warm, a kettle hanging empty over ash.",
	loft: "A low sleeping loft under the eaves, blankets folded neat.",
	woodshed: "A lean-to woodshed stacked with split oak.",
	tree_line: "The tree line at the clearing's edge, where the forest closes in again.",
};

export function forest_lodge(): GraphSlice {
	return placeGraph("forest_lodge", {
		graph: GRAPHS.forest_lodge,
		substrate: "outdoor",
		display_name: "Forest Lodge",
		description:
			"A gamekeeper's cottage in a forest clearing — porch, hearth, and a loft under the eaves.",
		provenance: {
			template: "Elven Tower map 37",
			composition: "Outdoor child of region; lodge rooms on sheet.",
		},
		parent_graph_id: GRAPHS.region,
		metres_per_unit: GRAPH_SCALE_M,
		bearing: 0,
		nodes: FOREST_LODGE_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			cell_res10: FOREST_LODGE_NODE_CELLS[p.local],
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(
				p.footprint,
				FOREST_LODGE_MAP.grid_distance_m,
				FOREST_LODGE_MAP.vertical_half_extent_m,
			),
		})),
		edgeLocals: [
			["forest_path", "clearing"],
			["clearing", "porch"],
			["porch", "main_room"],
			["main_room", "hearth"],
			["main_room", "loft"],
			["clearing", "woodshed"],
			["clearing", "tree_line"],
		],
	});
}
