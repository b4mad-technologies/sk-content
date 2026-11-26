/**
 * // pattern: bundle-movement-default
 *
 * Shrine of the Twin Lamps with its oak hollow approach. Indoor child of region.
 */
import { GRAPHS } from "./lib/ids.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";
import { planMetrics, planPins } from "./lib/layouts.ts";

const SHRINE_MAP = planMetrics("shrine");
const SHRINE_PINS = planPins("shrine");

const NODE_DESCRIPTIONS: Record<string, string> = {
	oak_hollow: "A hollow under an ancient oak where the path to the shrine begins.",
	approach_path: "A stone-edged path from the oak hollow to the shrine doors.",
	narthex: "The narthex, dust on the offering bowls and no attendant in sight.",
	nave: "The nave vaults high, twin lamp windows casting cold light on empty pews.",
	dawn_chapel: "The dawn chapel, its golden lamp dull under a film of ash.",
	dusk_chapel: "The dusk chapel, its silver lamp cracked as if something clawed it.",
	altar:
		"The high altar stands cold; it wakes when the shadows are driven from this shrine — Caddoc's charge.",
	shadow_crypt: "A crypt under the nave where shadows cling thicker than dark.",
};

export function shrine(): GraphSlice {
	return placeGraph("shrine", {
		graph: GRAPHS.shrine,
		substrate: "indoor",
		display_name: "Shrine",
		description:
			"The forest opens on the Shrine of the Twin Lamps — nave, chapels, and a shadowed crypt below.",
		provenance: {
			template: "First-party plan (author/lib/layouts.ts)",
			composition: "Indoor child of region; forest-heart approach on sheet.",
		},
		parent_graph_id: GRAPHS.region,
		metres_per_unit: SHRINE_MAP.grid_distance_m,
		bearing: 0,
		nodes: SHRINE_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(
				p.footprint,
				SHRINE_MAP.grid_distance_m,
				SHRINE_MAP.vertical_half_extent_m,
			),
		})),
		edgeLocals: [
			["oak_hollow", "approach_path"],
			["approach_path", "narthex"],
			["narthex", "nave"],
			["nave", "dawn_chapel"],
			["nave", "dusk_chapel"],
			["nave", "altar"],
			["nave", "shadow_crypt"],
		],
	});
}
