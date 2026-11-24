/**
 * // pattern: none — map coordinates and pin alignment for cursed crypt
 *
 * Cursed crypt (Elven Tower 46) — indoor.
 */
import { type Pin, sheetMetrics } from "./map-metrics.ts";

export const CURSED_CRYPT_MAP = sheetMetrics({
	file: "46 Cursed CryptC.jpg",
	image_width_px: 2000,
	image_height_px: 1714,
	grid_size_px: 50,
});

export const CURSED_CRYPT_PINS = [
	{
		local: "entrance",
		name: "Crypt Entrance",
		x: 8,
		y: 16,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "vestibule",
		name: "Vestibule",
		x: 14,
		y: 16,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "bone_hall",
		name: "Bone Hall",
		x: 22,
		y: 14,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 3.5, half_height_cells: 3 },
	},
	{
		local: "side_chapel",
		name: "Side Chapel",
		x: 22,
		y: 8,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 2 },
	},
	{
		local: "ossuary",
		name: "Ossuary",
		x: 28,
		y: 18,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2 },
	},
	{
		local: "false_tomb",
		name: "False Tomb",
		x: 30,
		y: 10,
		elevation: 0,
		footprint: { shape: "cube", half_width_cells: 2, half_height_cells: 1.5 },
	},
	{
		local: "true_crypt",
		name: "True Crypt",
		x: 34,
		y: 16,
		elevation: -1,
		footprint: { shape: "cube", half_width_cells: 2.5, half_height_cells: 2 },
	},
] as const satisfies readonly Pin[];
