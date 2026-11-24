/**
 * // pattern: none — map coordinates and pin alignment for goblin warren
 *
 * Goblin warren (319 Lair + 27 Chief hideout joined) — indoor.
 * Primary backdrop 319; chief chambers offset east on the same cell plane.
 */
import { type Pin, sheetMetrics } from "./map-metrics.ts";

export const GOBLIN_WARREN_MAP = sheetMetrics({
	file: "319 Goblin Lair-PC.jpg",
	image_width_px: 2000,
	image_height_px: 2000,
	grid_size_px: 50,
});

export const GOBLIN_WARREN_PINS = [
	{
		local: "entrance",
		name: "Warren Mouth",
		x: 10,
		y: 32,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "guard_post",
		name: "Guard Post",
		x: 14,
		y: 26,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "common_den",
		name: "Common Den",
		x: 18,
		y: 20,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 3.5, half_height_cells: 3 },
	},
	{
		local: "trap_niche_a",
		name: "Trap Niche A",
		x: 12,
		y: 18,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 1.2, half_height_cells: 1.2 },
	},
	{
		local: "trap_niche_b",
		name: "Trap Niche B",
		x: 24,
		y: 18,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 1.2, half_height_cells: 1.2 },
	},
	{
		local: "tunnel_join",
		name: "Tunnel to Chief",
		x: 28,
		y: 16,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
	{
		local: "chief_anteroom",
		name: "Chief Anteroom",
		x: 32,
		y: 14,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "chief_hall",
		name: "Grubnash's Hall",
		x: 36,
		y: 10,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 3, half_height_cells: 2.5 },
	},
	{
		local: "loot_cache",
		name: "Loot Cache",
		x: 38,
		y: 16,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 1.5, half_height_cells: 1.5 },
	},
] as const satisfies readonly Pin[];
