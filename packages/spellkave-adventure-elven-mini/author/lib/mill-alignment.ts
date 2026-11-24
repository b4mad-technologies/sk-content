/**
 * // pattern: none — map coordinates and pin alignment for mill
 *
 * Mill / Windmill Cult (Elven Tower 131) — cutaway indoor+outdoor sheet.
 * Schematic coordinates over the DM sheet (legend rooms 1–15).
 */
import { type Pin, sheetMetrics } from "./map-metrics.ts";

export const MILL_MAP = sheetMetrics({
	file: "131 The Windmill Cult-DM.jpg",
	image_width_px: 2000,
	image_height_px: 1941,
	grid_size_px: 50,
});

export const MILL_PINS = [
	{
		local: "yard",
		name: "Mill Yard",
		x: 8,
		y: 8,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2 },
	},
	{
		local: "windmill_lv1",
		name: "Windmill Level 1",
		x: 6,
		y: 6,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "windmill_lv2",
		name: "Windmill Level 2",
		x: 6,
		y: 3,
		elevation: 3,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
	{
		local: "inn_building",
		name: "Cult Inn",
		x: 26,
		y: 6,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 3, half_height_cells: 2 },
	},
	{
		local: "sentry_post",
		name: "Sentry Post",
		x: 10,
		y: 12,
		elevation: -1,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.2 },
	},
	{
		local: "tunnels",
		name: "Cult Tunnels",
		x: 16,
		y: 14,
		elevation: -2,
		footprint: { shape: "cube", half_width_cells: 3, half_height_cells: 2 },
	},
	{
		local: "intersection",
		name: "Intersection Sentries",
		x: 18,
		y: 18,
		elevation: -2,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "sacrifice_room",
		name: "Sacrifice Room",
		x: 8,
		y: 22,
		elevation: -3,
		footprint: { shape: "cube", half_width_cells: 3, half_height_cells: 2.5 },
	},
	{
		local: "storage",
		name: "Storage Room",
		x: 24,
		y: 14,
		elevation: -2,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 1.5 },
	},
	{
		local: "altar",
		name: "Old One Altar",
		x: 30,
		y: 14,
		elevation: -2,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2 },
	},
	{
		local: "gallery",
		name: "Grand Gallery",
		x: 24,
		y: 22,
		elevation: -3,
		footprint: { shape: "cube", half_width_cells: 3, half_height_cells: 2.5 },
	},
	{
		local: "secret_storage",
		name: "Secret Storage",
		x: 32,
		y: 24,
		elevation: -3,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
] as const satisfies readonly Pin[];
