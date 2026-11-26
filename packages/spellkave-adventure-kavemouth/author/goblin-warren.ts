/**
 * // pattern: bundle-movement-default
 *
 * Goblin warren. Indoor child of region.
 */

import { planMetrics, planPins } from "./lib/layouts.ts";
import { GRAPHS } from "./lib/ids.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";

const GOBLIN_WARREN_MAP = planMetrics("goblin_warren");
const GOBLIN_WARREN_PINS = planPins("goblin_warren");

const NODE_DESCRIPTIONS: Record<string, string> = {
	entrance: "A low cave mouth stinking of goblin and wet dog, scrap-wood stakes framing the dark.",
	guard_post: "A cramped guard niche with a gong and a pile of javelins.",
	common_den: "The common den — sleeping piles, cook-smoke, and too many eyes.",
	trap_niche_a: "A side niche where tripwires glitter faintly in the dark.",
	trap_niche_b: "Another trap niche opposite the first, staked and waiting.",
	tunnel_join: "A sloping tunnel joining the lair to the chief's halls.",
	chief_anteroom: "An anteroom hung with stolen banners before the chief's hall.",
	chief_hall: "Grubnash's hall — a throne of crates and a fire that never quite goes out.",
	loot_cache: "A loot cache of dented coin and cracked pottery.",
};

export function goblin_warren(): GraphSlice {
	return placeGraph("goblin_warren", {
		graph: GRAPHS.goblin_warren,
		substrate: "indoor",
		display_name: "Goblin Warren",
		description:
			"A goblin lair in the hills, joined by a tunnel to the chief's hideout deeper in the rock.",
		provenance: {
			template: "First-party plan (author/lib/layouts.ts)",
			composition: "Indoor child of region; two sheets joined.",
		},
		parent_graph_id: GRAPHS.region,
		metres_per_unit: GOBLIN_WARREN_MAP.grid_distance_m,
		bearing: 0,
		nodes: GOBLIN_WARREN_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(
				p.footprint,
				GOBLIN_WARREN_MAP.grid_distance_m,
				GOBLIN_WARREN_MAP.vertical_half_extent_m,
			),
		})),
		edgeLocals: [
			["entrance", "guard_post"],
			["guard_post", "common_den"],
			["common_den", "trap_niche_a"],
			["common_den", "trap_niche_b"],
			["common_den", "tunnel_join"],
			["tunnel_join", "chief_anteroom"],
			["chief_anteroom", "chief_hall"],
			["chief_hall", "loot_cache"],
		],
	});
}
