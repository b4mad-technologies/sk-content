/**
 * // pattern: none — map coordinates and pin alignment for village
 *
 * Village (Elven Tower 15) — schematic outdoor sheet (no battle grid on art).
 * Synthetic cell space: 50 px/cell on the 2000×1500 downscale.
 */
import { type Pin, sheetMetrics } from "./map-metrics.ts";

export const VILLAGE_MAP = sheetMetrics({
	file: "15 Elven Village.jpg",
	image_width_px: 2000,
	image_height_px: 1500,
	grid_size_px: 50,
});

export const VILLAGE_PINS = [
	{
		local: "path_from_hamlet",
		name: "Path from Hamlet",
		x: 20,
		y: 26,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 1.5 },
	},
	{
		local: "central_circle",
		name: "Central Circle",
		x: 20,
		y: 12,
		footprint: { shape: "sphere", half_width_cells: 3.5, half_height_cells: 3.5 },
	},
	{
		local: "west_platform",
		name: "West Platform",
		x: 5,
		y: 12,
		footprint: { shape: "sphere", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "north_platform",
		name: "North Platforms",
		x: 12,
		y: 4,
		footprint: { shape: "sphere", half_width_cells: 2.5, half_height_cells: 2 },
	},
	{
		local: "east_platform",
		name: "East Platform",
		x: 34,
		y: 12,
		footprint: { shape: "sphere", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "tree_dwellings",
		name: "Tree Dwellings",
		x: 28,
		y: 22,
		footprint: { shape: "sphere", half_width_cells: 4, half_height_cells: 3.5 },
	},
	{
		local: "green",
		name: "Moonpetal Green",
		x: 22,
		y: 18,
		footprint: { shape: "sphere", half_width_cells: 2, half_height_cells: 2 },
	},
] as const satisfies readonly Pin[];
