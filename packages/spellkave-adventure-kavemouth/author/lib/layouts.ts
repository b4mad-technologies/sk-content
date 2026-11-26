/**
 * // pattern: none — first-party floor plans for the Kavemouth place graphs
 *
 * Every place is drawn here on its own 5 ft grid, from its room list and
 * connections alone. A room is a rectangle `[x, y, w, h]` in cells, with
 * x to the east and y to the south from the sheet's top-left corner. A
 * node's position is its rectangle's centre and its extent is the
 * rectangle. Storeys of one building sit side by side on the same sheet
 * and carry their own elevation.
 *
 * The backdrop images are generated to fit these plans, at
 * `PLAN_CELL_PX` pixels per cell, so the map metrics below describe the
 * image without measuring it.
 */
import { GRID_DISTANCE_M, type MapMetrics, type Pin, STOREY_HALF_EXTENT_M } from "./map-metrics.ts";

/** Pixels per 5 ft cell in the generated backdrops. */
export const PLAN_CELL_PX = 16;

type Rect = readonly [x: number, y: number, w: number, h: number];

type Room = {
	local: string;
	name: string;
	rect: Rect;
	/** Metres above the sheet's ground level; absent outdoors. */
	elevation?: number;
	/** Round rooms and clearings; the default is a rectangle. */
	round?: true;
};

type Plan = {
	cols: number;
	rows: number;
	/** Half the height of one storey; keeps stacked storeys disjoint. */
	vertical_half_extent_m?: number;
	rooms: readonly Room[];
};

function room(local: string, name: string, rect: Rect, elevation?: number, round?: true): Room {
	return {
		local,
		name,
		rect,
		...(elevation !== undefined ? { elevation } : {}),
		...(round ? { round } : {}),
	};
}

