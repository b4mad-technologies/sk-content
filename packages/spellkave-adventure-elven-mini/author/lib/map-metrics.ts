/**
 * // pattern: none — map grid distance and metric types for elven-mini alignments
 *
 * Shared 5-ft grid distance + helpers for elven-mini map-from-image alignments.
 * Cell space = image space (y-down) for every sheetAlign product view.
 */
export const GRID_DISTANCE_M = 1.5240000486373901; // 5 ft × 0.3048
export const STOREY_HALF_EXTENT_M = 1.5;

export type MapMetrics = {
	grid_size_px: number;
	grid_distance_m: number;
	image_width_px: number;
	image_height_px: number;
	local_width_cells: number;
	local_height_cells: number;
	image_origin_x: number;
	image_origin_y: number;
	vertical_half_extent_m: number;
};

/** Build metrics for a downscaled in-repo asset (integer grid_size_px). */
export function sheetMetrics(args: {
	image_width_px: number;
	image_height_px: number;
	/** Prefer measuring full-res then scale; integer u32 required. */
	grid_size_px: number;
}): MapMetrics {
	const grid = Math.max(1, Math.round(args.grid_size_px));
	return {
		grid_size_px: grid,
		grid_distance_m: GRID_DISTANCE_M,
		image_width_px: Math.round(args.image_width_px),
		image_height_px: Math.round(args.image_height_px),
		local_width_cells: args.image_width_px / grid,
		local_height_cells: args.image_height_px / grid,
		image_origin_x: 0,
		image_origin_y: 0,
		vertical_half_extent_m: STOREY_HALF_EXTENT_M,
	};
}

export type Pin = {
	local: string;
	name: string;
	x: number;
	y: number;
	elevation?: number;
	footprint: {
		shape: "cube" | "sphere";
		half_width_cells: number;
		half_height_cells: number;
	};
};
