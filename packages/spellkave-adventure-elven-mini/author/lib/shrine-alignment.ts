/**
 * // pattern: none — map coordinates and pin alignment for shrine
 *
 * Shrine (235) with Forest's heart (24) approach — indoor shrine + outdoor approach nodes.
 * Product backdrop is the shrine sheet; approach nodes sit on the lower image band.
 */
import { type Pin, sheetMetrics } from "./map-metrics.ts";

export const SHRINE_MAP = sheetMetrics({
	image_width_px: 2000,
	image_height_px: 1682,
	grid_size_px: 50,
});

export const SHRINE_PINS = [
	{
		local: "forest_heart",
		name: "Forest's Heart",
		x: 10,
		y: 28,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 3, half_height_cells: 3 },
	},
	{
		local: "approach_path",
		name: "Shrine Approach",
		x: 16,
		y: 24,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "narthex",
		name: "Narthex",
		x: 20,
		y: 18,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2 },
	},
	{
		local: "nave",
		name: "Nave",
		x: 20,
		y: 12,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 3.5, half_height_cells: 3 },
	},
	{
		local: "sun_apse",
		name: "Sun Apse",
		x: 14,
		y: 8,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "moon_apse",
		name: "Moon Apse",
		x: 26,
		y: 8,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "altar",
		name: "High Altar",
		x: 20,
		y: 6,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 1.5 },
	},
	{
		local: "shadow_crypt",
		name: "Shadow Crypt",
		x: 20,
		y: 14,
		elevation: -3,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2 },
	},
] as const satisfies readonly Pin[];