export const PLANS = {
	region: {
		cols: 25,
		rows: 25,
		rooms: [
			room("waymeet", "Waymeet", [9, 12, 5, 5], undefined, true),
			room("road_north", "Upland Road", [10, 3, 3, 9]),
			room("road_east", "East Road", [14, 13, 9, 3]),
			room("road_south", "Hamlet Road", [10, 17, 3, 7]),
			room("road_west", "West Road", [1, 13, 8, 3]),
		],
	},
	hamlet: {
		cols: 24,
		rows: 24,
		rooms: [
			room("gate", "Hamlet Gate", [10, 20, 4, 4]),
			room("square", "Village Square", [8, 10, 8, 8]),
			room("inn_front", "Inn Front", [2, 8, 6, 6]),
			room("well", "Well", [10, 5, 4, 5], undefined, true),
			room("east_houses", "East Houses", [16, 9, 6, 7]),
			room("west_sheds", "West Sheds", [2, 15, 6, 6]),
			room("tomb_hill", "Tomb Hill", [16, 17, 6, 5]),
			room("village_path", "Path to the Bough Village", [18, 3, 4, 6]),
			room("crypt_path", "Path to the Bramble Crypt", [19, 22, 4, 2]),
		],
	},
	inn: {
		cols: 24,
		rows: 16,
		vertical_half_extent_m: 1.4,
		rooms: [
			room("foyer", "Foyer", [1, 9, 4, 4], 0),
			room("common_room", "Common Room", [5, 6, 8, 7], 0),
			room("bar", "Bar", [5, 2, 8, 4], 0),
			room("stairs", "Stairs", [1, 5, 4, 4], 0),
			room("loft", "Guest Loft", [15, 1, 8, 6], 3),
			room("cellar", "Cellar", [15, 9, 8, 6], -3),
		],
	},
	tomb: {
		cols: 24,
		rows: 18,
		rooms: [
			room("entrance", "Tomb Entrance", [1, 7, 3, 3], 0),
			room("antechamber", "Antechamber", [4, 6, 5, 5], 0),
			room("hall", "Sarcophagus Hall", [9, 5, 7, 7], 0),
			room("shrine", "Shrine", [10, 1, 5, 4], 0),
			room("sealed_vault", "Sealed Vault", [16, 6, 4, 5], 0),
			room("crypt", "Lower Crypt", [10, 12, 6, 5], 0),
			room("pool", "Slime Pool", [4, 11, 6, 6], 0, true),
		],
	},
	village: {
		cols: 24,
		rows: 24,
		rooms: [
			room("path_from_hamlet", "Path from Hamlet", [10, 17, 4, 6]),
			room("central_circle", "Central Circle", [8, 8, 8, 8], undefined, true),
			room("west_platform", "West Platform", [1, 9, 5, 6], undefined, true),
			room("north_platform", "North Platforms", [9, 1, 6, 5], undefined, true),
			room("east_platform", "East Platform", [17, 3, 6, 5], undefined, true),
			room("tree_dwellings", "Tree Dwellings", [18, 9, 5, 7]),
			room("green", "Moonpetal Green", [17, 17, 6, 6], undefined, true),
		],
	},
	stonebridge: {
		cols: 20,
		rows: 24,
		rooms: [
			room("south_approach", "South Approach", [8, 19, 4, 5]),
			room("bridge_south", "Bridge South End", [8, 15, 4, 4]),
			room("bridge_mid", "Bridge Midspan", [8, 10, 4, 5]),
			room("bridge_north", "Bridge North End", [8, 6, 4, 4]),
			room("north_road", "North Road to Mill", [8, 0, 4, 6]),
			room("east_bank", "East Bank Path", [13, 9, 6, 6]),
			room("west_bank", "West Bank Path", [1, 9, 6, 6]),
		],
	},
	mill: {
		cols: 25,
		rows: 25,
		rooms: [
			room("yard", "Mill Yard", [7, 6, 6, 6], 0),
			room("grinding_floor", "Grinding Floor", [1, 6, 6, 6], 0, true),
			room("sail_loft", "Sail Loft", [1, 1, 5, 4], 3, true),
			room("millers_house", "Miller's House", [7, 1, 6, 5], 0),
			room("watch_nook", "Watch Nook", [13, 7, 3, 4], -1),
			room("tunnels", "Cult Tunnels", [16, 7, 4, 4], -2),
			room("fork", "Forked Passage", [16, 11, 5, 5], -2),
			room("binding_chamber", "Binding Chamber", [10, 14, 6, 6], -3),
			room("grain_cellar", "Grain Cellar", [21, 8, 4, 6], -2),
			room("altar", "Chaff Altar", [20, 3, 5, 5], -2),
			room("long_vault", "Long Vault", [17, 16, 7, 5], -3),
			room("hidden_larder", "Hidden Larder", [19, 21, 5, 4], -3),
		],
	},
	well: {
		cols: 20,
		rows: 24,
		rooms: [
			room("mouth", "Well Mouth", [6, 1, 5, 4], 0, true),
			room("upper_shaft", "Upper Shaft", [7, 6, 3, 4], -1, true),
			room("landing", "Mid Landing", [6, 11, 5, 5], -2),
			room("side_niche", "Side Niche", [12, 11, 4, 4], -2),
			room("depth_hall", "Depth Hall", [6, 17, 8, 5], -3),
			room("wererat_nest", "Wererat Nest", [15, 17, 5, 6], -3),
			room("ooze_pool", "Ooze Pool", [0, 18, 5, 6], -3, true),
		],
	},
	goblin_warren: {
		cols: 25,
		rows: 20,
		rooms: [
			room("entrance", "Warren Mouth", [0, 8, 3, 4], 0),
			room("guard_post", "Guard Post", [3, 7, 4, 5], 0),
			room("common_den", "Common Den", [7, 5, 7, 8], 0, true),
			room("trap_niche_a", "Trap Niche A", [8, 1, 4, 4], 0),
			room("trap_niche_b", "Trap Niche B", [8, 13, 4, 4], 0),
			room("tunnel_join", "Tunnel to Chief", [14, 8, 4, 3], 0),
			room("chief_anteroom", "Chief Anteroom", [18, 7, 3, 5], 0),
			room("chief_hall", "Grubnash's Hall", [18, 12, 7, 7], 0),
			room("loot_cache", "Loot Cache", [13, 14, 5, 5], 0),
		],
	},
	hesper_lodge: {
		cols: 24,
		rows: 22,
		rooms: [
			room("forest_path", "Forest Path", [10, 18, 4, 4], 0),
			room("clearing", "Lodge Clearing", [7, 9, 10, 9], 0, true),
			room("porch", "Lodge Porch", [9, 6, 6, 3], 0),
			room("main_room", "Main Room", [8, 1, 8, 5], 0),
			room("hearth", "Hearth", [16, 1, 4, 5], 0),
			room("loft", "Sleeping Loft", [19, 7, 5, 5], 3),
			room("woodshed", "Woodshed", [2, 10, 5, 5], 0),
			room("tree_line", "Tree Line", [17, 14, 6, 6], 0),
		],
	},
	war_camp: {
		cols: 24,
		rows: 22,
		rooms: [
			room("approach", "Camp Approach", [10, 18, 4, 4], 0),
			room("picket", "Picket Line", [8, 14, 8, 4], 0),
			room("tent_row", "Tent Row", [3, 8, 8, 6], 0),
			room("cookfire", "Cookfire", [11, 8, 5, 5], 0, true),
			room("worg_pens", "Worg Pens", [17, 9, 6, 6], 0),
			room("command_tent", "Ghorza's Tent", [10, 2, 7, 6], 0),
			room("rear_trail", "Rear Trail", [17, 1, 5, 4], 0),
		],
	},
	swamp: {
		cols: 24,
		rows: 24,
		rooms: [
			room("river_edge", "River Edge", [10, 20, 5, 4], 0),
			room("reed_path", "Reed Path", [10, 15, 5, 5], 0),
			room("frog_pool", "Frog Pool", [3, 10, 7, 6], 0, true),
			room("will_o_wisp_glade", "Will-o'-Wisp Glade", [15, 10, 7, 6], 0, true),
			room("hag_hut", "Ulda's Hut", [9, 5, 6, 5], 0),
			room("bone_garden", "Bone Garden", [3, 3, 6, 5], 0),
			room("backwater", "Backwater", [15, 2, 7, 6], 0, true),
		],
	},
	mine: {
		cols: 25,
		rows: 24,
		rooms: [
			room("adit", "Mine Adit", [0, 3, 3, 3], 0),
			room("forecourt", "Forecourt", [3, 2, 5, 5], 0),
			room("skeleton_gallery", "Skeleton Gallery", [8, 2, 8, 4], 0),
			room("crosscut", "Crosscut", [16, 2, 4, 6], 0),
			room("ghoul_den", "Ghoul Den", [20, 4, 5, 5], -1, true),
			room("shaft", "Deep Shaft", [16, 9, 4, 5], -2),
			room("lower_hall", "Lower Hall", [12, 15, 10, 5], -3),
			room("durgan_crypt", "Durgan's Crypt", [6, 14, 6, 7], -3),
			room("key_vault", "Key Vault", [2, 16, 4, 4], -3),
		],
	},
	shrine: {
		cols: 25,
		rows: 22,
		rooms: [
			room("oak_hollow", "Old Oak Hollow", [0, 14, 5, 6], 0, true),
			room("approach_path", "Shrine Approach", [5, 15, 4, 4], 0),
			room("narthex", "Narthex", [9, 14, 4, 6], 0),
			room("nave", "Nave", [13, 8, 6, 12], 0),
			room("dawn_chapel", "Dawn Chapel", [19, 8, 5, 5], 0, true),
			room("dusk_chapel", "Dusk Chapel", [8, 8, 5, 5], 0, true),
			room("altar", "High Altar", [13, 3, 6, 5], 0),
			room("shadow_crypt", "Shadow Crypt", [19, 15, 5, 5], -3),
		],
	},
	bramble_crypt: {
		cols: 24,
		rows: 18,
		rooms: [
			room("entrance", "Crypt Entrance", [0, 7, 3, 4], 0),
			room("vestibule", "Vestibule", [3, 6, 5, 6], 0),
			room("bone_hall", "Bone Hall", [8, 4, 8, 10], 0),
			room("side_chapel", "Side Chapel", [9, 0, 6, 4], 0),
			room("ossuary", "Ossuary", [16, 6, 5, 6], 0),
			room("false_tomb", "False Tomb", [16, 12, 6, 5], 0),
			room("true_crypt", "True Crypt", [21, 5, 3, 7], -1),
		],
	},
	deep_tomb: {
		cols: 25,
		rows: 20,
		rooms: [
			room("stair_from_tomb", "Stair from Tomb", [0, 8, 3, 4], 0),
			room("warden_gate", "Warden Gate", [3, 7, 4, 6], 0),
			room("zombie_hall", "Zombie Hall", [7, 5, 8, 10], 0),
			room("ogre_alcove", "Ogre Alcove", [8, 0, 6, 5], 0),
			room("processional", "Processional", [15, 8, 5, 4], 0),
			room("steward_court", "Pale Steward's Court", [20, 5, 5, 10], 0),
			room("wight_niche_a", "Wight Niche A", [20, 1, 4, 4], 0),
			room("wight_niche_b", "Wight Niche B", [20, 15, 4, 4], 0),
		],
	},
} as const satisfies Record<string, Plan>;

