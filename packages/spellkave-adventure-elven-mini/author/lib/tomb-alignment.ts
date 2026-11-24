/**
 * // pattern: none — map coordinates and pin alignment for tomb
 *
 * Tomb (Elven Tower 251) — top-down indoor sheet, y-down image cells.
 * Full 3780×2800 @ ~70px → 54×40; in-repo 2000×1481 @ 37px.
 * Product views use sheetAlign (skip indoor Y-flip) so nodes sit on art.
 */
export const TOMB_MAP = {
	file: "251 Infested Tomb-PC.jpg",
	asset_module: "ccc3-maps",
	asset_path: "maps/251 Infested Tomb-PC.jpg",
	grid_size_px: 37,
	grid_distance_m: 1.5240000486373901, // 5 ft, converted x0.3048
	image_width_px: 2000,
	image_height_px: 1481,
	local_width_cells: 54,
	local_height_cells: 40,
	image_origin_x: 0,
	image_origin_y: 0,
	/** Three-metre-high room volume centred on the tomb floor. */
	vertical_half_extent_m: 1.5,
} as const;

export const TOMB_PINS = [
	{
		local: "entrance",
		name: "Tomb Entrance",
		x: 4,
		y: 18,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 3.0, half_height_cells: 5.0 },
	},
	{
		local: "antechamber",
		name: "Antechamber",
		x: 14,
		y: 20,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 4.0, half_height_cells: 4.0 },
	},
	{
		local: "hall",
		name: "Sarcophagus Hall",
		x: 26,
		y: 7,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 8.0, half_height_cells: 6.0 },
	},
	{
		local: "shrine",
		name: "Shrine",
		x: 46,
		y: 24,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 4.0, half_height_cells: 5.0 },
	},
	{
		// sk-0m4.21 — empty sealed side room. A permanent edge gate here
		// does not strand authored content (the shrine chest stays on the
		// open hall→shrine hop). Position: east of the hall, north of the shrine.
		local: "sealed_vault",
		name: "Sealed Vault",
		x: 38,
		y: 7,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2.0, half_height_cells: 2.0 },
	},
	{
		local: "crypt",
		name: "Lower Crypt",
		x: 28,
		y: 32,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 8.0, half_height_cells: 6.0 },
	},
	{
		local: "pool",
		name: "Slime Pool",
		x: 22,
		y: 30,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 3.0, half_height_cells: 2.2 },
	},
] as const;
