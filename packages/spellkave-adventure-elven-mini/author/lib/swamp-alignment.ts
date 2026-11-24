/**
 * // pattern: none — map coordinates and pin alignment for swamp
 *
 * Swamp (Elven Tower 257) — outdoor hag territory.
 */
import { type Pin, sheetMetrics } from "./map-metrics.ts";

export const SWAMP_MAP = sheetMetrics({
	file: "257 The Swamp and the Hag-PC.jpg",
	image_width_px: 1545,
	image_height_px: 2000,
	grid_size_px: 50,
});

export const SWAMP_PINS = [
	{
		local: "river_edge",
		name: "River Edge",
		x: 15,
		y: 34,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2 },
	},
	{
		local: "reed_path",
		name: "Reed Path",
		x: 15,
		y: 26,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2.5 },
	},
	{
		local: "frog_pool",
		name: "Frog Pool",
		x: 10,
		y: 20,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 2.5, half_height_cells: 2.5 },
	},
	{
		local: "will_o_wisp_glade",
		name: "Will-o'-Wisp Glade",
		x: 20,
		y: 18,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "hag_hut",
		name: "Mother Ulda's Hut",
		x: 15,
		y: 12,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2.5 },
	},
	{
		local: "bone_garden",
		name: "Bone Garden",
		x: 20,
		y: 8,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 1.5 },
	},
	{
		local: "backwater",
		name: "Backwater",
		x: 8,
		y: 10,
		elevation: 0,
		footprint: { shape: "sphere", half_width_cells: 2, half_height_cells: 2 },
	},
] as const satisfies readonly Pin[];
