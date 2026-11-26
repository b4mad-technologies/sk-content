/**
 * // pattern: none — backdrop image layers for the place graphs
 *
 * One backdrop per story graph (attach_map_layer). Each image is generated
 * to fit the graph's own plan in `lib/layouts.ts`, so the layer metrics are
 * the plan's metrics: one plan cell is `PLAN_CELL_PX` pixels.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { BUNDLE, GRAPHS } from "./lib/ids.ts";
import { PLANS, type PlanKey, planMetrics } from "./lib/layouts.ts";

/** Asset directory under `assets/` that holds the backdrop images. */
export const MAP_ASSET_MODULE = "kavemouth-maps";
export const MAP_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

const TITLES: Record<PlanKey, string> = {
	region: "Waymeet and the four roads",
	hamlet: "The hamlet",
	inn: "The Lamp and Ladle",
	tomb: "The barrow tomb",
	village: "The bough village",
	stonebridge: "Stonebridge",
	mill: "The mill and its tunnels",
	well: "The well caves",
	goblin_warren: "Grubnash's warren",
	hesper_lodge: "Hesper's lodge",
	war_camp: "Ghorza's war camp",
	swamp: "The reed swamp",
	mine: "The Ironfold mine",
	shrine: "Shrine of the Twin Lamps",
	bramble_crypt: "The bramble crypt",
	deep_tomb: "The deep tomb",
};

export const MAP_KEYS = Object.keys(PLANS) as PlanKey[];

export function backdrops(): VerbCall[] {
	return MAP_KEYS.map((key) => {
		const m = planMetrics(key);
		return {
			toolName: "spellkave_attach_map_layer",
			label: `attach-map-${key}`,
			params: {
				bundle: BUNDLE,
				place_graph_id: GRAPHS[key],
				asset_module: MAP_ASSET_MODULE,
				asset_path: `maps/${key}.png`,
				display_name: TITLES[key],
				map_id: key,
				map_layer_id: `${GRAPHS[key]}/backdrop`,
				posture: "cc-by-4.0",
				source_kind: "spellkave-first-party",
				// false: core already registers provenance.source; re-registering
				// it from this bundle fails live apply (MF-APPLY-020).
				provenance: false,
				license_url: MAP_LICENSE_URL,
				grid_size_px: m.grid_size_px,
				grid_distance_m: m.grid_distance_m,
				image_width_px: m.image_width_px,
				image_height_px: m.image_height_px,
				local_width_cells: m.local_width_cells,
				local_height_cells: m.local_height_cells,
				image_origin_x: m.image_origin_x,
				image_origin_y: m.image_origin_y,
				state: "aligned",
			},
		};
	});
}
