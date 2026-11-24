/**
 * // pattern: none — map coordinates and pin alignment for river crossing
 *
 * River crossing (Elven Tower 34) — top-down outdoor. Bridge planks ≈ 5 ft.
 * Downscale 2000×1545; grid judged from bridge deck (~67 px/cell).
 */
import { type Pin, sheetMetrics } from "./map-metrics.ts";

export const RIVER_CROSSING_MAP = sheetMetrics({
	file: "34 River crossing.jpg",
	image_width_px: 2000,
	image_height_px: 1545,
	grid_size_px: 67,
});

export const RIVER_CROSSING_PINS = [
	{
		local: "south_approach",
		name: "South Approach",
		x: 15,
		y: 20,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2.5 },
	},
	{
		local: "bridge_south",
		name: "Bridge South End",
		x: 15,
		y: 13.5,
		footprint: { shape: "cube", half_width_cells: 1.2, half_height_cells: 1.2 },
	},
	{
		local: "bridge_mid",
		name: "Bridge Midspan",
		x: 15,
		y: 10.5,
		footprint: { shape: "cube", half_width_cells: 1.2, half_height_cells: 1.5 },
	},
	{
		local: "bridge_north",
		name: "Bridge North End",
		x: 15,
		y: 7.5,
		footprint: { shape: "cube", half_width_cells: 1.2, half_height_cells: 1.2 },
	},
	{
		local: "north_road",
		name: "North Road to Mill",
		x: 15,
		y: 3.5,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "east_bank",
		name: "East Bank Path",
		x: 22,
		y: 11,
		footprint: { shape: "sphere", half_width_cells: 2, half_height_cells: 1.5 },
	},
	{
		local: "west_bank",
		name: "West Bank Path",
		x: 8,
		y: 11,
		footprint: { shape: "sphere", half_width_cells: 2, half_height_cells: 1.5 },
	},
] as const satisfies readonly Pin[];
