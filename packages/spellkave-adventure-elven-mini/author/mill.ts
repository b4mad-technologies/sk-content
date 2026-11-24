/**
 * // pattern: bundle-movement-default
 *
 * Mill / Windmill Cult — map 131. Indoor child of river_crossing.
 */
import { GRAPHS } from "./lib/ids.ts";
import { MILL_MAP, MILL_PINS } from "./lib/mill-alignment.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";

const NODE_DESCRIPTIONS: Record<string, string> = {
	yard: "A wind-scoured yard between the mill and the roadside inn, cart ruts filled with rainwater.",
	windmill_lv1: "The windmill's ground floor — gear teeth silent, flour dust long settled.",
	windmill_lv2: "The upper mill chamber, vanes creaking overhead though no grain turns.",
	inn_building: "A shuttered roadside inn, tables shoved aside as if left in a hurry.",
	sentry_post: "A dug-in sentry niche overlooking the tunnel mouth under the mill.",
	tunnels: "Rough-hewn cult tunnels smelling of lamp oil and old blood.",
	intersection: "A four-way intersection where tunnel sentries once stood watch.",
	sacrifice_room: "A low chamber with chains and a stained floor — the sacrifice room.",
	storage: "Crates and oil jars stacked against damp stone.",
	altar: "A carved altar to something older than the valley's gods.",
	gallery: "A grand gallery sloping down toward a sunken pass.",
	secret_storage: "A cramped secret store behind a false wall of crates.",
};

export function mill(): GraphSlice {
	return placeGraph("mill", {
		graph: GRAPHS.mill,
		substrate: "indoor",
		display_name: "Mill",
		description:
			"An abandoned windmill and roadside inn whose cellars open into cult tunnels beneath the hill.",
		provenance: {
			template: "Elven Tower map 131",
			composition: "Indoor child of river_crossing (composition).",
		},
		parent_graph_id: GRAPHS.river_crossing,
		metres_per_unit: MILL_MAP.grid_distance_m,
		bearing: 0,
		nodes: MILL_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(p.footprint, MILL_MAP.grid_distance_m, MILL_MAP.vertical_half_extent_m),
		})),
		edgeLocals: [
			["yard", "windmill_lv1"],
			["windmill_lv1", "windmill_lv2"],
			["yard", "inn_building"],
			["yard", "sentry_post"],
			["sentry_post", "tunnels"],
			["tunnels", "intersection"],
			["intersection", "sacrifice_room"],
			["intersection", "storage"],
			["storage", "altar"],
			["intersection", "gallery"],
			["gallery", "secret_storage"],
			["altar", "gallery"],
		],
	});
}
