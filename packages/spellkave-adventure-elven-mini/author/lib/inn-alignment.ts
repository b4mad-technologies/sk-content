/**
 * // pattern: none — map coordinates and pin alignment for inn
 *
 * Inn (Elven Tower 267) — isometric multi-floor **sheet** (not a single plan).
 * Pins live in image cell space on the full page; elevations tag which diamond.
 * Product views: sheetAlign + metric (show all floors on one sheet).
 */
export const INN_MAP = {
	file: "267 Mountain View Inn-notitle.jpg",
	asset_module: "ccc3-maps",
	asset_path: "maps/267 Mountain View Inn-notitle.jpg",
	/** Nominal cell size for sheet space (isometric; not a true battle grid). */
	grid_size_px: 50,
	grid_distance_m: 1.5240000486373901, // 5 ft, converted x0.3048
	image_width_px: 2000,
	image_height_px: 2275,
	local_width_cells: 40,
	local_height_cells: 46,
	image_origin_x: 0,
	image_origin_y: 0,
	/** Keep adjacent z=-3/0/3 storeys disjoint, with a small floor/ceiling gap. */
	vertical_half_extent_m: 1.4,
	/** Top diamond = loft, mid = upper rooms, bottom = ground. */
	sheet_note: "isometric multi-floor page",
} as const;

export const INN_PINS = [
	// Bottom diamond — ground floor
	{
		local: "foyer",
		name: "Foyer",
		x: 11,
		y: 36,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 2.2, half_height_cells: 2.4 },
	},
	{
		local: "common_room",
		name: "Common Room",
		x: 14,
		y: 33,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 3.2, half_height_cells: 2.4 },
	},
	{
		local: "bar",
		name: "Bar",
		x: 17,
		y: 34,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 2.0, half_height_cells: 1.4 },
	},
	{
		local: "stairs",
		name: "Stairs",
		x: 16,
		y: 30,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 1.5, half_height_cells: 1.8 },
	},
	// Top diamond — loft
	{
		local: "loft",
		name: "Guest Loft",
		x: 14,
		y: 8,
		elevation: 3,
		footprint: { shape: "sphere", half_width_cells: 7.0, half_height_cells: 4.5 },
	},
	// Mid diamond — treat as cellar landing stand-in on sheet (no separate cellar art)
	{
		local: "cellar",
		name: "Cellar",
		x: 26,
		y: 20,
		elevation: -3,
		footprint: { shape: "sphere", half_width_cells: 7.0, half_height_cells: 5.0 },
	},
] as const;
