/**
 * // pattern: bundle-movement-default
 *
 * Cursed crypt — map 46. Indoor child of hamlet (hill road).
 */

import { CURSED_CRYPT_MAP, CURSED_CRYPT_PINS } from "./lib/cursed-crypt-alignment.ts";
import { GRAPHS } from "./lib/ids.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";

const NODE_DESCRIPTIONS: Record<string, string> = {
	entrance:
		"A low stone lintel half-buried in hillside scrub marks the crypt entrance. Someone has scratched across it: LOOTED, NOTHING LEFT. The barrow folk speak of is the root-framed opening at the top of Tomb Hill.",
	vestibule: "A vestibule of cracked tiles, offerings long since looted.",
	bone_hall: "A hall of stacked bone and broken urns, the air dry as dust.",
	side_chapel: "A side chapel with a defaced mural of mourning figures.",
	ossuary: "An ossuary chamber where the walls are built of skull and femur.",
	false_tomb: "A false tomb slab that scrapes when lifted — a decoy.",
	true_crypt: "The true crypt below the false tomb, colder and unquiet.",
};

export function cursed_crypt(): GraphSlice {
	return placeGraph("cursed_crypt", {
		graph: GRAPHS.cursed_crypt,
		substrate: "indoor",
		display_name: "Cursed Crypt",
		description:
			"A cursed crypt on the hill road near the elven tomb — bone halls and a false grave.",
		provenance: {
			template: "Elven Tower map 46",
			composition: "Indoor child of hamlet near the tomb hill.",
		},
		parent_graph_id: GRAPHS.hamlet,
		metres_per_unit: CURSED_CRYPT_MAP.grid_distance_m,
		bearing: 0,
		nodes: CURSED_CRYPT_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(
				p.footprint,
				CURSED_CRYPT_MAP.grid_distance_m,
				CURSED_CRYPT_MAP.vertical_half_extent_m,
			),
		})),
		edgeLocals: [
			["entrance", "vestibule"],
			["vestibule", "bone_hall"],
			["bone_hall", "side_chapel"],
			["bone_hall", "ossuary"],
			["ossuary", "false_tomb"],
			["false_tomb", "true_crypt"],
		],
	});
}
