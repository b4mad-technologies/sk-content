/**
 * // pattern: bundle-movement-default
 *
 * Outdoor hamlet.
 * Child of region; nest at South Road ↔ Gate portal.
 */
import { planMetrics, planPins } from "./lib/layouts.ts";
import { GRAPHS } from "./lib/ids.ts";
import { GRAPH_SCALE_M, HAMLET_NODE_CELLS } from "./lib/outdoor-h3.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";

const HAMLET_MAP = planMetrics("hamlet");
const HAMLET_PINS = planPins("hamlet");

// T5 build-out follow-up (2026-08-04) — see inn.ts's own comment on this map.
const NODE_DESCRIPTIONS: Record<string, string> = {
	gate: "A timber palisade gate, hinges groaning, opens onto the muddy square on one side and the open road on the other. A watch board lists the troubles: raiders on the Forest Road Trail to the War Camp, and Durgan's mine by the Upland Road and the North Pass.",
	square:
		"The hamlet's muddy square, worn smooth by cart traffic, gathers every path in the settlement around its well. The track up Tomb Hill and the old barrow leaves the square to the east.",
	inn_front:
		"The Lamp and Ladle's timber facade, a lantern swinging over its door, fronts the square just off the well.",
	well: "A stone well ringed by damp cobbles sits at the square's center, its bucket-rope creaking whenever the wind shifts.",
	east_houses:
		"A row of shuttered houses leans together along the square's eastern edge, chimney smoke thin in the morning air.",
	west_sheds:
		"Lean-to sheds and a woodpile crowd the square's western edge, the ground churned to mud beneath them.",
	tomb_hill:
		"A bare, wind-scoured hill rises east of the square, an old stone stair cut into its slope leading up toward the tomb.",
	village_path: "A climbing path leaves the east houses toward the elven quarter above the walls.",
	crypt_path: "A side track off tomb hill leads to a smaller crypt half-buried in bramble.",
};

export function hamlet(): GraphSlice {
	return placeGraph("hamlet", {
		graph: GRAPHS.hamlet,
		substrate: "outdoor",
		display_name: "Hamlet",
		description:
			"A palisaded hamlet — a handful of houses and sheds huddled around a well and a muddy square, walled against whatever the road brings.",
		provenance: {
			template: "First-party plan (author/lib/layouts.ts)",
			composition: "Outdoor child of region (composition).",
		},
		parent_graph_id: GRAPHS.region,
		metres_per_unit: GRAPH_SCALE_M,
		bearing: 0,
		nodes: HAMLET_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			cell_res10: HAMLET_NODE_CELLS[p.local],
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(
				p.footprint,
				HAMLET_MAP.grid_distance_m,
				HAMLET_MAP.vertical_half_extent_m,
			),
		})),
		edgeLocals: [
			["gate", "square"],
			["square", "inn_front"],
			["square", "tomb_hill"],
			["square", "well"],
			["square", "east_houses"],
			["square", "west_sheds"],
			["gate", "west_sheds"],
			["east_houses", "village_path"],
			["tomb_hill", "crypt_path"],
		],
	});
}
