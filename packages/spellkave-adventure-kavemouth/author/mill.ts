/**
 * // pattern: bundle-movement-default
 *
 * Mill and the cult tunnels under it. Indoor child of stonebridge.
 */
import { GRAPHS } from "./lib/ids.ts";
import { planMetrics, planPins } from "./lib/layouts.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";

const MILL_MAP = planMetrics("mill");
const MILL_PINS = planPins("mill");

const NODE_DESCRIPTIONS: Record<string, string> = {
	yard: "A wind-scoured yard between the mill and the miller's house, cart ruts filled with rainwater.",
	grinding_floor: "The grinding floor — millstones still, gear teeth silent, flour dust long settled.",
	sail_loft: "The sail loft, vanes creaking overhead though no grain turns.",
	millers_house: "The miller's shuttered house, table and benches shoved aside as if left in a hurry.",
	watch_nook: "A dug-in nook where a lookout can watch the tunnel mouth under the mill.",
	tunnels: "Rough-hewn cult tunnels smelling of lamp oil and old blood.",
	fork: "A forked passage where the tunnels split three ways, boot-scuffed by long watches.",
	binding_chamber: "A low chamber with wall chains and a stained floor, where the cult binds its captives.",
	grain_cellar: "The old grain cellar, sacks and oil jars stacked against damp stone.",
	altar: "An altar heaped with chaff and ash, raised to something the valley's gods never named.",
	long_vault: "A long vault running downhill into the dark, its floor worn by many feet.",
	hidden_larder: "A cramped larder hidden behind a false wall of sacks.",
};

export function mill(): GraphSlice {
	return placeGraph("mill", {
		graph: GRAPHS.mill,
		substrate: "indoor",
		display_name: "Mill",
		description:
			"An abandoned mill and its miller's house whose cellars open into cult tunnels beneath the hill.",
		provenance: {
			template: "First-party plan (author/lib/layouts.ts)",
			composition: "Indoor child of stonebridge (composition).",
		},
		parent_graph_id: GRAPHS.stonebridge,
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
			["yard", "grinding_floor"],
			["grinding_floor", "sail_loft"],
			["yard", "millers_house"],
			["yard", "watch_nook"],
			["watch_nook", "tunnels"],
			["tunnels", "fork"],
			["fork", "binding_chamber"],
			["fork", "grain_cellar"],
			["grain_cellar", "altar"],
			["fork", "long_vault"],
			["long_vault", "hidden_larder"],
			["altar", "long_vault"],
		],
	});
}
