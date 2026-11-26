/**
 * // pattern: bundle-movement-default
 *
 * Indoor tomb.
 * Composition child of hamlet; cells stay 0.
 */
import { GRAPHS, nodeId } from "./lib/ids.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";
import { planMetrics, planPins } from "./lib/layouts.ts";

const TOMB_MAP = planMetrics("tomb");
const TOMB_PINS = planPins("tomb");

/** `pool-hazard.ts`'s attachment target — exported so that file never
 * hand-reconstructs the id. */
export const POOL_NODE_ID = nodeId(GRAPHS.tomb, "pool");

// T5 build-out follow-up (2026-08-04) — see inn.ts's own comment on this map.
const NODE_DESCRIPTIONS: Record<string, string> = {
	entrance:
		"Twisted roots frame a dark opening in the hillside, a glistening trail leading inward across the threshold.",
	antechamber:
		"A cramped antechamber where old stone stairs give way to bare rock, the air already thick with damp.",
	hall: "The sarcophagus hall opens wide and dim, stone lids cracked and shoved askew, the standing-water smell strongest here. A side door bears a warden's seal no living hand can break; killing a warden will not open it.",
	shrine:
		"A small shrine niche cut into the hall's far wall, its carved figure worn featureless by centuries of damp. The wooden chest here has warped shut with damp; no key or spell will open it, and nothing rattles inside.",
	sealed_vault:
		"A sealed stone vault off the sarcophagus hall — the door is shut and will not yield.",
	crypt:
		"The lower crypt sits below the hall, its walls slick and close, littered with the debris of long-collapsed niches. An Ironfold ward-key socket seals the stair to the deep tomb; using its key consumes the key and opens the way for your party. Scratched beside it: the Ironfold key lies with Durgan in the old mine, by the Upland Road and the North Pass.",
	pool: "A stagnant pool fills the crypt's lowest point, its surface rippling faintly with something unseen beneath.",
};

export function tomb(): GraphSlice {
	return placeGraph("tomb", {
		graph: GRAPHS.tomb,
		substrate: "indoor",
		display_name: "Tomb",
		description:
			"A tomb cut into the hillside above the hamlet — old stone stairs down into a dark that smells of standing water and worse.",
		provenance: {
			template: "First-party plan (author/lib/layouts.ts)",
			composition: "Indoor child of hamlet (composition).",
		},
		parent_graph_id: GRAPHS.hamlet,
		// pos_x/pos_y (TOMB_PINS) are backdrop-cell indices, not metres —
		// metres_per_unit MUST equal the metres-per-cell this graph's own
		// map_layer declares (TOMB_MAP.grid_distance_m, attached by
		// backdrops.ts) or every metric range/movement reader downstream
		// computes the wrong distance (sk-j1a).
		metres_per_unit: TOMB_MAP.grid_distance_m,
		bearing: 0,
		nodes: TOMB_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(p.footprint, TOMB_MAP.grid_distance_m, TOMB_MAP.vertical_half_extent_m),
		})),
		edgeLocals: [
			["entrance", "antechamber"],
			["antechamber", "hall"],
			["hall", "shrine"],
			["hall", "sealed_vault"],
			["hall", "crypt"],
			["crypt", "pool"],
			["pool", "antechamber"],
		],
	});
}
