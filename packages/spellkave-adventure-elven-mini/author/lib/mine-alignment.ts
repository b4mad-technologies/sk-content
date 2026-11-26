/**
 * // pattern: none — map coordinates and pin alignment for mine
 *
 * Mine (Elven Tower 36 upper + 219 deep) — indoor multi-z.
 * Primary backdrop 36; deep rooms elevation -3.
 */
import { type Pin, sheetMetrics } from "./map-metrics.ts";

export const MINE_MAP = sheetMetrics({
	image_width_px: 2000,
	image_height_px: 1482,
	grid_size_px: 50,
});

export const MINE_PINS = [
	{
		local: "adit",
		name: "Mine Adit",
		x: 6,
		y: 14,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "forecourt",
		name: "Forecourt",
		x: 12,
		y: 14,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2 },
	},
	{
		local: "skeleton_gallery",
		name: "Skeleton Gallery",
		x: 18,
		y: 10,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 3, half_height_cells: 2.5 },
	},
	{
		local: "crosscut",
		name: "Crosscut",
		x: 22,
		y: 16,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "ghoul_den",
		name: "Ghoul Den",
		x: 28,
		y: 12,
		elevation: -1,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2 },
	},
	{
		local: "shaft",
		name: "Deep Shaft",
		x: 24,
		y: 20,
		elevation: -2,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
	{
		local: "lower_hall",
		name: "Lower Hall",
		x: 20,
		y: 24,
		elevation: -3,
		footprint: { shape: "cube", half_width_cells: 3, half_height_cells: 2.5 },
	},
	{
		local: "durgan_crypt",
		name: "Durgan's Crypt",
		x: 28,
		y: 26,
		elevation: -3,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2.5 },
	},
	{
		local: "key_vault",
		name: "Key Vault",
		x: 32,
		y: 22,
		elevation: -3,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
] as const satisfies readonly Pin[];
