/**
 * // pattern: none — map coordinates and pin alignment for deep tomb
 *
 * Deep tomb (Elven Tower 60) — indoor level below Infested Tomb 251.
 */
import { type Pin, sheetMetrics } from "./map-metrics.ts";

export const DEEP_TOMB_MAP = sheetMetrics({
	image_width_px: 1501,
	image_height_px: 2000,
	grid_size_px: 50,
});

export const DEEP_TOMB_PINS = [
	{
		local: "stair_from_tomb",
		name: "Stair from Tomb",
		x: 15,
		y: 4,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
	{
		local: "warden_gate",
		name: "Warden Gate",
		x: 15,
		y: 10,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "zombie_hall",
		name: "Zombie Hall",
		x: 15,
		y: 16,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 3.5, half_height_cells: 3 },
	},
	{
		local: "ogre_alcove",
		name: "Ogre Alcove",
		x: 22,
		y: 16,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "processional",
		name: "Processional",
		x: 15,
		y: 24,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2.5 },
	},
	{
		local: "steward_court",
		name: "Pale Steward's Court",
		x: 15,
		y: 30,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 3.5, half_height_cells: 3 },
	},
	{
		local: "wight_niche_a",
		name: "Wight Niche A",
		x: 8,
		y: 28,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
	{
		local: "wight_niche_b",
		name: "Wight Niche B",
		x: 22,
		y: 28,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
] as const satisfies readonly Pin[];
