/**
 * // pattern: none — map backdrop image metadata
 *
 * Map layers + terrain (attach_map_layer + annotate_place).
 * Every storyline graph carries alignment metrics (map-from-image).
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { CURSED_CRYPT_MAP } from "./lib/cursed-crypt-alignment.ts";
import { DEEP_TOMB_MAP } from "./lib/deep-tomb-alignment.ts";
import { FOREST_LODGE_MAP } from "./lib/forest-lodge-alignment.ts";
import { GOBLIN_WARREN_MAP } from "./lib/goblin-warren-alignment.ts";
import { HAMLET_MAP } from "./lib/hamlet-alignment.ts";
import { HOBGOBLIN_CAMP_MAP } from "./lib/hobgoblin-camp-alignment.ts";
import { ATTRIBUTION, BUNDLE, GRAPHS, MAPS } from "./lib/ids.ts";
import { INN_MAP } from "./lib/inn-alignment.ts";
import { MILL_MAP } from "./lib/mill-alignment.ts";
import { MINE_MAP } from "./lib/mine-alignment.ts";
import { REGION_MAP } from "./lib/region-alignment.ts";
import { RIVER_CROSSING_MAP } from "./lib/river-crossing-alignment.ts";
import { SHRINE_MAP } from "./lib/shrine-alignment.ts";
import { SWAMP_MAP } from "./lib/swamp-alignment.ts";
import { TOMB_MAP } from "./lib/tomb-alignment.ts";
import { VILLAGE_MAP } from "./lib/village-alignment.ts";
import { WELL_MAP } from "./lib/well-alignment.ts";

type Metrics = {
	grid_size_px: number;
	grid_distance_m: number;
	image_width_px: number;
	image_height_px: number;
	local_width_cells: number;
	local_height_cells: number;
	image_origin_x: number;
	image_origin_y: number;
	state: string;
};

function metricsFrom(m: {
	grid_size_px: number;
	grid_distance_m: number;
	image_width_px: number;
	image_height_px: number;
	local_width_cells: number;
	local_height_cells: number;
	image_origin_x: number;
	image_origin_y: number;
}): Metrics {
	return {
		grid_size_px: Math.round(m.grid_size_px),
		grid_distance_m: m.grid_distance_m,
		image_width_px: Math.round(m.image_width_px),
		image_height_px: Math.round(m.image_height_px),
		local_width_cells: m.local_width_cells,
		local_height_cells: m.local_height_cells,
		image_origin_x: m.image_origin_x,
		image_origin_y: m.image_origin_y,
		state: "aligned",
	};
}

const collectionRelease = new Map([
	["306", "https://www.patreon.com/elventower/posts/creative-common-155538823"],
	["319", "https://www.patreon.com/elventower/posts/creative-commons-163617102"],
]);

export function backdrops(): VerbCall[] {
	const specs: Array<{
		key: string;
		graph: string;
		map: { id: string; title: string; file: string };
		terrain: string[];
		metrics: Metrics;
	}> = [
		{
			key: "region",
			graph: GRAPHS.region,
			map: MAPS.region,
			terrain: ["road", "crossroads", "wilderness"],
			metrics: metricsFrom(REGION_MAP),
		},
		{
			key: "hamlet",
			graph: GRAPHS.hamlet,
			map: MAPS.hamlet,
			terrain: ["settlement", "palisade", "building_pad"],
			metrics: metricsFrom(HAMLET_MAP),
		},
		{
			key: "inn",
			graph: GRAPHS.inn,
			map: MAPS.inn,
			terrain: ["building", "stairs", "indoor"],
			metrics: metricsFrom(INN_MAP),
		},
		{
			key: "tomb",
			graph: GRAPHS.tomb,
			map: MAPS.tomb,
			terrain: ["dungeon", "hazard_slime", "crypt"],
			metrics: metricsFrom(TOMB_MAP),
		},
		{
			key: "village",
			graph: GRAPHS.village,
			map: MAPS.village,
			terrain: ["settlement", "elven", "tree_dwelling"],
			metrics: metricsFrom(VILLAGE_MAP),
		},
		{
			key: "river_crossing",
			graph: GRAPHS.river_crossing,
			map: MAPS.river_crossing,
			terrain: ["road", "bridge", "river"],
			metrics: metricsFrom(RIVER_CROSSING_MAP),
		},
		{
			key: "mill",
			graph: GRAPHS.mill,
			map: MAPS.mill,
			terrain: ["building", "dungeon", "cult"],
			metrics: metricsFrom(MILL_MAP),
		},
		{
			key: "well",
			graph: GRAPHS.well,
			map: MAPS.well,
			terrain: ["dungeon", "well", "nest"],
			metrics: metricsFrom(WELL_MAP),
		},
		{
			key: "goblin_warren",
			graph: GRAPHS.goblin_warren,
			map: MAPS.goblin_warren,
			terrain: ["dungeon", "goblin", "lair"],
			metrics: metricsFrom(GOBLIN_WARREN_MAP),
		},
		{
			key: "forest_lodge",
			graph: GRAPHS.forest_lodge,
			map: MAPS.forest_lodge,
			terrain: ["forest", "building", "clearing"],
			metrics: metricsFrom(FOREST_LODGE_MAP),
		},
		{
			key: "hobgoblin_camp",
			graph: GRAPHS.hobgoblin_camp,
			map: MAPS.hobgoblin_camp,
			terrain: ["camp", "road", "military"],
			metrics: metricsFrom(HOBGOBLIN_CAMP_MAP),
		},
		{
			key: "swamp",
			graph: GRAPHS.swamp,
			map: MAPS.swamp,
			terrain: ["swamp", "hag", "wetland"],
			metrics: metricsFrom(SWAMP_MAP),
		},
		{
			key: "mine",
			graph: GRAPHS.mine,
			map: MAPS.mine,
			terrain: ["dungeon", "mine", "undead"],
			metrics: metricsFrom(MINE_MAP),
		},
		{
			key: "shrine",
			graph: GRAPHS.shrine,
			map: MAPS.shrine,
			terrain: ["temple", "forest", "holy"],
			metrics: metricsFrom(SHRINE_MAP),
		},
		{
			key: "cursed_crypt",
			graph: GRAPHS.cursed_crypt,
			map: MAPS.cursed_crypt,
			terrain: ["dungeon", "crypt", "undead"],
			metrics: metricsFrom(CURSED_CRYPT_MAP),
		},
		{
			key: "deep_tomb",
			graph: GRAPHS.deep_tomb,
			map: MAPS.deep_tomb,
			terrain: ["dungeon", "crypt", "finale"],
			metrics: metricsFrom(DEEP_TOMB_MAP),
		},
	];

	const calls: VerbCall[] = [];

	for (const s of specs) {
		calls.push({
			toolName: "spellkave_attach_map_layer",
			label: `attach-map-${s.key}`,
			params: {
				bundle: BUNDLE,
				place_graph_id: s.graph,
				asset_module: "ccc3-maps",
				asset_path: `maps/${s.map.file}`,
				display_name: s.map.title,
				map_id: s.map.id,
				map_layer_id: `${s.graph}/elven_tower_backdrop`,
				posture: "cc-by-4.0",
				source_kind: "elven-tower-ccc",
				// false: core already registers provenance.source; re-registering
				// it from this proof bundle fails live apply (MF-APPLY-020).
				provenance: false,
				license_url: ATTRIBUTION.licenseUrl,
				source_url: collectionRelease.get(s.map.id) ?? ATTRIBUTION.postUrl,
				...s.metrics,
			},
		});
	}

	return calls;
}