export type PlanKey = keyof typeof PLANS;

/** Backdrop metrics of one plan: the image is the plan at a fixed scale. */
export function planMetrics(key: PlanKey): MapMetrics {
	const plan: Plan = PLANS[key];
	return {
		grid_size_px: PLAN_CELL_PX,
		grid_distance_m: GRID_DISTANCE_M,
		image_width_px: plan.cols * PLAN_CELL_PX,
		image_height_px: plan.rows * PLAN_CELL_PX,
		local_width_cells: plan.cols,
		local_height_cells: plan.rows,
		image_origin_x: 0,
		image_origin_y: 0,
		vertical_half_extent_m: plan.vertical_half_extent_m ?? STOREY_HALF_EXTENT_M,
	};
}

/** The plan's rooms as pins: centre position and half-extent in cells. */
export function planPins(key: PlanKey): Pin[] {
	const plan: Plan = PLANS[key];
	return plan.rooms.map((r) => {
		const [x, y, w, h] = r.rect;
		return {
			local: r.local,
			name: r.name,
			x: x + w / 2,
			y: y + h / 2,
			...(r.elevation !== undefined ? { elevation: r.elevation } : {}),
			footprint: {
				shape: r.round ? "sphere" : "cube",
				half_width_cells: w / 2,
				half_height_cells: h / 2,
			},
		};
	});
}
