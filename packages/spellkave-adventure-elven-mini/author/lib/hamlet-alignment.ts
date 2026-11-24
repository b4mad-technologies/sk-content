/**
 * // pattern: none — map coordinates and pin alignment for hamlet
 *
 * Hamlet (Elven Tower 306) alignment — baked from map-from-image pilot R4.
 * Cell space = image space (outdoor, y-down). Pin cells are scale-invariant;
 * metrics match the in-repo downscaled JPG under assets/ccc3-maps/.
 *
 * The reviewed pilot coordinates are baked here; the transient overlay session
 * remains available in Git history.
 */
export const HAMLET_MAP = {
	file: "306 Fortified Hamlet.jpg",
	asset_module: "ccc3-maps",
	asset_path: "maps/306 Fortified Hamlet.jpg",
	/** px per cell on the in-repo downscaled asset (2000×2138). */
	grid_size_px: 69, // u32; ≈ 2000/29 on downscaled asset
	grid_distance_m: 1.5240000486373901, // 5 ft, converted x0.3048
	image_width_px: 2000,
	image_height_px: 2138,
	local_width_cells: 29,
	local_height_cells: 31,
	image_origin_x: 0,
	image_origin_y: 0,
	/** Three-metre-high world volume centred on the authored ground elevation. */
	vertical_half_extent_m: 1.5,
	/** Judgment: mid purple dual-roof is the Inn (not the south long red roof). */
	inn_building: "mid purple dual-roof",
} as const;

/** Place nodes in image cell space (+x right, +y down). */
export const HAMLET_PINS = [
	{
		local: "gate",
		name: "Hamlet Gate",
		x: 5.9,
		y: 13.5,
		footprint: { shape: "cube", half_width_cells: 1.3, half_height_cells: 1.6 },
	},
	{
		local: "square",
		name: "Village Square",
		x: 11.2,
		y: 13.2,
		footprint: { shape: "sphere", half_width_cells: 4.2, half_height_cells: 2.6 },
	},
	{
		local: "inn_front",
		name: "Inn Front",
		x: 14.4,
		y: 15.8,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.4 },
	},
	{
		local: "well",
		name: "Well",
		x: 6.8,
		y: 11.2,
		footprint: { shape: "sphere", half_width_cells: 1.1, half_height_cells: 1.1 },
	},
	{
		local: "east_houses",
		name: "East Houses",
		x: 17.0,
		y: 7.4,
		footprint: { shape: "cube", half_width_cells: 3.2, half_height_cells: 2.7 },
	},
	{
		local: "west_sheds",
		name: "West Sheds",
		x: 5.4,
		y: 18.2,
		footprint: { shape: "cube", half_width_cells: 2.0, half_height_cells: 3.0 },
	},
	{
		local: "tomb_hill",
		name: "Tomb Hill",
		x: 24.2,
		y: 13.8,
		footprint: { shape: "sphere", half_width_cells: 3.0, half_height_cells: 2.0 },
	},
	{
		local: "village_path",
		name: "Path to Elven Village",
		x: 20.0,
		y: 5.5,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
	{
		local: "crypt_path",
		name: "Path to Cursed Crypt",
		x: 26.5,
		y: 18.0,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
] as const;
