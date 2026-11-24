/**
 * // pattern: bundle-movement-default
 *
 * Hobgoblin camp — map 17. Outdoor child of region.
 */

import { HOBGOBLIN_CAMP_MAP, HOBGOBLIN_CAMP_PINS } from "./lib/hobgoblin-camp-alignment.ts";
import { GRAPHS } from "./lib/ids.ts";
import { GRAPH_SCALE_M, HOBGOBLIN_CAMP_NODE_CELLS } from "./lib/outdoor-h3.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";

const NODE_DESCRIPTIONS: Record<string, string> = {
	approach: "The trail widens into the camp approach, boot-prints deep in the mud.",
	picket: "A picket line of stakes and rope, a challenge shouted from somewhere inside.",
	tent_row: "A neat row of war-tents, shields stacked between them.",
	cookfire: "A cookfire with a blackened pot, the smell of meat and grease.",
	worg_pens: "Staked pens where worgs pace and snap at the air.",
	command_tent: "Warcaptain Ghorza's pavilion, banners of the road-raiders hanging limp.",
	rear_trail: "A rear trail escaping into thicker forest behind the command tent.",
};

export function hobgoblin_camp(): GraphSlice {
	return placeGraph("hobgoblin_camp", {
		graph: GRAPHS.hobgoblin_camp,
		substrate: "outdoor",
		display_name: "Hobgoblin Camp",
		description:
			"A disciplined hobgoblin camp on the forest road — pickets, tents, and a captain's pavilion.",
		provenance: {
			template: "Elven Tower map 17",
			composition: "Outdoor child of region (composition).",
		},
		parent_graph_id: GRAPHS.region,
		metres_per_unit: GRAPH_SCALE_M,
		bearing: 0,
		nodes: HOBGOBLIN_CAMP_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			cell_res10: HOBGOBLIN_CAMP_NODE_CELLS[p.local],
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(
				p.footprint,
				HOBGOBLIN_CAMP_MAP.grid_distance_m,
				HOBGOBLIN_CAMP_MAP.vertical_half_extent_m,
			),
		})),
		edgeLocals: [
			["approach", "picket"],
			["picket", "tent_row"],
			["tent_row", "cookfire"],
			["cookfire", "worg_pens"],
			["cookfire", "command_tent"],
			["command_tent", "rear_trail"],
		],
	});
}
