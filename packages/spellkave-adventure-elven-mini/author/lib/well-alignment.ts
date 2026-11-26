/**
 * // pattern: none — map coordinates and pin alignment for well
 *
 * Well (Elven Tower 211 surface + 197 depth) — indoor two-z.
 * Primary product backdrop is 211; depth rooms sit at elevation -3.
 */
import { type Pin, sheetMetrics } from "./map-metrics.ts";

export const WELL_MAP = sheetMetrics({
	image_width_px: 2000,
	image_height_px: 1428,
	grid_size_px: 50,
});

export const WELL_DEPTH_MAP = sheetMetrics({
	image_width_px: 2000,
	image_height_px: 2000,
	grid_size_px: 50,
});

export const WELL_PINS = [
	{
		local: "mouth",
		name: "Well Mouth",
		x: 20,
		y: 8,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "upper_shaft",
		name: "Upper Shaft",
		x: 20,
		y: 14,
		elevation: -1,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 2 },
	},
	{
		local: "landing",
		name: "Mid Landing",
		x: 18,
		y: 18,
		elevation: -2,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "side_niche",
		name: "Side Niche",
		x: 12,
		y: 18,
		elevation: -2,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
	{
		local: "depth_hall",
		name: "Depth Hall",
		x: 20,
		y: 24,
		elevation: -3,
		footprint: { shape: "cube", half_width_cells: 3, half_height_cells: 2.5 },
	},
	{
		local: "wererat_nest",
		name: "Wererat Nest",
		x: 26,
		y: 26,
		elevation: -3,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2 },
	},
	{
		local: "ooze_pool",
		name: "Ooze Pool",
		x: 14,
		y: 28,
		elevation: -3,
		footprint: { shape: "sphere", half_width_cells: 2, half_height_cells: 2 },
	},
] as const satisfies readonly Pin[];
