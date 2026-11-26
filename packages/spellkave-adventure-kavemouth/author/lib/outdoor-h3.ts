/**
 * // pattern: none — outdoor H3 spatial indexing for kavemouth region
 *
 * Outdoor H3 + composition for kavemouth.
 *
 * - region: outdoor **root** with real res10/7/4 origin (h3-js, frozen cluster)
 * - outdoor children nest via parent_graph_id + portal cell_anchor
 * - indoor children keep cells 0
 *
 * Cells are decimal **strings** so u64 values above MAX_SAFE_INTEGER survive JS.
 * Generated once via h3-js `latLngToCell(47.5,-122.3,10)` + `gridDisk`; frozen here
 * for check-stable fixtures (do not re-roll).
 */
import { cellToParent } from "h3-js";

/**
 * Graph unit → metres for outdoor world compose.
 * Sheet battlemaps use ~1.5 m/5 ft locally; on the H3 world map we use a larger
 * scale so metric graphs span a readable fraction of res10 hexes (~65–150 m),
 * not a sub-pixel blob at the cell centroid.
 */
export const GRAPH_SCALE_M = 12;

/** Frozen H3 cluster (decimal u64 strings). */
export const H3_CLUSTER = {
	origin10: "622215095455350783",
	origin7: "608704296581595135",
	origin4: "595193501273030655",
	/** k=1 disk: [origin, …6 neighbors] */
	disk1: [
		"622215095455350783",
		"622215095455547391",
		"622215095455416319",
		"622215095455449087",
		"622215095455383551",
		"622215095455514623",
		"622215095455481855",
	],
	/** k=2 disk (index 7+ = outer ring) — destination islands */
	disk2: [
		"622215095455350783",
		"622215095455547391",
		"622215095455416319",
		"622215095455449087",
		"622215095455383551",
		"622215095455514623",
		"622215095455481855",
		"622215095456497663",
		"622215095457087487",
		"622215095456956415",
		"622215095456006143",
		"622215095456038911",
		"622215095456333823",
		"622215095456268287",
		"622215095455678463",
		"622215095455809535",
		"622215095456759807",
		"622215095456727039",
		"622215095456432127",
	],
} as const;

function decToHex(dec: string): string {
	return BigInt(dec).toString(16);
}

function hexToDec(hex: string): string {
	return BigInt(`0x${hex}`).toString();
}

/** res10 decimal → { cell_res10, cell_res7, cell_res4 } decimal strings. */
export function cellFamily(res10Dec: string): {
	cell_res10: string;
	cell_res7: string;
	cell_res4: string;
} {
	const hex = decToHex(res10Dec);
	return {
		cell_res10: res10Dec,
		cell_res7: hexToDec(cellToParent(hex, 7)),
		cell_res4: hexToDec(cellToParent(hex, 4)),
	};
}

/** Region outdoor node → disk cell. */
export const REGION_NODE_CELLS: Record<string, string> = {
	waymeet: H3_CLUSTER.disk1[0]!,
	road_north: H3_CLUSTER.disk1[1]!,
	road_east: H3_CLUSTER.disk1[2]!,
	road_south: H3_CLUSTER.disk1[3]!,
	road_west: H3_CLUSTER.disk1[4]!,
	// Destination stubs (sk-609b.8) — outer disk2 cells.
	road_to_river: H3_CLUSTER.disk2[7]!,
	road_to_warren: H3_CLUSTER.disk2[8]!,
	road_to_forest: H3_CLUSTER.disk2[9]!,
	road_to_swamp: H3_CLUSTER.disk2[10]!,
	road_to_mine: H3_CLUSTER.disk2[11]!,
	road_to_shrine: H3_CLUSTER.disk2[12]!,
	road_to_camp: H3_CLUSTER.disk2[13]!,
};

/**
 * Hamlet outdoor nodes share the nest cell (gate / road_south neighborhood).
 * World placement is composition into region — not per-node hex centers.
 */
const HAMLET_NEST_CELL = H3_CLUSTER.disk1[3]!; // same family as region road_south
export const HAMLET_NODE_CELLS: Record<string, string> = {
	gate: HAMLET_NEST_CELL,
	square: HAMLET_NEST_CELL,
	inn_front: HAMLET_NEST_CELL,
	tomb_hill: HAMLET_NEST_CELL,
	well: HAMLET_NEST_CELL,
	east_houses: HAMLET_NEST_CELL,
	west_sheds: HAMLET_NEST_CELL,
	village_path: HAMLET_NEST_CELL,
	crypt_path: HAMLET_NEST_CELL,
};

function nestAll(cell: string, locals: readonly string[]): Record<string, string> {
	return Object.fromEntries(locals.map((local) => [local, cell]));
}

function requireCell(cell: string | undefined, label: string): string {
	if (cell === undefined) throw new Error(`outdoor-h3: missing cell for ${label}`);
	return cell;
}

export const VILLAGE_NODE_CELLS = nestAll(HAMLET_NEST_CELL, [
	"path_from_hamlet",
	"central_circle",
	"west_platform",
	"north_platform",
	"east_platform",
	"tree_dwellings",
	"green",
]);

export const STONEBRIDGE_NODE_CELLS = nestAll(
	requireCell(REGION_NODE_CELLS.road_to_river, "road_to_river"),
	[
		"south_approach",
		"bridge_south",
		"bridge_mid",
		"bridge_north",
		"north_road",
		"east_bank",
		"west_bank",
	],
);

export const HESPER_LODGE_NODE_CELLS = nestAll(
	requireCell(REGION_NODE_CELLS.road_to_forest, "road_to_forest"),
	["forest_path", "clearing", "porch", "main_room", "hearth", "loft", "woodshed", "tree_line"],
);

export const WAR_CAMP_NODE_CELLS = nestAll(
	requireCell(REGION_NODE_CELLS.road_to_camp, "road_to_camp"),
	["approach", "picket", "tent_row", "cookfire", "worg_pens", "command_tent", "rear_trail"],
);

export const SWAMP_NODE_CELLS = nestAll(
	requireCell(REGION_NODE_CELLS.road_to_swamp, "road_to_swamp"),
	[
		"river_edge",
		"reed_path",
		"frog_pool",
		"will_o_wisp_glade",
		"hag_hut",
		"bone_garden",
		"backwater",
	],
);
