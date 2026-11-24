/**
 * // pattern: none — map coordinates and pin alignment for forest lodge
 *
 * Forest lodge (Elven Tower 37) — outdoor scene with indoor rooms on sheet.
 */
import { type Pin, sheetMetrics } from "./map-metrics.ts";

export const FOREST_LODGE_MAP = sheetMetrics({
	file: "37 Forest lodgeC.jpg",
	image_width_px: 1992,
	image_height_px: 2000,
	grid_size_px: 50,
});

export const FOREST_LODGE_PINS = [
	{
		local: "forest_path",
		name: "Forest Path",
		x: 10,
		y: 30,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2.5 },
	},
	{
		local: "clearing",
		name: "Lodge Clearing",
		x: 18,
		y: 22,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 3.5, half_height_cells: 3 },
	},
	{
		local: "porch",
		name: "Lodge Porch",
		x: 20,
		y: 16,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 1.5 },
	},
	{
		local: "main_room",
		name: "Main Room",
		x: 20,
		y: 12,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 3, half_height_cells: 2.5 },
	},
	{
		local: "hearth",
		name: "Hearth",
		x: 16,
		y: 12,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
	{
		local: "loft",
		name: "Sleeping Loft",
		x: 22,
		y: 10,
		elevation: 3,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 1.5 },
	},
	{
		local: "woodshed",
		name: "Woodshed",
		x: 26,
		y: 18,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
	{
		local: "tree_line",
		name: "Tree Line",
		x: 28,
		y: 26,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2 },
	},
] as const satisfies readonly Pin[];
