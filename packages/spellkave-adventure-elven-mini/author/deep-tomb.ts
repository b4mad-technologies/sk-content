/**
 * // pattern: bundle-movement-default
 *
 * Deep tomb — map 60. Indoor child of tomb (finale level).
 */

import { DEEP_TOMB_MAP, DEEP_TOMB_PINS } from "./lib/deep-tomb-alignment.ts";
import { GRAPHS } from "./lib/ids.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";

const NODE_DESCRIPTIONS: Record<string, string> = {
	stair_from_tomb: "Stone stairs spiral down from the upper tomb into colder dark.",
	warden_gate: "A gate-chamber where the Crypt Warden's kin once barred the way deeper.",
	zombie_hall: "A long hall of shambling dead, sarcophagi cracked open in rows.",
	ogre_alcove: "An alcove wide enough for an ogre zombie to wait in ambush.",
	processional: "A processional corridor lined with dead lanterns leading to the court.",
	steward_court: "The Pale Steward's court — a throne of bone under a vault of roots.",
	wight_niche_a: "A wall niche where a wight stands guard on the court's left.",
	wight_niche_b: "A matching niche on the court's right, cold light in dead eyes.",
};

export function deep_tomb(): GraphSlice {
	return placeGraph("deep_tomb", {
		graph: GRAPHS.deep_tomb,
		substrate: "indoor",
		display_name: "Deep Tomb",
		description: "The level below the infested tomb — a processional to the Pale Steward's court.",
		provenance: {
			template: "Elven Tower map 60",
			composition: "Indoor child of tomb (level below 251).",
		},
		parent_graph_id: GRAPHS.tomb,
		metres_per_unit: DEEP_TOMB_MAP.grid_distance_m,
		bearing: 0,
		nodes: DEEP_TOMB_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(
				p.footprint,
				DEEP_TOMB_MAP.grid_distance_m,
				DEEP_TOMB_MAP.vertical_half_extent_m,
			),
		})),
		edgeLocals: [
			["stair_from_tomb", "warden_gate"],
			["warden_gate", "zombie_hall"],
			["zombie_hall", "ogre_alcove"],
			["zombie_hall", "processional"],
			["processional", "steward_court"],
			["steward_court", "wight_niche_a"],
			["steward_court", "wight_niche_b"],
		],
	});
}
