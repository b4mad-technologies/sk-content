/**
 * // pattern: bundle-movement-default
 *
 * Indoor inn, the Lamp and Ladle.
 * Composition child of hamlet; cells stay 0.
 */
import { GRAPHS } from "./lib/ids.ts";
import { planMetrics, planPins } from "./lib/layouts.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";

const INN_MAP = planMetrics("inn");
const INN_PINS = planPins("inn");

// T5 build-out follow-up (2026-08-04): per-node arrival prose, 1-2 sensory
// sentences each, no mechanic numbers — closes the "no node_description"
// observation_gap describeArrival reports on every within-graph move
// (shared tool runtime's T5 fix, commit 0c3d98958).
const NODE_DESCRIPTIONS: Record<string, string> = {
	foyer:
		"A cramped entry hall smelling of wet cloaks and cold hearth-ash, the front door letting in a draft every time it swings.",
	common_room:
		"Long trestle tables share the room with a low fire, the smell of woodsmoke and last night's stew going cold on the hearth. A pilgrim's map nailed by the door marks the Twin Lamp shrine: out along the Forest Road, then the Pilgrim Path.",
	bar: "A scarred oak counter lined with tapped kegs and chipped mugs, close enough to the common room's fire to catch its warmth. A slate above the kegs marks the way to the old barrow: cross the square, then take the track east up Tomb Hill.",
	stairs:
		"A narrow, creaking staircase climbs past exposed timber, splitting toward the guest loft above and a cellar hatch below.",
	loft: "Rafters slope low over a scatter of straw pallets, quiet enough this early to hear the whole inn settling beneath you.",
	cellar:
		"A cold, low-ceilinged cellar stacked with barrels and root sacks, the only light spilling down from the stairs above.",
};

export function inn(): GraphSlice {
	return placeGraph("inn", {
		graph: GRAPHS.inn,
		substrate: "indoor",
		display_name: "Inn",
		description:
			"The Lamp and Ladle — three creaking floors of timber and lantern-light, tucked just off the hamlet square.",
		provenance: {
			template: "First-party plan (author/lib/layouts.ts)",
			composition: "Indoor child of hamlet (composition).",
		},
		parent_graph_id: GRAPHS.hamlet,
		// pos_x/pos_y (INN_PINS) are backdrop-cell indices, not metres —
		// metres_per_unit MUST equal the metres-per-cell this graph's own
		// map_layer declares (INN_MAP.grid_distance_m, attached by
		// backdrops.ts) or every metric range/movement reader downstream
		// computes the wrong distance (sk-j1a).
		metres_per_unit: INN_MAP.grid_distance_m,
		bearing: 0,
		nodes: INN_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(p.footprint, INN_MAP.grid_distance_m, INN_MAP.vertical_half_extent_m),
		})),
		edgeLocals: [
			["foyer", "common_room"],
			["common_room", "bar"],
			["common_room", "stairs"],
			["foyer", "stairs"],
			["stairs", "loft"],
			["stairs", "cellar"],
		],
	});
}
