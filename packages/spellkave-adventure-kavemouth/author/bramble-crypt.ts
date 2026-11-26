/**
 * // pattern: bundle-movement-default
 *
 * Bramble crypt. Indoor child of hamlet (hill road).
 */

import { planMetrics, planPins } from "./lib/layouts.ts";
import { GRAPHS } from "./lib/ids.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";

const BRAMBLE_CRYPT_MAP = planMetrics("bramble_crypt");
const BRAMBLE_CRYPT_PINS = planPins("bramble_crypt");

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

export function bramble_crypt(): GraphSlice {
	return placeGraph("bramble_crypt", {
		graph: GRAPHS.bramble_crypt,
		substrate: "indoor",
		display_name: "Bramble Crypt",
		description:
			"A bramble-choked crypt on the hill road near the elven tomb — bone halls and a false grave.",
		provenance: {
			template: "First-party plan (author/lib/layouts.ts)",
			composition: "Indoor child of hamlet near the tomb hill.",
		},
		parent_graph_id: GRAPHS.hamlet,
		metres_per_unit: BRAMBLE_CRYPT_MAP.grid_distance_m,
		bearing: 0,
		nodes: BRAMBLE_CRYPT_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(
				p.footprint,
				BRAMBLE_CRYPT_MAP.grid_distance_m,
				BRAMBLE_CRYPT_MAP.vertical_half_extent_m,
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
