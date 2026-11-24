/**
 * // pattern: bundle-movement-default
 *
 * Shrine of Sun and Moon — map 235 + forest heart approach. Indoor child of region.
 */
import { GRAPHS } from "./lib/ids.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";
import { SHRINE_MAP, SHRINE_PINS } from "./lib/shrine-alignment.ts";

const NODE_DESCRIPTIONS: Record<string, string> = {
	forest_heart: "A heart-clearing of ancient trees where the path to the shrine begins.",
	approach_path: "A stone-edged path from the forest heart to the shrine doors.",
	narthex: "The narthex, dust on the offering bowls and no attendant in sight.",
	nave: "The nave vaults high, sun-and-moon windows casting cold light on empty pews.",
	sun_apse: "The sun apse, its golden disc dull under a film of ash.",
	moon_apse: "The moon apse, silver inlay cracked as if something clawed it.",
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
			"The forest opens on the Shrine of the Sun and Moon — nave, apses, and a shadowed crypt below.",
		provenance: {
			template: "Elven Tower maps 235 + 24",
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
			["forest_heart", "approach_path"],
			["approach_path", "narthex"],
			["narthex", "nave"],
			["nave", "sun_apse"],
			["nave", "moon_apse"],
			["nave", "altar"],
			["nave", "shadow_crypt"],
		],
	});
}
