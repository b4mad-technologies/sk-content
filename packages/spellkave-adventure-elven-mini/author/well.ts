/**
 * // pattern: bundle-movement-default
 *
 * Hidden well — maps 211+197. Indoor child of hamlet.
 */
import { GRAPHS } from "./lib/ids.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";
import { WELL_MAP, WELL_PINS } from "./lib/well-alignment.ts";

const NODE_DESCRIPTIONS: Record<string, string> = {
	mouth: "The stone well-mouth in the square, its rope frayed and the bucket gone.",
	upper_shaft: "Damp brick of the upper shaft, handholds slick with moss.",
	landing: "A mid-shaft landing cut into the brick, littered with gnawed bones.",
	side_niche: "A side niche barely wide enough for a crouched figure.",
	depth_hall: "A rough hall at the shaft's bottom, torch stubs burned to nubs.",
	wererat_nest: "A filthy nest of rags and stolen tin — the wererat den.",
	ooze_pool: "A gray film rides a shallow pool at the lowest point of the nest.",
};

export function well(): GraphSlice {
	return placeGraph("well", {
		graph: GRAPHS.well,
		substrate: "indoor",
		display_name: "Well",
		description:
			"The hamlet well drops into darkness — a shaft and nest of things that should not live under a village.",
		provenance: {
			template: "Elven Tower maps 211 + 197",
			composition: "Indoor child of hamlet; two elevations.",
		},
		parent_graph_id: GRAPHS.hamlet,
		metres_per_unit: WELL_MAP.grid_distance_m,
		bearing: 0,
		nodes: WELL_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(p.footprint, WELL_MAP.grid_distance_m, WELL_MAP.vertical_half_extent_m),
		})),
		edgeLocals: [
			["mouth", "upper_shaft"],
			["upper_shaft", "landing"],
			["landing", "side_niche"],
			["landing", "depth_hall"],
			["depth_hall", "wererat_nest"],
			["depth_hall", "ooze_pool"],
		],
	});
}
