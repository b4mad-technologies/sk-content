/**
 * // pattern: none — map coordinates and pin alignment for region
 *
 * Region (Elven Tower 259 Crossroads) — outdoor sheet, y-down image cells.
 * Full art 3500² @ 140px → 25×25; in-repo downscale 2000² @ 80px.
 */
export const REGION_MAP = {
	file: "259 Crossroads Encounter-grid.jpg",
	asset_module: "ccc3-maps",
	asset_path: "maps/259 Crossroads Encounter-grid.jpg",
	grid_size_px: 80,
	grid_distance_m: 1.5240000486373901, // 5 ft, converted x0.3048
	image_width_px: 2000,
	image_height_px: 2000,
	local_width_cells: 25,
	local_height_cells: 25,
	image_origin_x: 0,
	image_origin_y: 0,
	/** Three-metre-high world volume centred on the authored ground elevation. */
	vertical_half_extent_m: 1.5,
} as const;

/** Cross + four road approaches (signpost at center). */
export const REGION_PINS = [
	{
		local: "crossroads",
		name: "Crossroads",
		x: 12.5,
		y: 12.5,
		footprint: { shape: "sphere", half_width_cells: 2.8, half_height_cells: 2.2 },
	},
	{
		local: "road_north",
		name: "Upland Road",
		x: 12.5,
		y: 3.5,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 3.5 },
	},
	{
		local: "road_east",
		name: "East Road",
		x: 21.5,
		y: 12.5,
		footprint: { shape: "cube", half_width_cells: 3.5, half_height_cells: 1.5 },
	},
	{
		local: "road_south",
		name: "Hamlet Road",
		x: 12.5,
		y: 21.5,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 3.5 },
	},
	{
		local: "road_west",
		name: "West Road",
		x: 3.5,
		y: 12.5,
		footprint: { shape: "cube", half_width_cells: 3.5, half_height_cells: 1.5 },
	},
] as const;
