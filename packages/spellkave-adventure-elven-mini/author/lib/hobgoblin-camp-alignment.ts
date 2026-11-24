/**
 * // pattern: none — map coordinates and pin alignment for hobgoblin camp
 *
 * Hobgoblin camp (Elven Tower 17) — outdoor encampment.
 */
import { type Pin, sheetMetrics } from "./map-metrics.ts";

export const HOBGOBLIN_CAMP_MAP = sheetMetrics({
	file: "17-Hobgoblin-camp-L.jpg",
	image_width_px: 1503,
	image_height_px: 2000,
	grid_size_px: 50,
});

export const HOBGOBLIN_CAMP_PINS = [
	{
		local: "approach",
		name: "Camp Approach",
		x: 15,
		y: 34,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "picket",
		name: "Picket Line",
		x: 15,
		y: 28,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 3, half_height_cells: 1.5 },
	},
	{
		local: "tent_row",
		name: "Tent Row",
		x: 12,
		y: 20,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 3, half_height_cells: 2.5 },
	},
	{
		local: "cookfire",
		name: "Cookfire",
		x: 15,
		y: 16,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
	{
		local: "worg_pens",
		name: "Worg Pens",
		x: 22,
		y: 18,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "command_tent",
		name: "Ghorza's Tent",
		x: 15,
		y: 10,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2 },
	},
	{
		local: "rear_trail",
		name: "Rear Trail",
		x: 15,
		y: 4,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 1.5 },
	},
] as const satisfies readonly Pin[];
