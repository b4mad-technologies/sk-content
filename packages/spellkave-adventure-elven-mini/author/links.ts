/**
 * // pattern: bundle-movement-default
 *
 * Cross-graph portals (substrate_crossing where outdoor↔indoor).
 * Real H3 cell_anchor on crossings (verb-native).
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { GRAPHS, nodeId } from "./lib/ids.ts";
import {
	HAMLET_NODE_CELLS,
	REGION_NODE_CELLS,
	RIVER_CROSSING_NODE_CELLS,
} from "./lib/outdoor-h3.ts";
import { linkPortal } from "./lib/place.ts";

export function links(): VerbCall[] {
	return [
		// Existing four-graph spine.
		linkPortal(
			"link-region-hamlet",
			nodeId(GRAPHS.region, "road_south"),
			nodeId(GRAPHS.hamlet, "gate"),
			{
				substrate_crossing: false,
				cell_anchor: REGION_NODE_CELLS.road_south,
			},
		),
		linkPortal("link-hamlet-inn", nodeId(GRAPHS.hamlet, "inn_front"), nodeId(GRAPHS.inn, "foyer"), {
			substrate_crossing: true,
			cell_anchor: HAMLET_NODE_CELLS.inn_front,
		}),
		linkPortal(
			"link-hamlet-tomb",
			nodeId(GRAPHS.hamlet, "tomb_hill"),
			nodeId(GRAPHS.tomb, "entrance"),
			{
				substrate_crossing: true,
				cell_anchor: HAMLET_NODE_CELLS.tomb_hill,
			},
		),
		// sk-609b.8 — storyline §3 portals.
		linkPortal(
			"link-hamlet-village",
			nodeId(GRAPHS.hamlet, "village_path"),
			nodeId(GRAPHS.village, "path_from_hamlet"),
			{
				substrate_crossing: false,
				cell_anchor: HAMLET_NODE_CELLS.village_path,
			},
		),
		linkPortal(
			"link-region-river",
			nodeId(GRAPHS.region, "road_to_river"),
			nodeId(GRAPHS.river_crossing, "south_approach"),
			{
				substrate_crossing: false,
				cell_anchor: REGION_NODE_CELLS.road_to_river,
			},
		),
		linkPortal(
			"link-river-mill",
			nodeId(GRAPHS.river_crossing, "north_road"),
			nodeId(GRAPHS.mill, "yard"),
			{
				substrate_crossing: true,
				cell_anchor: RIVER_CROSSING_NODE_CELLS.north_road,
			},
		),
		linkPortal("link-hamlet-well", nodeId(GRAPHS.hamlet, "well"), nodeId(GRAPHS.well, "mouth"), {
			substrate_crossing: true,
			cell_anchor: HAMLET_NODE_CELLS.well,
		}),
		linkPortal(
			"link-region-warren",
			nodeId(GRAPHS.region, "road_to_warren"),
			nodeId(GRAPHS.goblin_warren, "entrance"),
			{
				substrate_crossing: true,
				cell_anchor: REGION_NODE_CELLS.road_to_warren,
			},
		),
		linkPortal(
			"link-region-lodge",
			nodeId(GRAPHS.region, "road_to_forest"),
			nodeId(GRAPHS.forest_lodge, "forest_path"),
			{
				substrate_crossing: false,
				cell_anchor: REGION_NODE_CELLS.road_to_forest,
			},
		),
		linkPortal(
			"link-region-camp",
			nodeId(GRAPHS.region, "road_to_camp"),
			nodeId(GRAPHS.hobgoblin_camp, "approach"),
			{
				substrate_crossing: false,
				cell_anchor: REGION_NODE_CELLS.road_to_camp,
			},
		),
		linkPortal(
			"link-region-swamp",
			nodeId(GRAPHS.region, "road_to_swamp"),
			nodeId(GRAPHS.swamp, "river_edge"),
			{
				substrate_crossing: false,
				cell_anchor: REGION_NODE_CELLS.road_to_swamp,
			},
		),
		linkPortal(
			"link-region-mine",
			nodeId(GRAPHS.region, "road_to_mine"),
			nodeId(GRAPHS.mine, "adit"),
			{
				substrate_crossing: true,
				cell_anchor: REGION_NODE_CELLS.road_to_mine,
			},
		),
		linkPortal(
			"link-hamlet-cursed-crypt",
			nodeId(GRAPHS.hamlet, "crypt_path"),
			nodeId(GRAPHS.cursed_crypt, "entrance"),
			{
				substrate_crossing: true,
				cell_anchor: HAMLET_NODE_CELLS.crypt_path,
			},
		),
		linkPortal(
			"link-tomb-deep",
			nodeId(GRAPHS.tomb, "crypt"),
			nodeId(GRAPHS.deep_tomb, "stair_from_tomb"),
			{
				substrate_crossing: false,
			},
		),
		linkPortal(
			"link-region-shrine",
			nodeId(GRAPHS.region, "road_to_shrine"),
			nodeId(GRAPHS.shrine, "forest_heart"),
			{
				substrate_crossing: true,
				cell_anchor: REGION_NODE_CELLS.road_to_shrine,
			},
		),
	];
}
